// ─── Auth ────────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'HOMEOWNER';

export interface User {
  id: string;
  email: string;
  phone: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Flat {
  id: string;
  unitNumber: string;
  floor: number;
  block: string;
  area: number;
  occupantName: string;
  isActive: boolean;
  ownerId: string;
  owner?: User;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface MeResponse {
  user: User;
  flat?: Flat;
}

// ─── Categories ──────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  month: number;
  year: number;
  categoryId: string;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

// ─── Bills ───────────────────────────────────────────────────────────────────

export type BillStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface FlatBill {
  id: string;
  flatId: string;
  flat?: Flat;
  expenseId: string;
  expense?: Expense;
  amount: number;
  paidAmount: number;
  amountDue?: number;
  amountPaid?: number;
  status: BillStatus;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Statement {
  flat: Flat;
  month: number;
  year: number;
  bills: FlatBill[];
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
}

// ─── Payments ────────────────────────────────────────────────────────────────

export type PaymentStatus = 'CREATED' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: string;
  flatBillId: string;
  flatBill?: FlatBill;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RazorpayOrder {
  razorpayOrderId: string;
  amount: number;
  currency: string;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType = 'BILL' | 'PAYMENT' | 'ANNOUNCEMENT' | 'REMINDER' | 'OVERDUE';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface PaginatedNotifications {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface MonthlyReport {
  month: number;
  year: number;
  totalExpenses: number;
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  expenses: Expense[];
  collectionRate: number;
}

export interface YearlyReport {
  year: number;
  totalExpenses: number;
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  monthlyBreakdown: Array<{
    month: number;
    totalExpenses: number;
    totalCollected: number;
    totalOutstanding: number;
  }>;
}

export interface OutstandingReport {
  flats: Array<{
    flat: Flat;
    totalDue: number;
    bills: FlatBill[];
  }>;
  grandTotal: number;
}

// ─── Reconciliation ──────────────────────────────────────────────────────────

export type ReconciliationStatus = 'MATCHED' | 'MISMATCH' | 'DUPLICATE' | 'MISSING' | 'RESOLVED';

export interface ReconciliationRecord {
  id: string;
  status: ReconciliationStatus;
  gatewayTransactionId?: string;
  gatewayAmount?: number;
  billAmount?: number;
  notes?: string;
  flatBillId?: string;
  flatBill?: FlatBill;
  createdAt: string;
  updatedAt: string;
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}
