import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '@/lib/server/prisma';
import { createError } from '@/lib/server/errors';
import { applyPaymentToBill } from '@/lib/server/services/expenseService';

function getRazorpayInstance(): Razorpay {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw createError('Razorpay credentials not configured', 500);
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// ─── Create Razorpay Order ────────────────────────────────────────────────────

export async function createPaymentOrder(flatBillId: string) {
  const bill = await prisma.flatBill.findUnique({
    where: { id: flatBillId },
    include: { flat: { select: { unitNumber: true, ownerId: true } } },
  });
  if (!bill) throw createError('FlatBill not found', 404);
  if (bill.status === 'PAID') throw createError('Bill is already paid', 409);

  const amountRemaining = bill.amountDue - bill.amountPaid;
  if (amountRemaining <= 0) throw createError('No outstanding amount on this bill', 400);

  // Check for an existing uncaptured order to prevent duplicates
  const existingOrder = await prisma.payment.findFirst({
    where: { flatBillId, status: 'CREATED' },
    orderBy: { createdAt: 'desc' },
  });
  if (existingOrder) return existingOrder;

  const razorpay = getRazorpayInstance();
  const order = await razorpay.orders.create({
    amount: Math.round(amountRemaining * 100), // paise
    currency: 'INR',
    receipt: `bill_${flatBillId.slice(0, 8)}`,
    notes: {
      flatBillId,
      unitNumber: bill.flat.unitNumber,
    },
  });

  return prisma.payment.create({
    data: {
      flatBillId,
      razorpayOrderId: order.id,
      amount: amountRemaining,
      status: 'CREATED',
    },
  });
}

// ─── Verify Signature & Capture ───────────────────────────────────────────────

export async function verifyAndCapturePayment(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<{ payment: unknown; receiptUrl: string }> {
  const secret = process.env.RAZORPAY_KEY_SECRET as string;
  const body = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
  const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('hex');

  if (expectedSig !== params.razorpaySignature) {
    throw createError('Invalid payment signature', 400);
  }

  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: params.razorpayOrderId },
  });
  if (!payment) throw createError('Payment record not found', 404);
  if (payment.status === 'CAPTURED') throw createError('Payment already captured', 409);

  const receiptUrl = `/api/payments/${payment.id}/receipt`;

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      razorpayPaymentId: params.razorpayPaymentId,
      razorpaySignature: params.razorpaySignature,
      status: 'CAPTURED',
      receiptUrl,
    },
  });

  await applyPaymentToBill(payment.flatBillId, payment.amount);

  return { payment: updated, receiptUrl };
}

// ─── Razorpay Webhook Handler ─────────────────────────────────────────────────

export async function handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET as string;
  const expectedSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  if (expectedSig !== signature) {
    throw createError('Invalid webhook signature', 400);
  }

  const event = JSON.parse(rawBody.toString()) as {
    event: string;
    payload: {
      payment: {
        entity: {
          id: string;
          order_id: string;
          amount: number;
          status: string;
          error_description?: string;
        };
      };
    };
  };

  const entity = event.payload.payment.entity;

  if (event.event === 'payment.captured') {
    const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: entity.order_id } });
    if (payment && payment.status !== 'CAPTURED') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { razorpayPaymentId: entity.id, status: 'CAPTURED' },
      });
      await applyPaymentToBill(payment.flatBillId, payment.amount);
    }
  }

  if (event.event === 'payment.failed') {
    await prisma.payment.updateMany({
      where: { razorpayOrderId: entity.order_id },
      data: { status: 'FAILED', failureReason: entity.error_description ?? 'Unknown failure' },
    });
  }
}

// ─── Receipt ──────────────────────────────────────────────────────────────────

export async function getPaymentReceipt(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      flatBill: {
        include: {
          flat: { select: { unitNumber: true, block: true, occupantName: true } },
          expense: { include: { category: true } },
        },
      },
    },
  });
  if (!payment) throw createError('Payment not found', 404);
  if (payment.status !== 'CAPTURED') throw createError('Payment not yet captured', 400);
  return payment;
}

// ─── Payment Status ───────────────────────────────────────────────────────────

export async function getPaymentStatus(orderId: string) {
  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: orderId },
    include: { flatBill: { select: { status: true, amountDue: true, amountPaid: true } } },
  });
  if (!payment) throw createError('Payment order not found', 404);
  return payment;
}
