// app/(admin)/admin/flats/[id]/page.tsx — Edit Flat
'use client';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import type { Flat } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Spinner';
import { useToast } from '@/contexts/ToastContext';
import { ApiError } from '@/lib/api';
import { ArrowLeft, Save } from 'lucide-react';

const schema = z.object({
  unitNumber: z.string().min(1, 'Unit number is required'),
  floor: z.string().refine((v) => !isNaN(Number(v)), 'Must be a number'),
  block: z.string().min(1, 'Block is required'),
  area: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Enter a valid area'),
  occupantName: z.string().min(1, 'Occupant name is required'),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function EditFlatPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const flatId = params.id as string;
  const [flat, setFlat] = useState<Flat | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    adminApi
      .getFlat(flatId)
      .then((data) => {
        setFlat(data);
        reset({
          unitNumber: data.unitNumber,
          floor: String(data.floor),
          block: data.block,
          area: String(data.area),
          occupantName: data.occupantName,
          isActive: data.isActive,
        });
      })
      .catch(() => toastError('Failed to load flat'))
      .finally(() => setIsLoading(false));
  }, [flatId, reset, toastError]);

  const onSubmit = async (values: FormValues) => {
    try {
      await adminApi.updateFlat(flatId, {
        unitNumber: values.unitNumber,
        floor: Number(values.floor),
        block: values.block,
        area: Number(values.area),
        occupantName: values.occupantName,
        isActive: values.isActive,
      });
      success('Flat updated', `Flat ${values.unitNumber} has been updated.`);
      router.push('/admin/flats');
    } catch (err) {
      toastError('Update failed', err instanceof ApiError ? err.message : 'Please try again.');
    }
  };

  if (isLoading) return <PageLoader />;
  if (!flat) {
    return (
      <div className="text-center py-20 text-gray-500">
        Flat not found.{' '}
        <button onClick={() => router.back()} className="text-primary-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Edit Flat</h1>
          <p className="text-gray-500 text-sm mt-0.5">Update flat {flat.unitNumber}</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input
              {...register('unitNumber')}
              label="Unit Number"
              error={errors.unitNumber?.message}
              required
            />
            <Input
              {...register('floor')}
              label="Floor"
              type="number"
              error={errors.floor?.message}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              {...register('block')}
              label="Block"
              error={errors.block?.message}
              required
            />
            <Input
              {...register('area')}
              label="Area (sq.ft)"
              type="number"
              error={errors.area?.message}
              required
            />
          </div>
          <Input
            {...register('occupantName')}
            label="Occupant Name"
            error={errors.occupantName?.message}
            required
          />

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              {...register('isActive')}
              type="checkbox"
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">Active flat</span>
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!isDirty}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
