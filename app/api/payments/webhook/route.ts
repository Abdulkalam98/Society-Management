import { NextRequest, NextResponse } from 'next/server';
import { handleWebhook } from '@/lib/server/services/paymentService';
import { apiErrorResponse } from '@/lib/server/errors';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-razorpay-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 });
    }

    // Read raw body for HMAC verification
    const rawBody = Buffer.from(await request.arrayBuffer());
    await handleWebhook(rawBody, signature);

    return NextResponse.json({ received: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
