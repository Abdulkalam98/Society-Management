import { NextRequest, NextResponse } from 'next/server';
import { getPaymentStatus } from '@/lib/server/services/paymentService';
import { authenticateRequest } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    authenticateRequest(request);

    const status = await getPaymentStatus(params.orderId);
    return NextResponse.json({ success: true, data: status });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
