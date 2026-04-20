// lib/api.ts — Centralized API utility with auth token injection

const API_BASE = '/api';

// ─── Token Storage ────────────────────────────────────────────────────────────

// accessToken lives only in module-level memory (cleared on page refresh).
// refreshToken persists in localStorage so sessions survive refresh.
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setRefreshToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('refreshToken', token);
  } else {
    localStorage.removeItem('refreshToken');
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

export function clearTokens() {
  _accessToken = null;
  setRefreshToken(null);
}

// ─── Core Fetch ───────────────────────────────────────────────────────────────

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
  rawResponse?: boolean;
}

class ApiError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export { ApiError };

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, params, skipAuth = false, rawResponse = false, headers: extraHeaders, ...restOptions } = options;

  // Build URL with query params
  const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  // Build headers
  const headers: HeadersInit = {
    ...(body !== undefined && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...extraHeaders,
  };

  if (!skipAuth && _accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${_accessToken}`;
  }

  const response = await fetch(url.toString(), {
    ...restOptions,
    headers,
    body: body !== undefined
      ? (body instanceof FormData ? body : JSON.stringify(body))
      : undefined,
  });

  // Handle blob responses (CSV/PDF downloads)
  if (rawResponse) {
    return response as unknown as T;
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  let data: unknown;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorData = data as Record<string, unknown>;
    const message =
      (errorData?.error as string) ||
      (errorData?.message as string) ||
      (typeof data === 'string' ? data : 'An error occurred');
    const code = errorData?.code as string | undefined;
    throw new ApiError(message, response.status, code);
  }

  // Auto-unwrap { success: true, data: ... } envelope used by all API routes
  if (
    data &&
    typeof data === 'object' &&
    'success' in (data as Record<string, unknown>) &&
    'data' in (data as Record<string, unknown>)
  ) {
    return (data as Record<string, unknown>).data as T;
  }

  return data as T;
}

// ─── HTTP Methods ─────────────────────────────────────────────────────────────

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'GET', ...options }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'POST', body, ...options }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'PATCH', body, ...options }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'PUT', body, ...options }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'DELETE', ...options }),
};

// ─── Auth Endpoints ───────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { email: string; phone: string; password: string; role: string }) =>
    api.post('/auth/register', data, { skipAuth: true }),

  login: (data: { email: string; password: string }) =>
    api.post<{ accessToken: string; refreshToken: string; user: import('@/types').User }>(
      '/auth/login',
      data,
      { skipAuth: true }
    ),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  initiatePasswordReset: (email: string) =>
    api.post('/auth/password-reset/initiate', { email }, { skipAuth: true }),

  completePasswordReset: (data: { email: string; otp: string; newPassword: string }) =>
    api.post('/auth/password-reset/complete', data, { skipAuth: true }),

  me: () => api.get<import('@/types').MeResponse>('/auth/me'),
};

// ─── Admin Endpoints ──────────────────────────────────────────────────────────

export const adminApi = {
  // Categories
  createCategory: (data: { name: string; description?: string }) =>
    api.post<import('@/types').Category>('/admin/categories', data),

  getCategories: (params?: { includeInactive?: boolean }) =>
    api.get<import('@/types').Category[]>('/admin/categories', { params }),

  updateCategory: (id: string, data: { name?: string; description?: string; isActive?: boolean }) =>
    api.patch<import('@/types').Category>(`/admin/categories/${id}`, data),

  // Expenses
  createExpense: (data: {
    title: string;
    description?: string;
    amount: number;
    month: number;
    year: number;
    categoryId: string;
  }) => api.post<import('@/types').Expense>('/admin/expenses', data),

  getExpenses: (params?: { month?: number; year?: number; categoryId?: string }) =>
    api.get<import('@/types').Expense[]>('/admin/expenses', { params }),

  getExpense: (id: string) =>
    api.get<import('@/types').Expense>(`/admin/expenses/${id}`),

  // Flats
  createFlat: (data: {
    unitNumber: string;
    floor: number;
    block: string;
    area: number;
    occupantName: string;
    ownerId: string;
  }) => api.post<import('@/types').Flat>('/admin/flats', data),

  getFlats: (params?: { includeInactive?: boolean }) =>
    api.get<import('@/types').Flat[]>('/admin/flats', { params }),

  getFlat: (id: string) =>
    api.get<import('@/types').Flat>(`/admin/flats/${id}`),

  updateFlat: (id: string, data: Partial<import('@/types').Flat>) =>
    api.patch<import('@/types').Flat>(`/admin/flats/${id}`, data),
};

// ─── Expense Endpoints ────────────────────────────────────────────────────────

export const expenseApi = {
  splitExpense: (expenseId: string) =>
    api.post(`/expenses/${expenseId}/split`),

  getDues: () =>
    api.get<import('@/types').FlatBill[]>('/expenses/dues'),

  getStatement: (flatId: string, params?: { month?: number; year?: number }) =>
    api.get<import('@/types').Statement>(`/expenses/statement/${flatId}`, { params }),

  markOverdue: () =>
    api.post('/expenses/mark-overdue'),
};

// ─── Payment Endpoints ────────────────────────────────────────────────────────

export const paymentApi = {
  createOrder: (flatBillId: string) =>
    api.post<import('@/types').RazorpayOrder>('/payments/order', { flatBillId }),

  verifyPayment: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => api.post('/payments/verify', data),

  getReceipt: (paymentId: string) =>
    api.get<import('@/types').Payment>(`/payments/${paymentId}/receipt`),

  getStatus: (orderId: string) =>
    api.get<import('@/types').Payment>(`/payments/status/${orderId}`),
};

// ─── Notification Endpoints ───────────────────────────────────────────────────

export const notificationApi = {
  announce: (data: { subject: string; body: string }) =>
    api.post('/notifications/announce', data),

  remind: (flatId: string) =>
    api.post(`/notifications/remind/${flatId}`),

  getMyNotifications: (params?: { page?: number; limit?: number }) =>
    api.get<import('@/types').PaginatedNotifications>('/notifications/my', { params }),

  markRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),
};

// ─── Report Endpoints ─────────────────────────────────────────────────────────

export const reportApi = {
  getMonthly: (params: { month: number; year: number }) =>
    api.get<import('@/types').MonthlyReport>('/reports/monthly', { params }),

  getYearly: (params: { year: number }) =>
    api.get<import('@/types').YearlyReport>('/reports/yearly', { params }),

  getOutstanding: () =>
    api.get<import('@/types').OutstandingReport>('/reports/outstanding'),

  downloadCsv: (params: { month: number; year: number }) =>
    api.get<Response>('/reports/monthly/csv', { params, rawResponse: true }),

  downloadPdf: (params: { month: number; year: number }) =>
    api.get<Response>('/reports/monthly/pdf', { params, rawResponse: true }),
};

// ─── Reconciliation Endpoints ─────────────────────────────────────────────────

export const reconciliationApi = {
  run: (data: { startDate: string; endDate: string }) =>
    api.post('/reconciliation/run', data),

  getStatus: (params?: { status?: string }) =>
    api.get<import('@/types').ReconciliationRecord[]>('/reconciliation/status', { params }),

  resolve: (id: string, notes: string) =>
    api.patch(`/reconciliation/${id}/resolve`, { notes }),

  getAudit: (params?: { entity?: string; entityId?: string }) =>
    api.get('/reconciliation/audit', { params }),
};
