import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createExpense, listExpenses } from '@/lib/server/services/adminService';
import { authenticateRequest, requireAdmin } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function POST(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    requireAdmin(user);

    const body = z.object({
      title: z.string().min(2),
      description: z.string().optional(),
      amount: z.number().positive(),
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2020),
      categoryId: z.string().uuid(),
    }).parse(await request.json());

    const expense = await createExpense({ ...body, adminId: user.userId });
    return NextResponse.json(
      { success: true, data: expense, message: 'Expense created' },
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

    const sp = request.nextUrl.searchParams;
    const filters = {
      month: sp.get('month') ? parseInt(sp.get('month')!, 10) : undefined,
      year: sp.get('year') ? parseInt(sp.get('year')!, 10) : undefined,
      categoryId: sp.get('categoryId') ?? undefined,
    };

    const expenses = await listExpenses(filters);
    return NextResponse.json({ success: true, data: expenses });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
