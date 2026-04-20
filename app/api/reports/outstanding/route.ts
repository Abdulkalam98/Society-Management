import { NextRequest, NextResponse } from 'next/server';
import { getFlatOutstandingReport } from '@/lib/server/services/reportService';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const report = await getFlatOutstandingReport();
    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
