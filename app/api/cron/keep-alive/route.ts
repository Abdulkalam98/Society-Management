import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';

// This cron job runs daily to prevent Supabase from auto-pausing
// the database after 7 days of inactivity (free tier limitation).

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron (not a random caller)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
