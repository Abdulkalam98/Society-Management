// app/(dashboard)/dashboard/bills/[id]/page.tsx — Bill detail + Razorpay checkout
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { expenseApi, paymentApi } from '@/lib/api';
import { formatCurrency, formatDate, getMonthName, getBillStatusLabel } from '@/lib/utils';
import type { FlatBill } from '@/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { BillStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, CreditCard, Download } from 'lucide-react';
import { ApiError } from '@/lib/api';

// ─── Razorpay type declaration ────────────────────────────────────────────────
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// ─── Load Razorpay script ─────────────────────────────────────────────────────

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();
  const billId = params.id as string;

  const [bill, setBill] = useState<FlatBill | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      // We fetch dues and find the matching bill
      const dues = await expenseApi.getDues();
      const found = dues.find((b) => b.id === billId);
      if (found) setBill(found);
    } catch {
      toastError('Failed to load bill details');
    } finally {
      setIsLoading(false);
    }
  }, [billId, toastError]);

  useEffect(() => { void load(); }, [load]);

  const handlePayNow = async () => {
    if (!bill) return;
    setIsPaying(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toastError('Payment failed', 'Could not load payment gateway. Check your internet connection.');
        return;
      }

      const order = await paymentApi.createOrder(bill.id);

      const options: RazorpayOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? 'rzp_test_placeholder',
        amount: order.amount,
        currency: order.currency,
        name: 'Society Manager',
        description: `Payment for ${bill.expense?.title ?? 'Bill'}`,
        order_id: order.razorpayOrderId,
        prefill: {
          email: user?.email,
          contact: user?.phone,
        },
        theme: { color: '#4f46e5' },
        handler: async (response) => {
          try {
            await paymentApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            success('Payment successful!', 'Your payment has been recorded.');
            void load(); // Refresh bill
          } catch {
            toastError('Payment verification failed', 'Contact support if amount was deducted.');
          }
        },
        modal: {
          ondismiss: () => {
            info('Payment cancelled', 'Your payment was not completed.');
            setIsPaying(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toastError(
        'Could not initiate payment',
        err instanceof ApiError ? err.message : 'Please try again.'
      );
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!bill) {
    return (
      <div className="text-center py-20 text-gray-500">
        Bill not found.{' '}
        <button onClick={() => router.back()} className="text-primary-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const balanceDue = bill.amount - bill.paidAmount;
  const isPaid = bill.status === 'PAID';

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
          <h1 className="text-2xl font-bold text-gray-900">Bill Details</h1>
        </div>
      </div>

      {/* Bill summary */}
      <Card>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {bill.expense?.title ?? `Bill #${bill.id.slice(0, 8)}`}
            </h2>
            {bill.expense && (
              <p className="text-sm text-gray-500 mt-0.5">
                {getMonthName(bill.expense.month)} {bill.expense.year}
              </p>
            )}
          </div>
          <BillStatusBadge status={bill.status} />
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Amount</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(bill.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Amount Paid</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(bill.paidAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Balance Due</p>
            <p className={`text-xl font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {formatCurrency(balanceDue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Created On</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(bill.createdAt)}</p>
          </div>
        </div>

        {bill.expense?.description && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-700">{bill.expense.description}</p>
          </div>
        )}

        {bill.expense?.category && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Category</p>
            <p className="text-sm text-gray-700">{bill.expense.category.name}</p>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        {!isPaid && (
          <Button
            onClick={() => void handlePayNow()}
            isLoading={isPaying}
            leftIcon={<CreditCard className="w-4 h-4" />}
            size="lg"
          >
            Pay {formatCurrency(balanceDue)}
          </Button>
        )}
        {isPaid && (
          <Button
            variant="secondary"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => router.push('/dashboard/payments')}
          >
            View Receipt
          </Button>
        )}
        {isPaid && (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <span>Payment complete</span>
          </div>
        )}
      </div>
    </div>
  );
}
