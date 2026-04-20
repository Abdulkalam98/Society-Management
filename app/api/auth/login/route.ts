import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loginUser } from '@/lib/server/services/authService';
import { apiErrorResponse } from '@/lib/server/errors';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const { email, password } = loginSchema.parse(await request.json());
    const result = await loginUser(email, password);

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
