import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveReconciliationEntry } from '@/lib/server/services/reconciliationService';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const { notes } = z.object({ notes: z.string().min(5) }).parse(await request.json());
    const entry = await resolveReconciliationEntry(params.id, notes);
    return NextResponse.json({ success: true, data: entry, message: 'Entry resolved' });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
