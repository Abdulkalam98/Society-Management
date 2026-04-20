/**
 * Auth Agent Unit Tests
 * Tests core auth logic without hitting real DB by mocking Prisma.
 */

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    otpToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

import { prisma } from '../../src/lib/prisma';
import {
  hashPassword,
  verifyPassword,
  generateOtp,
  signAccessToken,
  isAccountLocked,
} from '../../src/agents/auth/authService';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('authService — password hashing', () => {
  it('should hash a password and verify it', async () => {
    const plain = 'MySecret@99';
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);
    expect(hash.startsWith('$2b$')).toBe(true);
    const valid = await verifyPassword(plain, hash);
    expect(valid).toBe(true);
  });

  it('should reject a wrong password', async () => {
    const hash = await hashPassword('CorrectHorseBattery');
    const valid = await verifyPassword('WrongPassword', hash);
    expect(valid).toBe(false);
  });
});

describe('authService — OTP generation', () => {
  it('should generate a 6-digit numeric OTP', () => {
    const otp = generateOtp();
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it('should generate different OTPs on successive calls', () => {
    const otps = new Set(Array.from({ length: 20 }, () => generateOtp()));
    // Extremely unlikely all 20 are identical
    expect(otps.size).toBeGreaterThan(1);
  });
});

describe('authService — JWT signing', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test_secret_at_least_32_chars_long_ok';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  it('should sign and return a JWT string', () => {
    const token = signAccessToken({ userId: 'user-123', role: 'ADMIN' });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });
});

describe('authService — account locking', () => {
  it('should return false when lockedUntil is null', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lockedUntil: null });
    const locked = await isAccountLocked('user-1');
    expect(locked).toBe(false);
  });

  it('should return true when lockedUntil is in the future', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lockedUntil: future });
    const locked = await isAccountLocked('user-1');
    expect(locked).toBe(true);
  });

  it('should return false when lockedUntil is in the past', async () => {
    const past = new Date(Date.now() - 60 * 60 * 1000);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lockedUntil: past });
    const locked = await isAccountLocked('user-1');
    expect(locked).toBe(false);
  });
});
