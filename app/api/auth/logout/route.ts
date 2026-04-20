import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logoutUser } from '@/lib/server/services/authService';
import { authenticateRequest } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function POST(request: NextRequest) {
  try {
    authenticateRequest(request);
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(await request.json());
    await logoutUser(refreshToken);

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
