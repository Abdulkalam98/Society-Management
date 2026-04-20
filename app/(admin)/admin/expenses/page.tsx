// app/(admin)/admin/expenses/page.tsx — Manage Expenses
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, expenseApi } from '@/lib/api';
import { formatCurrency, formatDate, getMonthName, getMonthOptions, getYearOptions } from '@/lib/utils';
import type { Expense, Category } from '@/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { Table, type Column } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/contexts/ToastContext';
import { Plus, GitBranch, Filter } from 'lucide-react';
import { ApiError } from '@/lib/api';

export default function ExpensesPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [splittingId, setSplittingId] = useState<string | null>(null);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [pendingSplitExpense, setPendingSplitExpense] = useState<Expense | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [expList, catList] = await Promise.all([
        adminApi.getExpenses({
          month: filterMonth ? Number(filterMonth) : undefined,
          year: filterYear ? Number(filterYear) : undefined,
          categoryId: filterCategory || undefined,
        }),
        adminApi.getCategories(),
      ]);
      setExpenses(expList);
      setCategories(catList);
    } catch {
      toastError('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, [filterMonth, filterYear, filterCategory, toastError]);

  useEffect(() => { void load(); }, [load]);

  const handleSplit = async () => {
    if (!pendingSplitExpense) return;
    setSplittingId(pendingSplitExpense.id);
    setSplitModalOpen(false);
    try {
      await expenseApi.splitExpense(pendingSplitExpense.id);
      success('Expense split', `Bills generated for all active flats.`);
    } catch (err) {
      toastError('Split failed', err instanceof ApiError ? err.message : 'Could not split expense.');
    } finally {
      setSplittingId(null);
      setPendingSplitExpense(null);
    }
  };

  const columns: Column<Expense>[] = [
    {
      key: 'title',
      header: 'Expense',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.title}</p>
          {row.description && (
            <p className="text-xs text-gray-500 truncate max-w-[200px]">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      sortable: true,
      cell: (row) => (
        <span className="text-gray-700">
          {getMonthName(row.month)} {row.year}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (row) => (
        row.category ? (
          <Badge variant="blue">{row.category.name}</Badge>
        ) : (
          <span className="text-gray-400">—</span>
        )
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      cell: (row) => (
        <span className="font-semibold">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      key: 'date',
      header: 'Created',
      sortable: true,
      cell: (row) => <span className="text-gray-600 text-sm">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<GitBranch className="w-3.5 h-3.5" />}
          isLoading={splittingId === row.id}
          onClick={(e) => {
            e.stopPropagation();
            setPendingSplitExpense(row);
            setSplitModalOpen(true);
          }}
        >
          Split
        </Button>
      ),
    },
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500 text-sm mt-0.5">Post and manage society expenses</p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => router.push('/admin/expenses/new')}
        >
          New Expense
        </Button>
      </div>

      <Card>
        <CardHeader
          title="All Expenses"
          action={
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{expenses.length} records</span>
            </div>
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="w-36">
            <Select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              options={[{ value: '', label: 'All Months' }, ...getMonthOptions().map(m => ({ value: String(m.value), label: m.label }))]}
              aria-label="Filter by month"
            />
          </div>
          <div className="w-28">
            <Select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              options={[{ value: '', label: 'All Years' }, ...getYearOptions().map(y => ({ value: String(y.value), label: y.label }))]}
              aria-label="Filter by year"
            />
          </div>
          <div className="w-44">
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              options={categoryOptions}
              aria-label="Filter by category"
            />
          </div>
          {(filterMonth || filterYear || filterCategory) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterMonth(''); setFilterYear(''); setFilterCategory(''); }}
            >
              Clear
            </Button>
          )}
        </div>

        <Table
          data={expenses}
          columns={columns}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="No expenses found. Post your first expense."
        />
      </Card>

      {/* Split confirm dialog */}
      <Modal
        isOpen={splitModalOpen}
        onClose={() => setSplitModalOpen(false)}
        title="Split Expense"
        description="This will generate bill records for all active flats."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSplitModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSplit()} isLoading={!!splittingId}>
              Confirm Split
            </Button>
          </>
        }
      >
        {pendingSplitExpense && (
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              You are about to split <span className="font-semibold">{pendingSplitExpense.title}</span> (
              {formatCurrency(pendingSplitExpense.amount)}) across all active flats.
            </p>
            <p className="text-sm text-gray-500">
              Each flat will receive an equal share of the total expense. This action cannot be undone.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
