import { NextRequest, NextResponse } from 'next/server';
import { exportMonthlyReportCsv } from '@/lib/server/services/reportService';
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

    const csv = await exportMonthlyReportCsv(month, year);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=report-${year}-${month}.csv`,
      },
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
