import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';

export async function GET() {
  try {
    // Test raw DB connectivity
    await prisma.$queryRaw`SELECT 1 as connected`;

    // Check if tables exist
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;

    const tableNames = tables.map((t) => t.tablename);

    // List all users (without sensitive data)
    let userCount = 0;
    let users: { id: string; email: string; role: string; phone: string; createdAt: Date }[] = [];
    if (tableNames.includes('User')) {
      userCount = await prisma.user.count();
      users = await prisma.user.findMany({
        select: { id: true, email: true, role: true, phone: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      tables: tableNames,
      tablesCount: tableNames.length,
      userCount,
      users,
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
