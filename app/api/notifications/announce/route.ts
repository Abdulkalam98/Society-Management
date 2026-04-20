import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { broadcastAnnouncement } from '@/lib/server/services/notificationService';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function POST(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const { message } = z.object({ message: z.string().min(5) }).parse(await request.json());
    const result = await broadcastAnnouncement(message);
    return NextResponse.json({ success: true, data: result, message: 'Announcement broadcast completed' });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
