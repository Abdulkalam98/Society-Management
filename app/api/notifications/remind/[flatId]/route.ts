import { NextRequest, NextResponse } from 'next/server';
import { sendDueReminder } from '@/lib/server/services/notificationService';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: { flatId: string } }
) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    await sendDueReminder(params.flatId);
    return NextResponse.json({ success: true, message: 'Reminder sent to flat' });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
