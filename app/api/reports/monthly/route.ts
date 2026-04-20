import { NextRequest, NextResponse } from 'next/server';
import { getMonthlyReport } from '@/lib/server/services/reportService';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const sp = request.nextUrl.searchParams;
    const month = parseInt(sp.get('month') ?? '', 10);
    const year = parseInt(sp.get('year') ?? '', 10);

    if (isNaN(month) || isNaN(year)) {
      return NextResponse.json(
        { success: false, error: 'month and year are required' },
        { status: 400 }
      );
    }

    const report = await getMonthlyReport(month, year);
    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
