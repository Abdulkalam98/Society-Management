import Razorpay from 'razorpay';
import { prisma } from '@/lib/server/prisma';
import { createError } from '@/lib/server/errors';

// ─── Run Reconciliation for a Date Range ──────────────────────────────────────

export async function reconcilePayments(fromDate: Date, toDate: Date) {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw createError('Razorpay credentials not configured', 500);
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  // Fetch captured payments from our DB in the range
  const dbPayments = await prisma.payment.findMany({
    where: {
      status: 'CAPTURED',
      updatedAt: { gte: fromDate, lte: toDate },
    },
    include: {
      flatBill: { select: { amountDue: true } },
      reconciliation: true,
    },
  });

  const results: Array<{
    paymentId: string;
    orderId: string;
    status: string;
    notes?: string;
  }> = [];

  for (const payment of dbPayments) {
    if (!payment.razorpayPaymentId) continue;

    // Already reconciled and matched — skip
    if (payment.reconciliation?.status === 'MATCHED') continue;

    let gatewayAmount: number;
    const gatewayRef = payment.razorpayPaymentId;

    try {
      const gwPayment = await razorpay.payments.fetch(payment.razorpayPaymentId);
      // Razorpay returns amount in paise
      gatewayAmount = Number(gwPayment.amount) / 100;
    } catch {
      // Gateway call failed; record as pending
      await upsertReconciliation({
        paymentId: payment.id,
        gatewayRef,
        recordedAmount: payment.amount,
        gatewayAmount: 0,
        status: 'PENDING',
        notes: 'Gateway fetch failed',
      });
      results.push({ paymentId: payment.id, orderId: payment.razorpayOrderId, status: 'PENDING', notes: 'Gateway fetch failed' });
      continue;
    }

    const tolerance = 0.01; // allow 1 paisa rounding diff
    const amountMatch = Math.abs(payment.amount - gatewayAmount) <= tolerance;

    // Detect duplicate: same razorpayPaymentId used for multiple DB payments
    const duplicateCheck = await prisma.payment.count({
      where: { razorpayPaymentId: payment.razorpayPaymentId, NOT: { id: payment.id } },
    });

    let status: 'MATCHED' | 'MISMATCH' | 'DUPLICATE' = 'MATCHED';
    let notes: string | undefined;

    if (duplicateCheck > 0) {
      status = 'DUPLICATE';
      notes = `razorpayPaymentId ${payment.razorpayPaymentId} used in ${duplicateCheck + 1} payment records`;
    } else if (!amountMatch) {
      status = 'MISMATCH';
      notes = `DB amount ₹${payment.amount} vs gateway ₹${gatewayAmount}`;
    }

    await upsertReconciliation({
      paymentId: payment.id,
      gatewayRef,
      recordedAmount: payment.amount,
      gatewayAmount,
      status,
      notes,
      resolvedAt: status === 'MATCHED' ? new Date() : undefined,
    });

    results.push({ paymentId: payment.id, orderId: payment.razorpayOrderId, status, notes });
  }

  return {
    processed: results.length,
    matched: results.filter((r) => r.status === 'MATCHED').length,
    mismatches: results.filter((r) => r.status === 'MISMATCH').length,
    duplicates: results.filter((r) => r.status === 'DUPLICATE').length,
    pending: results.filter((r) => r.status === 'PENDING').length,
    details: results,
  };
}

async function upsertReconciliation(params: {
  paymentId: string;
  gatewayRef: string;
  recordedAmount: number;
  gatewayAmount: number;
  status: 'MATCHED' | 'MISMATCH' | 'DUPLICATE' | 'PENDING';
  notes?: string;
  resolvedAt?: Date;
}) {
  return prisma.reconciliationEntry.upsert({
    where: { paymentId: params.paymentId },
    create: {
      paymentId: params.paymentId,
      gatewayRef: params.gatewayRef,
      recordedAmount: params.recordedAmount,
      gatewayAmount: params.gatewayAmount,
      status: params.status,
      notes: params.notes,
      resolvedAt: params.resolvedAt,
    },
    update: {
      gatewayAmount: params.gatewayAmount,
      status: params.status,
      notes: params.notes,
      resolvedAt: params.resolvedAt,
    },
  });
}

// ─── Get Reconciliation Status ────────────────────────────────────────────────

export async function getReconciliationStatus(filters: {
  status?: 'MATCHED' | 'MISMATCH' | 'DUPLICATE' | 'PENDING';
}) {
  return prisma.reconciliationEntry.findMany({
    where: filters.status ? { status: filters.status } : {},
    include: {
      payment: {
        select: {
          razorpayOrderId: true,
          razorpayPaymentId: true,
          amount: true,
          status: true,
          flatBill: {
            select: {
              flat: { select: { unitNumber: true } },
              expense: { select: { title: true, month: true, year: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Resolve a Mismatch Manually ─────────────────────────────────────────────

export async function resolveReconciliationEntry(entryId: string, notes: string) {
  const entry = await prisma.reconciliationEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw createError('Reconciliation entry not found', 404);

  return prisma.reconciliationEntry.update({
    where: { id: entryId },
    data: { status: 'MATCHED', notes, resolvedAt: new Date() },
  });
}

// ─── Audit Trail ──────────────────────────────────────────────────────────────

export async function getAuditLog(entityType?: string, entityId?: string) {
  return prisma.auditLog.findMany({
    where: {
      ...(entityType ? { entity: entityType } : {}),
      ...(entityId ? { entityId } : {}),
    },
    include: { user: { select: { email: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

export async function writeAuditLog(params: {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  meta?: Record<string, unknown>;
}) {
  const { meta, ...rest } = params;
  return prisma.auditLog.create({ data: { ...rest, meta: meta as any } });
}
