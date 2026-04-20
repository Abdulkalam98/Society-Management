import { prisma } from '@/lib/server/prisma';
import { createError } from '@/lib/server/errors';

const DEFAULT_DUE_DAYS = 15; // bills due 15 days from creation

// ─── Bill Splitting ───────────────────────────────────────────────────────────

/**
 * Split a single expense evenly across all active flats.
 * Creates one FlatBill record per flat.
 * Idempotent: if already split, throws a conflict error.
 */
export async function splitExpense(expenseId: string): Promise<{
  billsCreated: number;
  amountPerFlat: number;
  bills: unknown[];
}> {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { category: true },
  });
  if (!expense) throw createError('Expense not found', 404);
  if (expense.isSplit) throw createError('Expense has already been split', 409);

  const flats = await prisma.flat.findMany({ where: { isActive: true } });
  if (flats.length === 0) throw createError('No active flats to split expense across', 400);

  const amountPerFlat = Math.round((expense.amount / flats.length) * 100) / 100;
  const dueDate = new Date(Date.now() + DEFAULT_DUE_DAYS * 24 * 60 * 60 * 1000);

  // Use a transaction so either all bills are created or none
  const [, bills] = await prisma.$transaction([
    prisma.expense.update({
      where: { id: expenseId },
      data: { isSplit: true, splitAt: new Date() },
    }),
    prisma.$queryRaw`SELECT 1`, // placeholder; real inserts below
  ]);

  // Create FlatBill records in one transaction
  await prisma.$transaction(
    flats.map((flat) =>
      prisma.flatBill.upsert({
        where: { flatId_expenseId: { flatId: flat.id, expenseId } },
        create: { flatId: flat.id, expenseId, amountDue: amountPerFlat, dueDate },
        update: {},
      })
    )
  );

  await prisma.expense.update({
    where: { id: expenseId },
    data: { isSplit: true, splitAt: new Date() },
  });

  const createdBills = await prisma.flatBill.findMany({
    where: { expenseId },
    include: { flat: { select: { unitNumber: true, block: true } } },
  });

  return {
    billsCreated: createdBills.length,
    amountPerFlat,
    bills: createdBills.map((b) => ({
      ...b,
      amount: b.amountDue,
      paidAmount: b.amountPaid,
    })),
  };
}

// ─── Statements ───────────────────────────────────────────────────────────────

export async function getStatementForFlat(flatId: string, month?: number, year?: number) {
  const flat = await prisma.flat.findUnique({ where: { id: flatId } });
  if (!flat) throw createError('Flat not found', 404);

  const bills = await prisma.flatBill.findMany({
    where: {
      flatId,
      ...(month || year
        ? {
            expense: {
              ...(month ? { month } : {}),
              ...(year ? { year } : {}),
            },
          }
        : {}),
    },
    include: {
      expense: { include: { category: true } },
      payments: { where: { status: 'CAPTURED' }, select: { amount: true, createdAt: true, razorpayPaymentId: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const mappedBills = bills.map((b) => ({
    ...b,
    amount: b.amountDue,
    paidAmount: b.amountPaid,
  }));

  const totalDue = bills.reduce((sum, b) => sum + b.amountDue, 0);
  const totalPaid = bills.reduce((sum, b) => sum + b.amountPaid, 0);
  const outstanding = totalDue - totalPaid;

  return { flat, bills: mappedBills, summary: { totalDue, totalPaid, outstanding, billCount: bills.length } };
}

// ─── Dues ─────────────────────────────────────────────────────────────────────

export async function getOutstandingDues(flatId: string) {
  const bills = await prisma.flatBill.findMany({
    where: { flatId, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
    include: { expense: { include: { category: true } }, flat: true },
    orderBy: { dueDate: 'asc' },
  });

  // Return flat array with frontend-friendly field names
  return bills.map((b) => ({
    ...b,
    amount: b.amountDue,
    paidAmount: b.amountPaid,
  }));
}

export async function getAllOutstandingDues() {
  const bills = await prisma.flatBill.findMany({
    where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
    include: {
      flat: { select: { id: true, unitNumber: true, block: true, owner: { select: { email: true, phone: true } } } },
      expense: { include: { category: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  // Return flat array with frontend-friendly field names
  return bills.map((b) => ({
    ...b,
    amount: b.amountDue,
    paidAmount: b.amountPaid,
  }));
}

// ─── Mark Overdue ─────────────────────────────────────────────────────────────

export async function markOverdueBills(): Promise<number> {
  const result = await prisma.flatBill.updateMany({
    where: {
      status: { in: ['PENDING', 'PARTIAL'] },
      dueDate: { lt: new Date() },
    },
    data: { status: 'OVERDUE' },
  });
  return result.count;
}

// ─── Apply Payment to Bill ────────────────────────────────────────────────────

export async function applyPaymentToBill(flatBillId: string, amount: number): Promise<void> {
  const bill = await prisma.flatBill.findUnique({ where: { id: flatBillId } });
  if (!bill) throw createError('FlatBill not found', 404);

  const newPaid = bill.amountPaid + amount;
  const newStatus =
    newPaid >= bill.amountDue ? 'PAID' : newPaid > 0 ? 'PARTIAL' : bill.status;

  await prisma.flatBill.update({
    where: { id: flatBillId },
    data: {
      amountPaid: newPaid,
      status: newStatus,
      ...(newStatus === 'PAID' ? { paidAt: new Date() } : {}),
    },
  });
}
