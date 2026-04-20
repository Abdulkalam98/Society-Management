// app/(admin)/admin/reconciliation/page.tsx — Reconciliation
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { reconciliationApi } from '@/lib/api';
import type { ReconciliationRecord, ReconciliationStatus } from '@/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/contexts/ToastContext';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Play, CheckCheck, GitMerge, Filter } from 'lucide-react';

const runSchema = z.object({
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
});

type RunValues = z.infer<typeof runSchema>;

const STATUS_VARIANT: Record<ReconciliationStatus, 'green' | 'red' | 'yellow' | 'gray' | 'orange' | 'blue'> = {
  MATCHED: 'green',
  MISMATCH: 'red',
  DUPLICATE: 'orange',
  MISSING: 'yellow',
  RESOLVED: 'blue',
};

export default function ReconciliationPage() {
  const { success, error: toastError } = useToast();
  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolvingRecord, setResolvingRecord] = useState<ReconciliationRecord | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<RunValues>({ resolver: zodResolver(runSchema) });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await reconciliationApi.getStatus(
        filterStatus ? { status: filterStatus } : undefined
      );
      setRecords(data);
    } catch {
      toastError('Failed to load reconciliation records');
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, toastError]);

  useEffect(() => { void load(); }, [load]);

  const onRun = async (values: RunValues) => {
    setIsRunning(true);
    setRunModalOpen(false);
    try {
      await reconciliationApi.run(values);
      success('Reconciliation complete', 'Results are now available below.');
      void load();
    } catch (err) {
      toastError('Reconciliation failed', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  const openResolve = (record: ReconciliationRecord) => {
    setResolvingRecord(record);
    setResolveNotes(record.notes ?? '');
    setResolveModalOpen(true);
  };

  const handleResolve = async () => {
    if (!resolvingRecord) return;
    setIsResolving(true);
    try {
      await reconciliationApi.resolve(resolvingRecord.id, resolveNotes);
      success('Record resolved');
      setResolveModalOpen(false);
      void load();
    } catch (err) {
      toastError('Resolve failed', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'MATCHED', label: 'Matched' },
    { value: 'MISMATCH', label: 'Mismatch' },
    { value: 'DUPLICATE', label: 'Duplicate' },
    { value: 'MISSING', label: 'Missing' },
    { value: 'RESOLVED', label: 'Resolved' },
  ];

  const columns: Column<ReconciliationRecord>[] = [
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => (
        <Badge variant={STATUS_VARIANT[row.status]}>
          {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      key: 'gateway',
      header: 'Gateway Tx',
      cell: (row) => (
        <span className="font-mono text-xs text-gray-600">
          {row.gatewayTransactionId ?? '—'}
        </span>
      ),
    },
    {
      key: 'amounts',
      header: 'Amount',
      cell: (row) => (
        <div className="text-sm">
          {row.gatewayAmount !== undefined && (
            <p className="text-gray-700">Gateway: {formatCurrency(row.gatewayAmount)}</p>
          )}
          {row.billAmount !== undefined && (
            <p className={row.gatewayAmount !== row.billAmount ? 'text-red-600' : 'text-gray-700'}>
              Bill: {formatCurrency(row.billAmount)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      cell: (row) => (
        <span className="text-gray-600 text-sm max-w-[200px] truncate block">
          {row.notes ?? '—'}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      cell: (row) => (
        <span className="text-gray-600 text-sm">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        row.status !== 'RESOLVED' && row.status !== 'MATCHED' ? (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
            onClick={(e) => { e.stopPropagation(); openResolve(row); }}
          >
            Resolve
          </Button>
        ) : null
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reconciliation</h1>
          <p className="text-gray-500 text-sm mt-0.5">Match gateway transactions to bill records</p>
        </div>
        <Button
          leftIcon={<Play className="w-4 h-4" />}
          isLoading={isRunning}
          onClick={() => {
            reset({
              startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              endDate: new Date().toISOString().split('T')[0],
            });
            setRunModalOpen(true);
          }}
        >
          Run Reconciliation
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Reconciliation Records"
          action={
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{records.length} records</span>
            </div>
          }
        />
        <div className="mb-5">
          <div className="w-44">
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={statusOptions}
              aria-label="Filter by status"
            />
          </div>
        </div>
        <Table
          data={records}
          columns={columns}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="No reconciliation records found. Run a reconciliation to get started."
        />
      </Card>

      {/* Run modal */}
      <Modal
        isOpen={runModalOpen}
        onClose={() => setRunModalOpen(false)}
        title="Run Reconciliation"
        description="Select the date range to reconcile gateway transactions."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRunModalOpen(false)}>Cancel</Button>
            <Button form="run-form" type="submit" isLoading={isSubmitting}>
              Run
            </Button>
          </>
        }
      >
        <form id="run-form" onSubmit={handleSubmit(onRun)} noValidate className="space-y-4">
          <Input
            {...register('startDate')}
            label="Start Date"
            type="date"
            error={errors.startDate?.message}
            required
          />
          <Input
            {...register('endDate')}
            label="End Date"
            type="date"
            error={errors.endDate?.message}
            required
          />
        </form>
      </Modal>

      {/* Resolve modal */}
      <Modal
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        title="Resolve Mismatch"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResolveModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleResolve()} isLoading={isResolving}>
              Mark Resolved
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {resolvingRecord && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-600">
                Status: <Badge variant={STATUS_VARIANT[resolvingRecord.status]}>
                  {resolvingRecord.status}
                </Badge>
              </p>
              {resolvingRecord.gatewayTransactionId && (
                <p className="text-gray-600 mt-1 font-mono text-xs">
                  Tx: {resolvingRecord.gatewayTransactionId}
                </p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resolution Notes
            </label>
            <textarea
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y min-h-[80px]"
              placeholder="Describe how this was resolved..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
