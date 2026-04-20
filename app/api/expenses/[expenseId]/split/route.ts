import { NextRequest, NextResponse } from 'next/server';
import { splitExpense } from '@/lib/server/services/expenseService';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: { expenseId: string } }
) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const result = await splitExpense(params.expenseId);
    return NextResponse.json(
      { success: true, data: result, message: 'Expense split across all active flats' },
      { status: 201 }
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
}
