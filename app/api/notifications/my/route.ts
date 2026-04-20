import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { apiErrorResponse } from '@/lib/server/errors';

export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);

    const sp = request.nextUrl.searchParams;
    const page = parseInt(sp.get('page') ?? '1', 10);
    const limit = parseInt(sp.get('limit') ?? '20', 10);
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId: user.userId } }),
    ]);

    return NextResponse.json({ success: true, data: { notifications, total, page, limit } });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
