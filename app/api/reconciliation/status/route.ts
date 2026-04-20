import { NextRequest, NextResponse } from 'next/server';
import { getReconciliationStatus } from '@/lib/server/services/reconciliationService';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const statusFilter = request.nextUrl.searchParams.get('status') as
      | 'MATCHED' | 'MISMATCH' | 'DUPLICATE' | 'PENDING'
      | undefined;

    const entries = await getReconciliationStatus({ status: statusFilter ?? undefined });
    return NextResponse.json({ success: true, data: entries });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
