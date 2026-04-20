// app/(auth)/register/page.tsx
'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi, ApiError } from '@/lib/api';
import { Eye, EyeOff } from 'lucide-react';

const schema = z
  .object({
    email: z.string().email('Enter a valid email address'),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
    role: z.enum(['HOMEOWNER', 'ADMIN'], { required_error: 'Select a role' }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await authApi.register({
        email: values.email,
        phone: values.phone,
        password: values.password,
        role: values.role,
      });
      success('Account created', 'You can now sign in.');
      router.push('/login');
    } catch (err) {
      if (err instanceof ApiError) {
        toastError('Registration failed', err.message);
      } else {
        toastError('Registration failed', 'An unexpected error occurred.');
      }
    }
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Create an account</h2>
        <p className="text-sm text-gray-500 mt-1">Fill in your details to get started</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          {...register('email')}
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          required
        />

        <Input
          {...register('phone')}
          label="Mobile number"
          type="tel"
          autoComplete="tel"
          placeholder="9876543210"
          error={errors.phone?.message}
          required
        />

        <Select
          {...register('role')}
          label="Role"
          options={[
            { value: 'HOMEOWNER', label: 'Homeowner' },
            { value: 'ADMIN', label: 'Admin' },
          ]}
          placeholder="Select your role"
          error={errors.role?.message}
          required
        />

        <Input
          {...register('password')}
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          hint="Use at least 8 characters, one uppercase letter, one number"
          required
          rightAddon={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="pointer-events-auto text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        <Input
          {...register('confirmPassword')}
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Repeat your password"
          error={errors.confirmPassword?.message}
          required
        />

        <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-primary-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
