import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { hashPassword } from '@/lib/server/services/authService';

// One-time setup endpoint — creates tables and seeds admin user
// DELETE THIS ROUTE AFTER SETUP IS COMPLETE
export async function POST(request: NextRequest) {
  const { secret } = await request.json();

  // Protect with a secret to prevent abuse
  if (secret !== process.env.JWT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    results.push('DB connected');

    // Check if tables exist
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;

    if (!tables.some((t) => t.tablename === 'User')) {
      results.push('Tables not found — running db push...');

      // Use prisma db push via exec
      const { execSync } = await import('child_process');
      execSync('npx prisma db push --skip-generate --accept-data-loss', {
        cwd: process.cwd(),
        env: process.env as NodeJS.ProcessEnv,
        timeout: 30000,
      });
      results.push('prisma db push completed');
    } else {
      results.push(`Tables already exist: ${tables.map((t) => t.tablename).join(', ')}`);
    }

    // Seed admin user if not exists
    const adminExists = await prisma.user.findUnique({
      where: { email: 'admin@society.com' },
    });

    if (!adminExists) {
      const adminPassword = await hashPassword('Admin@123');
      await prisma.user.create({
        data: {
          email: 'admin@society.com',
          phone: '+919999999999',
          passwordHash: adminPassword,
          role: 'ADMIN',
          isActive: true,
        },
      });
      results.push('Admin user created: admin@society.com / Admin@123');
    } else {
      results.push('Admin user already exists');
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    return NextResponse.json(
      { success: false, results, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
