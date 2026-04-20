// app/(auth)/forgot-password/page.tsx
'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi, ApiError } from '@/lib/api';
import { CheckCircle, ArrowLeft } from 'lucide-react';

// ─── Step 1: Email ────────────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

// ─── Step 2: OTP ──────────────────────────────────────────────────────────────

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
});

// ─── Step 3: New Password ─────────────────────────────────────────────────────

const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type EmailValues = z.infer<typeof emailSchema>;
type OtpValues = z.infer<typeof otpSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  // ── Step 1 form
  const emailForm = useForm<EmailValues>({ resolver: zodResolver(emailSchema) });
  const onSendOtp = async (values: EmailValues) => {
    try {
      await authApi.initiatePasswordReset(values.email);
      setEmail(values.email);
      setStep(2);
      success('OTP sent', `Check your email at ${values.email}`);
    } catch (err) {
      toastError('Failed', err instanceof ApiError ? err.message : 'Could not send OTP');
    }
  };

  // ── Step 2 form
  const otpForm = useForm<OtpValues>({ resolver: zodResolver(otpSchema) });
  const onVerifyOtp = (values: OtpValues) => {
    setOtp(values.otp);
    setStep(3);
  };

  // ── Step 3 form
  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });
  const onResetPassword = async (values: PasswordValues) => {
    try {
      await authApi.completePasswordReset({
        email,
        otp,
        newPassword: values.newPassword,
      });
      success('Password reset', 'You can now sign in with your new password.');
      router.push('/login');
    } catch (err) {
      toastError('Reset failed', err instanceof ApiError ? err.message : 'Could not reset password');
    }
  };

  // ── Step indicator
  const steps = ['Email', 'Verify OTP', 'New Password'];

  return (
    <>
      <div className="mb-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
        <h2 className="text-xl font-bold text-gray-900">Reset your password</h2>
        <p className="text-sm text-gray-500 mt-1">Follow the steps to recover access</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i + 1 < step
                    ? 'bg-green-500 text-white'
                    : i + 1 === step
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
                aria-current={i + 1 === step ? 'step' : undefined}
              >
                {i + 1 < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  i + 1 === step ? 'text-primary-700' : 'text-gray-500'
                }`}
              >
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 ${i + 1 < step ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Email */}
      {step === 1 && (
        <form
          onSubmit={emailForm.handleSubmit(onSendOtp)}
          noValidate
          className="space-y-4"
        >
          <Input
            {...emailForm.register('email')}
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={emailForm.formState.errors.email?.message}
            required
          />
          <Button
            type="submit"
            className="w-full"
            isLoading={emailForm.formState.isSubmitting}
          >
            Send OTP
          </Button>
        </form>
      )}

      {/* Step 2: OTP */}
      {step === 2 && (
        <form
          onSubmit={otpForm.handleSubmit(onVerifyOtp)}
          noValidate
          className="space-y-4"
        >
          <p className="text-sm text-gray-600">
            We sent a 6-digit code to <span className="font-medium">{email}</span>.
          </p>
          <Input
            {...otpForm.register('otp')}
            label="OTP"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            error={otpForm.formState.errors.otp?.message}
            required
          />
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              isLoading={otpForm.formState.isSubmitting}
            >
              Verify OTP
            </Button>
          </div>
        </form>
      )}

      {/* Step 3: New password */}
      {step === 3 && (
        <form
          onSubmit={passwordForm.handleSubmit(onResetPassword)}
          noValidate
          className="space-y-4"
        >
          <Input
            {...passwordForm.register('newPassword')}
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={passwordForm.formState.errors.newPassword?.message}
            hint="Minimum 8 characters, one uppercase, one number"
            required
          />
          <Input
            {...passwordForm.register('confirmPassword')}
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your new password"
            error={passwordForm.formState.errors.confirmPassword?.message}
            required
          />
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setStep(2)}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              isLoading={passwordForm.formState.isSubmitting}
            >
              Reset password
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
