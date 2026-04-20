import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createCategory, listCategories } from '@/lib/server/services/adminService';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function POST(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const body = z.object({
      name: z.string().min(2),
      description: z.string().optional(),
    }).parse(await request.json());

    const category = await createCategory(body.name, body.description);
    return NextResponse.json(
      { success: true, data: category, message: 'Category created' },
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
    const categories = await listCategories(includeInactive);
    return NextResponse.json({ success: true, data: categories });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
