import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword } from '@/lib/server/services/authService';
import { prisma } from '@/lib/server/prisma';
import { apiErrorResponse } from '@/lib/server/errors';

const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'HOMEOWNER']).default('HOMEOWNER'),
});

export async function POST(request: NextRequest) {
  try {
    const body = registerSchema.parse(await request.json());
    const passwordHash = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: { email: body.email, phone: body.phone, passwordHash, role: body.role },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json(
      { success: true, data: user, message: 'Registration successful' },
      { status: 201 }
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
}
