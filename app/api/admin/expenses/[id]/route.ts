import { NextRequest, NextResponse } from 'next/server';
import { getExpenseById } from '@/lib/server/services/adminService';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const expense = await getExpenseById(params.id);
    return NextResponse.json({ success: true, data: expense });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
