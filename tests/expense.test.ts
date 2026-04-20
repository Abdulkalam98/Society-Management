/**
 * Expense Agent Unit Tests
 * Tests bill splitting logic with a mocked Prisma client.
 */

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    expense: { findUnique: jest.fn(), update: jest.fn() },
    flat: { findMany: jest.fn() },
    flatBill: { upsert: jest.fn(), update: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { prisma } from '../../src/lib/prisma';
import { applyPaymentToBill } from '../../src/agents/expense/expenseService';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('expenseService — applyPaymentToBill', () => {
  it('should mark bill as PAID when full amount is paid', async () => {
    (mockPrisma.flatBill.findUnique as jest.Mock).mockResolvedValue({
      id: 'bill-1',
      amountDue: 1000,
      amountPaid: 0,
      status: 'PENDING',
    });
    (mockPrisma.flatBill.update as jest.Mock).mockResolvedValue({});

    await applyPaymentToBill('bill-1', 1000);

    expect(mockPrisma.flatBill.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PAID', amountPaid: 1000 }),
      })
    );
  });

  it('should mark bill as PARTIAL when partial amount is paid', async () => {
    (mockPrisma.flatBill.findUnique as jest.Mock).mockResolvedValue({
      id: 'bill-2',
      amountDue: 1000,
      amountPaid: 0,
      status: 'PENDING',
    });
    (mockPrisma.flatBill.update as jest.Mock).mockResolvedValue({});

    await applyPaymentToBill('bill-2', 400);

    expect(mockPrisma.flatBill.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PARTIAL', amountPaid: 400 }),
      })
    );
  });

  it('should throw 404 when flatBill not found', async () => {
    (mockPrisma.flatBill.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(applyPaymentToBill('missing-id', 100)).rejects.toMatchObject({
      message: 'FlatBill not found',
    });
  });
});
