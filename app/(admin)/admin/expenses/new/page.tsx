// app/(admin)/admin/expenses/new/page.tsx — Create Expense
'use client';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import type { Category } from '@/types';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { useToast } from '@/contexts/ToastContext';
import { ApiError } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { getMonthOptions, getYearOptions } from '@/lib/utils';

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().optional(),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Enter a valid positive amount'),
  month: z.string().min(1, 'Month is required'),
  year: z.string().min(1, 'Year is required'),
  categoryId: z.string().min(1, 'Category is required'),
});

type FormValues = z.infer<typeof schema>;

export default function CreateExpensePage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    adminApi.getCategories().then(setCategories).catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await adminApi.createExpense({
        title: values.title,
        description: values.description,
        amount: Number(values.amount),
        month: Number(values.month),
        year: Number(values.year),
        categoryId: values.categoryId,
      });
      success('Expense created', `"${values.title}" has been posted.`);
      router.push('/admin/expenses');
    } catch (err) {
      toastError(
        'Failed to create expense',
        err instanceof ApiError ? err.message : 'Please try again.'
      );
    }
  };

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => router.back()}
        >
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Expense</h1>
          <p className="text-gray-500 text-sm mt-0.5">Post a new society expense</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <Input
            {...register('title')}
            label="Title"
            placeholder="e.g. Common Area Electricity — March 2026"
            error={errors.title?.message}
            required
          />

          <Textarea
            {...register('description')}
            label="Description"
            placeholder="Optional details about this expense"
            error={errors.description?.message}
          />

          <Input
            {...register('amount')}
            label="Amount (₹)"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="5000.00"
            error={errors.amount?.message}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              {...register('month')}
              label="Month"
              options={getMonthOptions().map((m) => ({ value: String(m.value), label: m.label }))}
              error={errors.month?.message}
              required
            />
            <Select
              {...register('year')}
              label="Year"
              options={getYearOptions().map((y) => ({ value: String(y.value), label: y.label }))}
              error={errors.year?.message}
              required
            />
          </div>

          <Select
            {...register('categoryId')}
            label="Category"
            options={categoryOptions}
            placeholder={categories.length === 0 ? 'No categories available' : 'Select a category'}
            error={errors.categoryId?.message}
            disabled={categories.length === 0}
            required
          />

          {categories.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-4 py-2">
              No categories found.{' '}
              <button
                type="button"
                onClick={() => router.push('/admin/categories')}
                className="font-medium underline"
              >
                Create a category first
              </button>
              .
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={categories.length === 0}
            >
              Post Expense
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
