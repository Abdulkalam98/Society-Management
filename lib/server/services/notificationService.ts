import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { prisma } from '@/lib/server/prisma';

// ─── Template Builders ────────────────────────────────────────────────────────

export interface NotificationContext {
  recipientName: string;
  unitNumber: string;
  amount?: number;
  month?: string;
  paymentId?: string;
  message?: string;
  societyName?: string;
}

function buildBillGeneratedEmail(ctx: NotificationContext) {
  const society = ctx.societyName ?? process.env.SOCIETY_NAME ?? 'Society';
  return {
    subject: `[${society}] Your bill for ${ctx.month} is ready`,
    html: `
      <h2>${society}</h2>
      <p>Dear ${ctx.recipientName},</p>
      <p>Your maintenance bill for <strong>${ctx.month}</strong> has been generated.</p>
      <p><strong>Flat:</strong> ${ctx.unitNumber}</p>
      <p><strong>Amount Due:</strong> ₹${ctx.amount}</p>
      <p>Please log in to your portal to view and pay.</p>
      <br/><p>Regards,<br/>${society}</p>
    `,
  };
}

function buildPaymentReceivedEmail(ctx: NotificationContext) {
  const society = ctx.societyName ?? process.env.SOCIETY_NAME ?? 'Society';
  return {
    subject: `[${society}] Payment of ₹${ctx.amount} received`,
    html: `
      <h2>${society}</h2>
      <p>Dear ${ctx.recipientName},</p>
      <p>We have received your payment of <strong>₹${ctx.amount}</strong> for flat ${ctx.unitNumber}.</p>
      <p><strong>Payment ID:</strong> ${ctx.paymentId}</p>
      <p>Your receipt is available in the portal.</p>
      <br/><p>Regards,<br/>${society}</p>
    `,
  };
}

function buildReminderEmail(ctx: NotificationContext) {
  const society = ctx.societyName ?? process.env.SOCIETY_NAME ?? 'Society';
  return {
    subject: `[${society}] Reminder: Outstanding dues for flat ${ctx.unitNumber}`,
    html: `
      <h2>${society}</h2>
      <p>Dear ${ctx.recipientName},</p>
      <p>This is a reminder that you have outstanding dues of <strong>₹${ctx.amount}</strong> for flat ${ctx.unitNumber}.</p>
      <p>Please log in to pay at your earliest convenience.</p>
      <br/><p>Regards,<br/>${society}</p>
    `,
  };
}

function buildAnnouncementEmail(ctx: NotificationContext) {
  const society = ctx.societyName ?? process.env.SOCIETY_NAME ?? 'Society';
  return {
    subject: `[${society}] Announcement`,
    html: `
      <h2>${society}</h2>
      <p>Dear ${ctx.recipientName},</p>
      <p>${ctx.message}</p>
      <br/><p>Regards,<br/>${society}</p>
    `,
  };
}

// ─── Email Sender ─────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[notification-agent] SENDGRID_API_KEY not set — skipping email');
    return;
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  await sgMail.send({
    to,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL ?? 'noreply@society.com',
      name: process.env.SENDGRID_FROM_NAME ?? 'Society Management',
    },
    subject,
    html,
  });
}

// ─── SMS Sender ───────────────────────────────────────────────────────────────

async function sendSms(to: string, body: string): Promise<void> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('[notification-agent] Twilio credentials not set — skipping SMS');
    return;
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
}

// ─── Notification Dispatcher ──────────────────────────────────────────────────

export type NotificationTypeKey = 'BILL_GENERATED' | 'PAYMENT_RECEIVED' | 'ANNOUNCEMENT' | 'REMINDER' | 'PAYMENT_FAILED';

export async function sendNotificationToUser(params: {
  userId: string;
  type: NotificationTypeKey;
  context: NotificationContext;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { email: true, phone: true },
  });
  if (!user) return;

  let subject = '';
  let html = '';
  let smsBody = '';

  switch (params.type) {
    case 'BILL_GENERATED': {
      const email = buildBillGeneratedEmail(params.context);
      subject = email.subject;
      html = email.html;
      smsBody = `Your bill for ${params.context.month} is ₹${params.context.amount}. Log in to pay. - ${params.context.societyName ?? 'Society'}`;
      break;
    }
    case 'PAYMENT_RECEIVED': {
      const email = buildPaymentReceivedEmail(params.context);
      subject = email.subject;
      html = email.html;
      smsBody = `Payment of ₹${params.context.amount} received for flat ${params.context.unitNumber}. Ref: ${params.context.paymentId}`;
      break;
    }
    case 'REMINDER': {
      const email = buildReminderEmail(params.context);
      subject = email.subject;
      html = email.html;
      smsBody = `Reminder: You have dues of ₹${params.context.amount} for flat ${params.context.unitNumber}. Please pay soon.`;
      break;
    }
    case 'ANNOUNCEMENT': {
      const email = buildAnnouncementEmail(params.context);
      subject = email.subject;
      html = email.html;
      smsBody = params.context.message ?? 'Society announcement — please check your email.';
      break;
    }
    case 'PAYMENT_FAILED': {
      subject = 'Payment Failed';
      html = `<p>Dear ${params.context.recipientName}, your payment of ₹${params.context.amount} failed. Please retry.</p>`;
      smsBody = `Payment of ₹${params.context.amount} failed. Please retry via the portal.`;
      break;
    }
  }

  // Fire both channels; record each in DB
  const emailRecord = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type as never,
      channel: 'EMAIL',
      subject,
      body: html,
    },
  });

  const smsRecord = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type as never,
      channel: 'SMS',
      subject,
      body: smsBody,
    },
  });

  // Send email
  try {
    await sendEmail(user.email, subject, html);
    await prisma.notification.update({ where: { id: emailRecord.id }, data: { sentAt: new Date() } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.notification.update({ where: { id: emailRecord.id }, data: { failedAt: new Date(), errorMsg: msg } });
    console.error('[notification-agent] Email failed:', msg);
  }

  // Send SMS
  try {
    await sendSms(user.phone, smsBody);
    await prisma.notification.update({ where: { id: smsRecord.id }, data: { sentAt: new Date() } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.notification.update({ where: { id: smsRecord.id }, data: { failedAt: new Date(), errorMsg: msg } });
    console.error('[notification-agent] SMS failed:', msg);
  }
}

// ─── Broadcast to All Active Flats ───────────────────────────────────────────

export async function broadcastAnnouncement(message: string): Promise<{ sent: number; failed: number }> {
  const flats = await prisma.flat.findMany({
    where: { isActive: true },
    include: { owner: { select: { id: true } } },
  });

  let sent = 0;
  let failed = 0;

  for (const flat of flats) {
    try {
      await sendNotificationToUser({
        userId: flat.owner.id,
        type: 'ANNOUNCEMENT',
        context: {
          recipientName: flat.occupantName,
          unitNumber: flat.unitNumber,
          message,
        },
      });
      sent++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}

// ─── Reminder for a Specific Flat ────────────────────────────────────────────

export async function sendDueReminder(flatId: string): Promise<void> {
  const flat = await prisma.flat.findUnique({
    where: { id: flatId },
    include: {
      owner: { select: { id: true } },
      flatBills: { where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } },
    },
  });
  if (!flat) return;

  const totalDue = flat.flatBills.reduce((sum, b) => sum + (b.amountDue - b.amountPaid), 0);

  await sendNotificationToUser({
    userId: flat.owner.id,
    type: 'REMINDER',
    context: {
      recipientName: flat.occupantName,
      unitNumber: flat.unitNumber,
      amount: totalDue,
    },
  });
}
