// lib/utils.ts — Shared utilities

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { BillStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency ─────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ─── Date ─────────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function getMonthName(month: number): string {
  return MONTHS[month - 1] ?? 'Unknown';
}

export function getMonthOptions(): Array<{ value: number; label: string }> {
  return MONTHS.map((label, index) => ({ value: index + 1, label }));
}

export function getYearOptions(range = 5): Array<{ value: number; label: string }> {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: range }, (_, i) => {
    const year = currentYear - i;
    return { value: year, label: String(year) };
  });
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

// ─── Bill Status ──────────────────────────────────────────────────────────────

export function getBillStatusVariant(
  status: BillStatus
): 'yellow' | 'orange' | 'green' | 'red' | 'gray' {
  switch (status) {
    case 'PENDING':
      return 'yellow';
    case 'PARTIAL':
      return 'orange';
    case 'PAID':
      return 'green';
    case 'OVERDUE':
      return 'red';
    default:
      return 'gray';
  }
}

export function getBillStatusLabel(status: BillStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

// ─── Download Helpers ─────────────────────────────────────────────────────────

export async function downloadFile(response: Response, filename: string) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
