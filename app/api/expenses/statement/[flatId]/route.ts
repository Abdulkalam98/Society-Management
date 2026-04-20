import { NextRequest, NextResponse } from 'next/server';
import { getStatementForFlat } from '@/lib/server/services/expenseService';
import { authenticateRequest, scopeToFlat } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: { flatId: string } }
) {
  try {
    const user = authenticateRequest(request);
    scopeToFlat(user, params.flatId);

    const sp = request.nextUrl.searchParams;
    const month = sp.get('month') ? parseInt(sp.get('month')!, 10) : undefined;
    const year = sp.get('year') ? parseInt(sp.get('year')!, 10) : undefined;

    const statement = await getStatementForFlat(params.flatId, month, year);
    return NextResponse.json({ success: true, data: statement });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
