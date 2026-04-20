// app/(admin)/admin/flats/page.tsx — Manage Flats
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import type { Flat, UserListItem } from '@/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/contexts/ToastContext';
import { ApiError } from '@/lib/api';
import { Plus, Pencil } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const createSchema = z.object({
  unitNumber: z.string().min(1, 'Unit number is required'),
  floor: z.string().refine((v) => !isNaN(Number(v)), 'Must be a number'),
  block: z.string().min(1, 'Block is required'),
  area: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Enter a valid area'),
  occupantName: z.string().min(1, 'Occupant name is required'),
  ownerId: z.string().min(1, 'Owner ID is required'),
});

type CreateValues = z.infer<typeof createSchema>;

export default function FlatsPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [flats, setFlats] = useState<Flat[]>([]);
  const [homeowners, setHomeowners] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getFlats({ includeInactive: showInactive });
      setFlats(data);
    } catch {
      toastError('Failed to load flats');
    } finally {
      setIsLoading(false);
    }
  }, [showInactive, toastError]);

  useEffect(() => { void load(); }, [load]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({ resolver: zodResolver(createSchema) });

  const openCreate = async () => {
    reset({ unitNumber: '', floor: '', block: '', area: '', occupantName: '', ownerId: '' });
    setModalOpen(true);
    try {
      const users = await adminApi.getUsers({ role: 'HOMEOWNER', unassigned: true });
      setHomeowners(users);
    } catch {
      // non-fatal — admin can still type UUID manually
    }
  };

  const onSubmit = async (values: CreateValues) => {
    try {
      await adminApi.createFlat({
        unitNumber: values.unitNumber,
        floor: Number(values.floor),
        block: values.block,
        area: Number(values.area),
        occupantName: values.occupantName,
        ownerId: values.ownerId,
      });
      success('Flat created', `Flat ${values.unitNumber} has been added.`);
      setModalOpen(false);
      void load();
    } catch (err) {
      toastError('Failed to create flat', err instanceof ApiError ? err.message : 'Please try again.');
    }
  };

  const columns: Column<Flat>[] = [
    {
      key: 'unit',
      header: 'Unit',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.unitNumber}</p>
          <p className="text-xs text-gray-500">Block {row.block}, Floor {row.floor}</p>
        </div>
      ),
    },
    {
      key: 'occupant',
      header: 'Occupant',
      cell: (row) => <span className="text-gray-700">{row.occupantName}</span>,
    },
    {
      key: 'area',
      header: 'Area',
      sortable: true,
      cell: (row) => <span className="text-gray-600">{row.area} sq.ft</span>,
    },
    {
      key: 'owner',
      header: 'Owner',
      cell: (row) => (
        <span className="text-gray-600 text-sm font-mono">{row.owner?.email ?? row.ownerId}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => (
        <Badge variant={row.isActive ? 'green' : 'gray'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Pencil className="w-3.5 h-3.5" />}
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/admin/flats/${row.id}`);
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flats</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage residential units</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          Add Flat
        </Button>
      </div>

      <Card>
        <CardHeader
          title="All Flats"
          action={
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Show inactive
            </label>
          }
        />
        <Table
          data={flats}
          columns={columns}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="No flats found. Add the first flat."
          onRowClick={(row) => router.push(`/admin/flats/${row.id}`)}
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Flat"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button form="flat-form" type="submit" isLoading={isSubmitting}>Create Flat</Button>
          </>
        }
      >
        <form id="flat-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              {...register('unitNumber')}
              label="Unit Number"
              placeholder="e.g. A101"
              error={errors.unitNumber?.message}
              required
            />
            <Input
              {...register('floor')}
              label="Floor"
              type="number"
              placeholder="1"
              error={errors.floor?.message}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              {...register('block')}
              label="Block"
              placeholder="e.g. A"
              error={errors.block?.message}
              required
            />
            <Input
              {...register('area')}
              label="Area (sq.ft)"
              type="number"
              placeholder="900"
              error={errors.area?.message}
              required
            />
          </div>
          <Input
            {...register('occupantName')}
            label="Occupant Name"
            placeholder="Full name"
            error={errors.occupantName?.message}
            required
          />
          <Select
            {...register('ownerId')}
            label="Owner (Homeowner)"
            error={errors.ownerId?.message}
            required
            options={[
              { value: '', label: homeowners.length === 0 ? 'No unassigned homeowners' : 'Select a homeowner...' },
              ...homeowners.map((u) => ({
                value: u.id,
                label: `${u.email} (${u.phone})`,
              })),
            ]}
          />
        </form>
      </Modal>
    </div>
  );
}
