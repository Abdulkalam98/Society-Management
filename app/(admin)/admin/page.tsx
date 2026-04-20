// app/(admin)/admin/page.tsx — Admin dashboard home
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, expenseApi, reportApi } from '@/lib/api';
import { formatCurrency, formatDate, getMonthName } from '@/lib/utils';
import type { Expense, FlatBill } from '@/types';
import { StatCard, Card, CardHeader } from '@/components/ui/Card';
import { BillStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  TrendingUp,
  Building2,
  AlertCircle,
  CheckCircle,
  Receipt,
  ArrowRight,
  Plus,
} from 'lucide-react';

export default function AdminHomePage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dues, setDues] = useState<FlatBill[]>([]);
  const [flatsCount, setFlatsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [expList, duesList, flatsList] = await Promise.all([
          adminApi.getExpenses(),
          expenseApi.getDues(),
          adminApi.getFlats(),
        ]);
        setExpenses(expList);
        setDues(duesList);
        setFlatsCount(flatsList.length);
      } catch {
        // Show partial data if one fails
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalCollected = dues.filter((b) => b.status === 'PAID').reduce((s, b) => s + b.paidAmount, 0);
  const totalOutstanding = dues
    .filter((b) => b.status !== 'PAID')
    .reduce((s, b) => s + (b.amount - b.paidAmount), 0);
  const overdueCount = dues.filter((b) => b.status === 'OVERDUE').length;

  const recentExpenses = expenses.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Society financial overview</p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => router.push('/admin/expenses/new')}
        >
          New Expense
        </Button>
      </div>

      {/* Stats grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total Expenses"
            value={formatCurrency(totalExpenses)}
            subtitle={`${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`}
            icon={<TrendingUp className="w-6 h-6" />}
            colorClass="text-primary-600 bg-primary-50"
          />
          <StatCard
            title="Total Collected"
            value={formatCurrency(totalCollected)}
            subtitle="All time collections"
            icon={<CheckCircle className="w-6 h-6" />}
            colorClass="text-green-600 bg-green-50"
          />
          <StatCard
            title="Outstanding"
            value={formatCurrency(totalOutstanding)}
            subtitle={`${dues.filter((b) => b.status !== 'PAID').length} pending bills`}
            icon={<AlertCircle className="w-6 h-6" />}
            colorClass={totalOutstanding > 0 ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-50'}
          />
          <StatCard
            title="Total Flats"
            value={flatsCount}
            subtitle={`${overdueCount} overdue bill${overdueCount !== 1 ? 's' : ''}`}
            icon={<Building2 className="w-6 h-6" />}
            colorClass="text-indigo-600 bg-indigo-50"
          />
        </div>
      )}

      {/* Recent expenses */}
      <Card>
        <CardHeader
          title="Recent Expenses"
          action={
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => router.push('/admin/expenses')}
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
        ) : recentExpenses.length === 0 ? (
          <EmptyState
            title="No expenses yet"
            description="Post your first expense to get started."
            icon={<TrendingUp className="w-10 h-10" />}
            action={
              <Button
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => router.push('/admin/expenses/new')}
              >
                Post Expense
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {recentExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => router.push('/admin/expenses')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-4 h-4 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{expense.title}</p>
                    <p className="text-xs text-gray-500">
                      {getMonthName(expense.month)} {expense.year}
                      {expense.category ? ` · ${expense.category.name}` : ''}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(expense.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Outstanding dues */}
      {dues.filter((b) => b.status === 'OVERDUE').length > 0 && (
        <Card>
          <CardHeader
            title="Overdue Bills"
            subtitle="Bills requiring immediate attention"
            action={
              <Button
                variant="danger"
                size="sm"
                onClick={() => router.push('/admin/expenses')}
              >
                Manage
              </Button>
            }
          />
          <div className="space-y-2">
            {dues
              .filter((b) => b.status === 'OVERDUE')
              .slice(0, 5)
              .map((bill) => (
                <div key={bill.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Flat {bill.flat?.unitNumber ?? '—'} — {bill.expense?.title ?? '—'}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(bill.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-red-700">
                      {formatCurrency(bill.amount - bill.paidAmount)}
                    </span>
                    <BillStatusBadge status={bill.status} />
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
