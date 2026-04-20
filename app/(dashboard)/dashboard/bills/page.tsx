// app/(dashboard)/dashboard/bills/page.tsx — My Bills
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { expenseApi } from '@/lib/api';
import { formatCurrency, formatDate, getMonthName, getMonthOptions, getYearOptions } from '@/lib/utils';
import type { FlatBill, BillStatus } from '@/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { Table, type Column } from '@/components/ui/Table';
import { BillStatusBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/contexts/ToastContext';
import { Receipt, Filter } from 'lucide-react';

export default function BillsPage() {
  const router = useRouter();
  const { error: toastError } = useToast();
  const [bills, setBills] = useState<FlatBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await expenseApi.getDues();
      setBills(data);
    } catch {
      toastError('Failed to load bills');
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => { void load(); }, [load]);

  const filtered = bills.filter((b) => {
    if (filterStatus && b.status !== filterStatus) return false;
    if (filterMonth && b.expense?.month !== Number(filterMonth)) return false;
    if (filterYear && b.expense?.year !== Number(filterYear)) return false;
    return true;
  });

  const columns: Column<FlatBill>[] = [
    {
      key: 'title',
      header: 'Bill',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.expense?.title ?? '—'}</p>
          <p className="text-xs text-gray-500">
            {row.expense ? `${getMonthName(row.expense.month)} ${row.expense.year}` : '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-semibold">{formatCurrency(row.amount)}</p>
          {row.paidAmount > 0 && row.status !== 'PAID' && (
            <p className="text-xs text-green-600">{formatCurrency(row.paidAmount)} paid</p>
          )}
        </div>
      ),
    },
    {
      key: 'due',
      header: 'Balance Due',
      cell: (row) => (
        <span className="font-medium text-red-600">
          {formatCurrency(Math.max(0, row.amount - row.paidAmount))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <BillStatusBadge status={row.status} />,
    },
    {
      key: 'date',
      header: 'Created',
      sortable: true,
      cell: (row) => (
        <span className="text-gray-600 text-sm">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/bills/${row.id}`);
          }}
        >
          {row.status !== 'PAID' ? 'Pay Now' : 'View'}
        </Button>
      ),
    },
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'PARTIAL', label: 'Partial' },
    { value: 'PAID', label: 'Paid' },
    { value: 'OVERDUE', label: 'Overdue' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Bills</h1>
        <p className="text-gray-500 text-sm mt-0.5">View and pay your society bills</p>
      </div>

      <Card>
        <CardHeader
          title="All Bills"
          action={
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" aria-hidden="true" />
              <span className="text-sm text-gray-600">{filtered.length} records</span>
            </div>
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="w-36">
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={statusOptions}
              aria-label="Filter by status"
            />
          </div>
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
          {(filterStatus || filterMonth || filterYear) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterStatus(''); setFilterMonth(''); setFilterYear(''); }}
            >
              Clear filters
            </Button>
          )}
        </div>

        <Table
          data={filtered}
          columns={columns}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="No bills found matching your filters."
          onRowClick={(row) => router.push(`/dashboard/bills/${row.id}`)}
        />
      </Card>
    </div>
  );
}
