import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function createError(message: string, statusCode: number): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
}

export function apiErrorResponse(err: unknown): NextResponse {
  // Zod validation errors
  if (err instanceof ZodError) {
    return NextResponse.json(
      { success: false, error: 'Validation error', details: err.errors },
      { status: 400 }
    );
  }

  // Known operational errors
  const appErr = err as AppError;
  if (appErr.statusCode && appErr.isOperational) {
    return NextResponse.json(
      { success: false, error: appErr.message },
      { status: appErr.statusCode }
    );
  }

  // Prisma unique constraint violations
  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  ) {
    return NextResponse.json(
      { success: false, error: 'A record with that value already exists' },
      { status: 409 }
    );
  }

  // Unexpected errors
  if (process.env.NODE_ENV !== 'production') {
    console.error('[api-error]', err);
  }

  return NextResponse.json(
    { success: false, error: 'Internal server error' },
    { status: 500 }
  );
}
