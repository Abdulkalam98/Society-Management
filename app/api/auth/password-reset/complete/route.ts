import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { completePasswordReset } from '@/lib/server/services/authService';
import { apiErrorResponse } from '@/lib/server/errors';

const resetCompleteSchema = z.object({
  userId: z.string().uuid(),
  otp: z.string().length(6),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = resetCompleteSchema.parse(await request.json());
    await completePasswordReset(body.userId, body.otp, body.newPassword);

    return NextResponse.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
