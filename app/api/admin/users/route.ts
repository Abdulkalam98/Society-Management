import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const role = request.nextUrl.searchParams.get('role') ?? undefined;
    const unassigned = request.nextUrl.searchParams.get('unassigned') === 'true';

    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role: role as 'ADMIN' | 'HOMEOWNER' } : {}),
        ...(unassigned ? { flat: null } : {}),
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        flat: { select: { id: true, unitNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
