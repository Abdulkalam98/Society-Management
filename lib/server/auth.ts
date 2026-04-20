import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { JwtPayload } from '@/lib/server/types';
import { createError } from '@/lib/server/errors';

/**
 * Reads the Authorization header, verifies the JWT, and returns the payload.
 * Throws a 401 error if the token is missing or invalid.
 */
export function authenticateRequest(request: NextRequest): JwtPayload {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw createError('Missing or invalid Authorization header', 401);
  }

  const token = header.split(' ')[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
  } catch {
    throw createError('Token is invalid or expired', 401);
  }
}

/** Throws 403 if the user is not an ADMIN. */
export function requireAdmin(user: JwtPayload): void {
  if (user.role !== 'ADMIN') {
    throw createError('Admin access required', 403);
  }
}

/** Throws 403 if the user is not a HOMEOWNER. */
export function requireHomeowner(user: JwtPayload): void {
  if (user.role !== 'HOMEOWNER') {
    throw createError('Homeowner access required', 403);
  }
}

/** Throws 403 if a homeowner tries to access another flat's data. */
export function scopeToFlat(user: JwtPayload, flatId: string): void {
  if (user.role === 'HOMEOWNER' && flatId && flatId !== user.flatId) {
    throw createError('Access to another unit is not permitted', 403);
  }
}
