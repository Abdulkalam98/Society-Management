import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAndCapturePayment } from '@/lib/server/services/paymentService';
import { authenticateRequest } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function POST(request: NextRequest) {
  try {
    authenticateRequest(request);

    const body = z.object({
      razorpayOrderId: z.string(),
      razorpayPaymentId: z.string(),
      razorpaySignature: z.string(),
    }).parse(await request.json());

    const result = await verifyAndCapturePayment(body);
    return NextResponse.json({ success: true, data: result, message: 'Payment verified and captured' });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
