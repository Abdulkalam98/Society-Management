// app/(admin)/admin/announcements/page.tsx — Send Announcement
'use client';
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { notificationApi } from '@/lib/api';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { useToast } from '@/contexts/ToastContext';
import { ApiError } from '@/lib/api';
import { Megaphone, Send } from 'lucide-react';

const schema = z.object({
  subject: z.string().min(1, 'Subject is required').max(150, 'Subject too long'),
  body: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message too long'),
});

type FormValues = z.infer<typeof schema>;

export default function AnnouncementsPage() {
  const { success, error: toastError } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const bodyValue = watch('body') ?? '';

  const onSubmit = async (values: FormValues) => {
    try {
      await notificationApi.announce(values);
      success('Announcement sent', 'All residents have been notified.');
      reset();
    } catch (err) {
      toastError(
        'Failed to send',
        err instanceof ApiError ? err.message : 'Please try again.'
      );
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Broadcast a message to all residents
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-primary-50 border border-primary-100 rounded-xl px-4 py-3">
        <Megaphone className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-primary-900">Broadcast to all residents</p>
          <p className="text-xs text-primary-700 mt-0.5">
            This will send an email and SMS notification to every registered homeowner.
            Use this for important society notices, meetings, and updates.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader title="Compose Announcement" />
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <Input
            {...register('subject')}
            label="Subject"
            placeholder="e.g. Water supply disruption on Saturday"
            error={errors.subject?.message}
            required
          />

          <div>
            <Textarea
              {...register('body')}
              label="Message"
              placeholder="Write your announcement here. Be clear and concise."
              error={errors.body?.message}
              required
              className="min-h-[180px]"
            />
            <p className="text-xs text-gray-400 text-right mt-1">
              {bodyValue.length}/2000
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => reset()}
            >
              Clear
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Send Announcement
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
