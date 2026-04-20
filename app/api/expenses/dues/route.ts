import { NextRequest, NextResponse } from 'next/server';
import { getOutstandingDues, getAllOutstandingDues } from '@/lib/server/services/expenseService';
import { authenticateRequest } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);

    if (user.role === 'ADMIN') {
      const all = await getAllOutstandingDues();
      return NextResponse.json({ success: true, data: all });
    }

    const flatId = user.flatId;
    if (!flatId) {
      return NextResponse.json(
        { success: false, error: 'No flat associated with account' },
        { status: 400 }
      );
    }

    const dues = await getOutstandingDues(flatId);
    return NextResponse.json({ success: true, data: dues });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
