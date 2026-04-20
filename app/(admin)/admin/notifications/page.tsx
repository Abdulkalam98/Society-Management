// app/(admin)/admin/notifications/page.tsx — Admin notifications
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { notificationApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { Notification } from '@/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useToast } from '@/contexts/ToastContext';
import { Bell, CheckCheck, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_BADGE: Record<string, 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray'> = {
  BILL: 'blue',
  PAYMENT: 'green',
  ANNOUNCEMENT: 'purple',
  REMINDER: 'yellow',
  OVERDUE: 'red',
};

const LIMIT = 10;

export default function AdminNotificationsPage() {
  const { error: toastError, success } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setIsLoading(true);
    try {
      const data = await notificationApi.getMyNotifications({ page: p, limit: LIMIT });
      setNotifications(data.data);
      setTotal(data.total);
    } catch {
      toastError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => { void load(page); }, [load, page]);

  const markRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      toastError('Could not mark as read');
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(unread.map((n) => notificationApi.markRead(n.id)));
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    success('All marked as read');
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading && page === 1) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<CheckCheck className="w-4 h-4" />}
            onClick={() => void markAllRead()}
          >
            Mark all as read
          </Button>
        )}
      </div>

      <Card padding="none">
        {notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="Admin notifications will appear here."
            icon={<Bell className="w-10 h-10" />}
            className="py-16"
          />
        ) : (
          <ul className="divide-y divide-gray-100" role="list">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  'flex items-start gap-4 px-6 py-4 transition-colors',
                  !n.isRead ? 'bg-primary-50/40' : 'hover:bg-gray-50'
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    !n.isRead ? 'bg-primary-100' : 'bg-gray-100'
                  )}
                  aria-hidden="true"
                >
                  <BellRing
                    className={cn('w-4 h-4', !n.isRead ? 'text-primary-600' : 'text-gray-400')}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn('text-sm font-medium text-gray-900', !n.isRead && 'font-semibold')}>
                        {n.subject}
                      </p>
                      <Badge variant={TYPE_BADGE[n.type] ?? 'gray'}>
                        {n.type.toLowerCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0">
                      {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{n.body}</p>
                  {!n.isRead && (
                    <button
                      onClick={() => void markRead(n.id)}
                      className="mt-2 text-xs text-primary-600 hover:underline"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Pagination
        page={page}
        total={total}
        limit={LIMIT}
        onPageChange={(p) => setPage(p)}
      />
    </div>
  );
}
