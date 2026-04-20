import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { apiErrorResponse } from '@/lib/server/errors';

export async function GET(request: NextRequest) {
  try {
    const jwtUser = authenticateRequest(request);

    const user = await prisma.user.findUnique({
      where: { id: jwtUser.userId },
      select: { id: true, email: true, phone: true, role: true, flat: { select: { id: true, unitNumber: true } } },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
