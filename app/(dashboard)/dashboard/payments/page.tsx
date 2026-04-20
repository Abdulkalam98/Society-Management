// app/(dashboard)/dashboard/payments/page.tsx — Payment history
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { expenseApi, paymentApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { Payment, FlatBill } from '@/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useToast } from '@/contexts/ToastContext';
import { CreditCard, Download, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_BADGE: Record<string, { variant: 'green' | 'red' | 'yellow' | 'gray'; label: string }> = {
  PAID: { variant: 'green', label: 'Paid' },
  CREATED: { variant: 'yellow', label: 'Pending' },
  FAILED: { variant: 'red', label: 'Failed' },
  REFUNDED: { variant: 'gray', label: 'Refunded' },
};

export default function PaymentsPage() {
  const { error: toastError, success } = useToast();
  // Payments are associated with flatBills; we gather them via dues
  // The API doesn't have a direct "list all payments" endpoint for homeowners,
  // so we derive payment history from bill statuses and their paid amounts.
  const [bills, setBills] = useState<FlatBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const dues = await expenseApi.getDues();
      // Show only bills that have some payment
      setBills(dues.filter((b) => b.paidAmount > 0 || b.status === 'PAID'));
    } catch {
      toastError('Failed to load payment history');
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => { void load(); }, [load]);

  if (isLoading) return <PageLoader />;

  const totalPaid = bills.reduce((sum, b) => sum + b.paidAmount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
        <p className="text-gray-500 text-sm mt-0.5">Record of all your payments</p>
      </div>

      {/* Total summary */}
      <div className="bg-primary-600 rounded-xl p-6 text-white">
        <p className="text-primary-200 text-sm font-medium">Total Paid (All Time)</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(totalPaid)}</p>
        <p className="text-primary-300 text-sm mt-1">
          {bills.length} transaction{bills.length !== 1 ? 's' : ''}
        </p>
      </div>

      <Card padding="none">
        <div className="p-6 pb-0">
          <CardHeader title="Transaction History" />
        </div>

        {bills.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description="Your payment history will appear here once you make payments."
            icon={<CreditCard className="w-10 h-10" />}
            className="pb-8"
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {bills.map((bill) => {
              const isPaid = bill.status === 'PAID';
              return (
                <div
                  key={bill.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                        isPaid ? 'bg-green-50' : 'bg-orange-50'
                      )}
                    >
                      <CreditCard
                        className={cn('w-5 h-5', isPaid ? 'text-green-600' : 'text-orange-500')}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {bill.expense?.title ?? `Bill #${bill.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-gray-500">{formatDateTime(bill.updatedAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(bill.paidAmount)}
                      </p>
                      <p className="text-xs text-gray-400">
                        of {formatCurrency(bill.amount)}
                      </p>
                    </div>
                    <Badge variant={isPaid ? 'green' : 'orange'}>
                      {isPaid ? 'Paid' : 'Partial'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
