import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';

export async function GET() {
  try {
    // Test raw DB connectivity
    const result = await prisma.$queryRaw`SELECT 1 as connected`;

    // Check if tables exist
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;

    const tableNames = tables.map((t) => t.tablename);

    // Check user count if User table exists
    let userCount = 0;
    if (tableNames.includes('User')) {
      userCount = await prisma.user.count();
    }

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      tables: tableNames,
      tablesCount: tableNames.length,
      userCount,
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DIRECT_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'failed',
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
