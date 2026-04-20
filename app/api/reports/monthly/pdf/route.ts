import { NextRequest, NextResponse } from 'next/server';
import { getMonthlyReport, buildMonthlyReportPdf } from '@/lib/server/services/reportService';
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
    const doc = buildMonthlyReportPdf(report);

    // Collect PDF chunks into a buffer
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve());
      doc.on('error', reject);
      doc.end();
    });
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=report-${year}-${month}.pdf`,
      },
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
