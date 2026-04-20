// app/(auth)/login/page.tsx
'use client';
import React, { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api';
import { Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

// ─── Inner component (uses useSearchParams — must be inside Suspense) ─────────

function LoginForm() {
  const { login } = useAuth();
  const { error: toastError } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const redirectAfterLogin = () => {
    const next = searchParams.get('next');
    const role = document.cookie.includes('user_role=ADMIN') ? 'ADMIN' : 'HOMEOWNER';
    if (next && !next.startsWith('/login')) {
      router.push(next);
    } else {
      router.push(role === 'ADMIN' ? '/admin' : '/dashboard');
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await login(values.email, values.password);
      // Small delay to let cookie settle before reading it
      setTimeout(redirectAfterLogin, 100);
    } catch (err) {
      toastError(
        'Login failed',
        err instanceof ApiError ? err.message : 'An unexpected error occurred.'
      );
    }
  };

  const quickLogin = (email: string, password: string) => {
    void login(email, password)
      .then(() => setTimeout(redirectAfterLogin, 100))
      .catch(() => toastError('Login failed', 'Check credentials'));
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
        <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
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
          {...register('password')}
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Enter your password"
          error={errors.password?.message}
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

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-primary-600 hover:text-primary-800 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-primary-600 font-medium hover:underline">
          Register
        </Link>
      </p>

      {/* Dev quick-login helpers */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center mb-2">Quick login (dev)</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Admin', email: 'admin@society.com', password: 'Admin@123' },
            { label: 'Owner A101', email: 'owner.a101@society.com', password: 'Owner@123' },
          ].map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => quickLogin(acc.email, acc.password)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-2 py-1.5 transition-colors"
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Page export (wraps the form in Suspense for useSearchParams) ─────────────

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
