// app/(admin)/admin/categories/page.tsx — Manage Categories
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminApi } from '@/lib/api';
import type { Category } from '@/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/contexts/ToastContext';
import { ApiError } from '@/lib/api';
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CategoriesPage() {
  const { success, error: toastError } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getCategories({ includeInactive: showInactive });
      setCategories(data);
    } catch {
      toastError('Failed to load categories');
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
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', description: '' });
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    reset({ name: cat.name, description: cat.description ?? '' });
    setModalOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await adminApi.updateCategory(editing.id, values);
        success('Category updated');
      } else {
        await adminApi.createCategory(values);
        success('Category created');
      }
      setModalOpen(false);
      void load();
    } catch (err) {
      toastError(
        editing ? 'Update failed' : 'Create failed',
        err instanceof ApiError ? err.message : 'Please try again.'
      );
    }
  };

  const toggleActive = async (cat: Category) => {
    setTogglingId(cat.id);
    try {
      await adminApi.updateCategory(cat.id, { isActive: !cat.isActive });
      success(cat.isActive ? 'Category deactivated' : 'Category activated');
      void load();
    } catch {
      toastError('Could not update status');
    } finally {
      setTogglingId(null);
    }
  };

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      cell: (row) => <span className="font-medium text-gray-900">{row.name}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      cell: (row) => (
        <span className="text-gray-600 text-sm">
          {row.description ?? <span className="text-gray-400 italic">None</span>}
        </span>
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
      key: 'created',
      header: 'Created',
      sortable: true,
      cell: (row) => <span className="text-gray-600 text-sm">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Pencil className="w-3.5 h-3.5" />}
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            isLoading={togglingId === row.id}
            leftIcon={
              row.isActive
                ? <ToggleLeft className="w-4 h-4 text-gray-500" />
                : <ToggleRight className="w-4 h-4 text-green-500" />
            }
            onClick={(e) => { e.stopPropagation(); void toggleActive(row); }}
          >
            {row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage expense categories</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          New Category
        </Button>
      </div>

      <Card>
        <CardHeader
          title="All Categories"
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
          data={categories}
          columns={columns}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="No categories found. Create your first category."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Category' : 'New Category'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              form="category-form"
              type="submit"
              isLoading={isSubmitting}
            >
              {editing ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form
          id="category-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          <Input
            {...register('name')}
            label="Name"
            placeholder="e.g. Maintenance, Utilities"
            error={errors.name?.message}
            required
            autoFocus
          />
          <Textarea
            {...register('description')}
            label="Description"
            placeholder="Optional description"
            error={errors.description?.message}
          />
        </form>
      </Modal>
    </div>
  );
}
