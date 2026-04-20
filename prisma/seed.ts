/**
 * Prisma Seed Script
 * Run via: npm run db:seed
 *
 * Creates:
 *  - 1 admin user
 *  - 3 homeowner users
 *  - 3 flats linked to homeowners
 *  - 3 expense categories
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminHash = await bcrypt.hash('Admin@1234', 12);
  const ownerHash = await bcrypt.hash('Owner@1234', 12);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@society.com' },
    update: {},
    create: {
      email: 'admin@society.com',
      phone: '+919000000000',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });
  console.log('Admin created:', admin.email);

  // Homeowner 1
  const owner1 = await prisma.user.upsert({
    where: { email: 'owner.a101@society.com' },
    update: {},
    create: {
      email: 'owner.a101@society.com',
      phone: '+919000000001',
      passwordHash: ownerHash,
      role: 'HOMEOWNER',
    },
  });

  // Homeowner 2
  const owner2 = await prisma.user.upsert({
    where: { email: 'owner.a102@society.com' },
    update: {},
    create: {
      email: 'owner.a102@society.com',
      phone: '+919000000002',
      passwordHash: ownerHash,
      role: 'HOMEOWNER',
    },
  });

  // Homeowner 3
  const owner3 = await prisma.user.upsert({
    where: { email: 'owner.b201@society.com' },
    update: {},
    create: {
      email: 'owner.b201@society.com',
      phone: '+919000000003',
      passwordHash: ownerHash,
      role: 'HOMEOWNER',
    },
  });

  // Flats
  const flatA101 = await prisma.flat.upsert({
    where: { unitNumber: 'A-101' },
    update: {},
    create: { unitNumber: 'A-101', floor: 1, block: 'A', area: 850, occupantName: 'Rahul Sharma', ownerId: owner1.id },
  });

  const flatA102 = await prisma.flat.upsert({
    where: { unitNumber: 'A-102' },
    update: {},
    create: { unitNumber: 'A-102', floor: 1, block: 'A', area: 900, occupantName: 'Priya Mehta', ownerId: owner2.id },
  });

  const flatB201 = await prisma.flat.upsert({
    where: { unitNumber: 'B-201' },
    update: {},
    create: { unitNumber: 'B-201', floor: 2, block: 'B', area: 1200, occupantName: 'Amit Verma', ownerId: owner3.id },
  });

  console.log('Flats created:', flatA101.unitNumber, flatA102.unitNumber, flatB201.unitNumber);

  // Categories
  await prisma.expenseCategory.upsert({ where: { name: 'Maintenance' }, update: {}, create: { name: 'Maintenance', description: 'Monthly maintenance charges' } });
  await prisma.expenseCategory.upsert({ where: { name: 'Electricity' }, update: {}, create: { name: 'Electricity', description: 'Common area electricity bill' } });
  await prisma.expenseCategory.upsert({ where: { name: 'Security' }, update: {}, create: { name: 'Security', description: 'Security guard services' } });
  await prisma.expenseCategory.upsert({ where: { name: 'Water' }, update: {}, create: { name: 'Water', description: 'Water supply charges' } });

  console.log('Categories created.');
  console.log('\nSeed complete!');
  console.log('Admin credentials: admin@society.com / Admin@1234');
  console.log('Owner credentials: owner.a101@society.com / Owner@1234');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
