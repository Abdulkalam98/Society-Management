// components/ui/Badge.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import type { BillStatus } from '@/types';

type BadgeVariant = 'yellow' | 'orange' | 'green' | 'red' | 'blue' | 'gray' | 'purple';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
};

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── Bill Status Badge ────────────────────────────────────────────────────────

const statusVariants: Record<BillStatus, BadgeVariant> = {
  PENDING: 'yellow',
  PARTIAL: 'orange',
  PAID: 'green',
  OVERDUE: 'red',
};

const statusLabels: Record<BillStatus, string> = {
  PENDING: 'Pending',
  PARTIAL: 'Partial',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
};

interface BillStatusBadgeProps {
  status: BillStatus;
  className?: string;
}

export function BillStatusBadge({ status, className }: BillStatusBadgeProps) {
  return (
    <Badge variant={statusVariants[status]} className={className}>
      {statusLabels[status]}
    </Badge>
  );
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant={role === 'ADMIN' ? 'purple' : 'blue'}>
      {role === 'ADMIN' ? 'Admin' : 'Homeowner'}
    </Badge>
  );
}
