import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { apiErrorResponse } from '@/lib/server/errors';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = authenticateRequest(request);

    const notification = await prisma.notification.findFirst({
      where: { id: params.id, userId: user.userId },
    });
    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.notification.update({
      where: { id: params.id },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
