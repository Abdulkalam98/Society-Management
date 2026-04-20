import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createFlat, listFlats } from '@/lib/server/services/adminService';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function POST(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const body = z.object({
      unitNumber: z.string().min(2),
      floor: z.number().int().min(0),
      block: z.string().min(1),
      area: z.number().positive(),
      occupantName: z.string().min(2),
      ownerId: z.string().uuid(),
    }).parse(await request.json());

    const flat = await createFlat(body);
    return NextResponse.json(
      { success: true, data: flat, message: 'Flat created' },
      { status: 201 }
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true';
    const flats = await listFlats(includeInactive);
    return NextResponse.json({ success: true, data: flats });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
