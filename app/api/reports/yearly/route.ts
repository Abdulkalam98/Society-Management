import { NextRequest, NextResponse } from 'next/server';
import { getYearlyReport } from '@/lib/server/services/reportService';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const year = parseInt(request.nextUrl.searchParams.get('year') ?? '', 10);
    if (isNaN(year)) {
      return NextResponse.json(
        { success: false, error: 'year is required' },
        { status: 400 }
      );
    }

    const report = await getYearlyReport(year);
    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
