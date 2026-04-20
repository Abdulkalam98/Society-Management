import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '@/lib/server/prisma';
import { JwtPayload } from '@/lib/server/types';
import { createError } from '@/lib/server/errors';

const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MINUTES = 30;
const OTP_LENGTH = 6;

// ─── Password Helpers ─────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── JWT Helpers ──────────────────────────────────────────────────────────────

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  } as jwt.SignOptions);
}

export function signRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

// ─── OTP Helpers ──────────────────────────────────────────────────────────────

export function generateOtp(): string {
  return Array.from({ length: OTP_LENGTH }, () => Math.floor(Math.random() * 10)).join('');
}

export async function createOtp(userId: string): Promise<string> {
  const token = generateOtp();
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES ?? '10', 10);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  await prisma.otpToken.create({ data: { userId, token, expiresAt } });
  return token;
}

export async function validateOtp(userId: string, token: string): Promise<boolean> {
  const record = await prisma.otpToken.findFirst({
    where: { userId, token, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) return false;

  await prisma.otpToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return true;
}

// ─── Account Locking ─────────────────────────────────────────────────────────

export async function recordFailedLogin(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { failedLogins: true } });
  if (!user) return;

  const newCount = user.failedLogins + 1;
  const lockedUntil =
    newCount >= MAX_FAILED_LOGINS
      ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
      : null;

  await prisma.user.update({
    where: { id: userId },
    data: { failedLogins: newCount, ...(lockedUntil ? { lockedUntil } : {}) },
  });
}

export async function resetFailedLogins(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
}

export async function isAccountLocked(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lockedUntil: true },
  });
  if (!user?.lockedUntil) return false;
  return user.lockedUntil > new Date();
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { flat: { select: { id: true } } },
  });

  if (!user) throw createError('Invalid credentials', 401);
  if (!user.isActive) throw createError('Account is deactivated', 403);

  if (await isAccountLocked(user.id)) {
    throw createError('Account locked due to too many failed attempts. Try again later.', 423);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await recordFailedLogin(user.id);
    throw createError('Invalid credentials', 401);
  }

  await resetFailedLogins(user.id);

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    flatId: user.flat?.id,
  });

  const refreshTokenValue = signRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: { id: user.id, email: user.email, role: user.role, flatId: user.flat?.id },
  };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutUser(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ─── Password Reset ───────────────────────────────────────────────────────────

export async function initiatePasswordReset(email: string): Promise<{ userId: string; otp: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw createError('No account found with that email', 404);

  const otp = await createOtp(user.id);
  return { userId: user.id, otp };
}

export async function completePasswordReset(
  userId: string,
  otp: string,
  newPassword: string
): Promise<void> {
  const valid = await validateOtp(userId, otp);
  if (!valid) throw createError('Invalid or expired OTP', 400);

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
