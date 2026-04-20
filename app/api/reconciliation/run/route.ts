import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { reconcilePayments } from '@/lib/server/services/reconciliationService';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const body = z.object({
      fromDate: z.string().datetime(),
      toDate: z.string().datetime(),
    }).parse(await request.json());

    const result = await reconcilePayments(new Date(body.fromDate), new Date(body.toDate));
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
