import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { initiatePasswordReset } from '@/lib/server/services/authService';
import { apiErrorResponse } from '@/lib/server/errors';

const resetInitSchema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  try {
    const { email } = resetInitSchema.parse(await request.json());
    const { userId, otp } = await initiatePasswordReset(email);

    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json({
      success: true,
      message: 'OTP sent to registered email/phone',
      ...(isDev ? { _dev_otp: otp, userId } : { userId }),
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
