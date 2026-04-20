import { prisma } from '@/lib/server/prisma';
import { createError } from '@/lib/server/errors';

// ─── Categories ───────────────────────────────────────────────────────────────

export async function createCategory(name: string, description?: string) {
  const existing = await prisma.expenseCategory.findUnique({ where: { name } });
  if (existing) throw createError(`Category "${name}" already exists`, 409);

  return prisma.expenseCategory.create({ data: { name, description } });
}

export async function listCategories(includeInactive = false) {
  return prisma.expenseCategory.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function updateCategory(
  id: string,
  data: { name?: string; description?: string; isActive?: boolean }
) {
  const exists = await prisma.expenseCategory.findUnique({ where: { id } });
  if (!exists) throw createError('Category not found', 404);

  return prisma.expenseCategory.update({ where: { id }, data });
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function createExpense(params: {
  title: string;
  description?: string;
  amount: number;
  month: number;
  year: number;
  categoryId: string;
  adminId: string;
}) {
  const category = await prisma.expenseCategory.findUnique({ where: { id: params.categoryId } });
  if (!category || !category.isActive) throw createError('Category not found or inactive', 404);

  return prisma.expense.create({
    data: {
      title: params.title,
      description: params.description,
      amount: params.amount,
      month: params.month,
      year: params.year,
      categoryId: params.categoryId,
      postedByAdminId: params.adminId,
    },
    include: { category: true },
  });
}

export async function listExpenses(filters: { month?: number; year?: number; categoryId?: string }) {
  return prisma.expense.findMany({
    where: {
      ...(filters.month ? { month: filters.month } : {}),
      ...(filters.year ? { year: filters.year } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    },
    include: { category: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
}

export async function getExpenseById(id: string) {
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { category: true, flatBills: { include: { flat: true } } },
  });
  if (!expense) throw createError('Expense not found', 404);
  return expense;
}

// ─── Flats / Unit Management ──────────────────────────────────────────────────

export async function createFlat(params: {
  unitNumber: string;
  floor: number;
  block: string;
  area: number;
  occupantName: string;
  ownerId: string;
}) {
  const existing = await prisma.flat.findUnique({ where: { unitNumber: params.unitNumber } });
  if (existing) throw createError(`Flat ${params.unitNumber} already exists`, 409);

  const userExists = await prisma.user.findUnique({ where: { id: params.ownerId } });
  if (!userExists) throw createError('Owner user not found', 404);

  return prisma.flat.create({ data: params });
}

export async function listFlats(includeInactive = false) {
  return prisma.flat.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: { owner: { select: { id: true, email: true, phone: true } } },
    orderBy: [{ block: 'asc' }, { unitNumber: 'asc' }],
  });
}

export async function updateFlat(
  id: string,
  data: { occupantName?: string; area?: number; isActive?: boolean }
) {
  const exists = await prisma.flat.findUnique({ where: { id } });
  if (!exists) throw createError('Flat not found', 404);

  return prisma.flat.update({ where: { id }, data });
}

export async function getFlatById(id: string) {
  const flat = await prisma.flat.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, email: true, phone: true } },
      flatBills: { where: { status: { in: ['PENDING', 'PARTIAL'] } }, include: { expense: true } },
    },
  });
  if (!flat) throw createError('Flat not found', 404);
  return flat;
}
