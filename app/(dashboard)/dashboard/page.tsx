// app/(dashboard)/dashboard/page.tsx — Homeowner dashboard home
'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { expenseApi } from '@/lib/api';
import { formatCurrency, formatDate, getBillStatusLabel } from '@/lib/utils';
import type { FlatBill } from '@/types';
import { StatCard, Card, CardHeader } from '@/components/ui/Card';
import { BillStatusBadge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import {
  Receipt,
  CreditCard,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

export default function DashboardHomePage() {
  const { user, flat } = useAuth();
  const router = useRouter();
  const [bills, setBills] = useState<FlatBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const dues = await expenseApi.getDues();
        setBills(dues);
      } catch {
        // silently fail — handled by empty state
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const totalDue = bills
    .filter((b) => b.status !== 'PAID')
    .reduce((sum, b) => sum + (b.amount - b.paidAmount), 0);

  const totalPaid = bills
    .filter((b) => b.status === 'PAID')
    .reduce((sum, b) => sum + b.amount, 0);

  const overdueCount = bills.filter((b) => b.status === 'OVERDUE').length;
  const recentBills = bills.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good day{flat ? `, Flat ${flat.unitNumber}` : ''}
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Here&apos;s a summary of your account activity.
        </p>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total Outstanding"
            value={formatCurrency(totalDue)}
            subtitle="Across all unpaid bills"
            icon={<AlertCircle className="w-6 h-6" />}
            colorClass={totalDue > 0 ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}
          />
          <StatCard
            title="Total Paid"
            value={formatCurrency(totalPaid)}
            subtitle="All time payments"
            icon={<CheckCircle className="w-6 h-6" />}
            colorClass="text-green-600 bg-green-50"
          />
          <StatCard
            title="Overdue Bills"
            value={overdueCount}
            subtitle={overdueCount > 0 ? 'Requires immediate attention' : 'No overdue bills'}
            icon={<Receipt className="w-6 h-6" />}
            colorClass={overdueCount > 0 ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-50'}
          />
        </div>
      )}

      {/* Recent Bills */}
      <Card>
        <CardHeader
          title="Recent Bills"
          subtitle="Your 5 most recent bills"
          action={
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => router.push('/dashboard/bills')}
            >
              View all
            </Button>
          }
        />

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : recentBills.length === 0 ? (
          <EmptyState
            title="No bills yet"
            description="You have no bills at the moment. Check back later."
            icon={<Receipt className="w-10 h-10" />}
          />
        ) : (
          <div className="space-y-2">
            {recentBills.map((bill) => (
              <button
                key={bill.id}
                onClick={() => router.push(`/dashboard/bills/${bill.id}`)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-4 h-4 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {bill.expense?.title ?? `Bill #${bill.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {bill.createdAt ? formatDate(bill.createdAt) : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(bill.amount)}
                    </p>
                    {bill.status !== 'PAID' && bill.paidAmount > 0 && (
                      <p className="text-xs text-gray-500">
                        {formatCurrency(bill.paidAmount)} paid
                      </p>
                    )}
                  </div>
                  <BillStatusBadge status={bill.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Quick actions */}
      <Card>
        <CardHeader title="Quick Actions" />
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            leftIcon={<Receipt className="w-4 h-4" />}
            onClick={() => router.push('/dashboard/bills')}
          >
            View All Bills
          </Button>
          <Button
            variant="secondary"
            leftIcon={<CreditCard className="w-4 h-4" />}
            onClick={() => router.push('/dashboard/payments')}
          >
            Payment History
          </Button>
        </div>
      </Card>
    </div>
  );
}
