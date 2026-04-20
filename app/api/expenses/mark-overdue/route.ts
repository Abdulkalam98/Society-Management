import { NextRequest, NextResponse } from 'next/server';
import { markOverdueBills } from '@/lib/server/services/expenseService';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function POST(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const count = await markOverdueBills();
    return NextResponse.json({ success: true, message: `${count} bills marked as overdue` });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
