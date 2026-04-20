import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPaymentOrder } from '@/lib/server/services/paymentService';
import { authenticateRequest } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function POST(request: NextRequest) {
  try {
    authenticateRequest(request);

    const { flatBillId } = z.object({ flatBillId: z.string().uuid() }).parse(await request.json());
    const order = await createPaymentOrder(flatBillId);
    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
