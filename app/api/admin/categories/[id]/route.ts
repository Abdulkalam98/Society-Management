import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateCategory } from '@/lib/server/services/adminService';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const body = z.object({
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    }).parse(await request.json());

    const category = await updateCategory(params.id, body);
    return NextResponse.json({ success: true, data: category });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
