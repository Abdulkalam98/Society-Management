import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getFlatById, updateFlat } from '@/lib/server/services/adminService';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const flat = await getFlatById(params.id);
    return NextResponse.json({ success: true, data: flat });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const body = z.object({
      occupantName: z.string().min(2).optional(),
      area: z.number().positive().optional(),
      isActive: z.boolean().optional(),
    }).parse(await request.json());

    const flat = await updateFlat(params.id, body);
    return NextResponse.json({ success: true, data: flat });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
