import { NextRequest, NextResponse } from 'next/server';
import { getAuditLog } from '@/lib/server/services/reconciliationService';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const sp = request.nextUrl.searchParams;
    const entity = sp.get('entity') ?? undefined;
    const entityId = sp.get('entityId') ?? undefined;

    const logs = await getAuditLog(entity, entityId);
    return NextResponse.json({ success: true, data: logs });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
