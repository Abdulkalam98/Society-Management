// Shared domain types used across all agents

export interface JwtPayload {
  userId: string;
  role: 'ADMIN' | 'HOMEOWNER';
  flatId?: string;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface DateRangeQuery {
  month?: number;
  year?: number;
  fromDate?: string;
  toDate?: string;
}

export type AgentIntent =
  | 'create_expense'
  | 'create_category'
  | 'update_billing_config'
  | 'manage_flat'
  | 'view_statement'
  | 'view_dues'
  | 'pay_dues'
  | 'process_payment'
  | 'verify_payment'
  | 'send_reminder'
  | 'send_announcement'
  | 'generate_report'
  | 'password_reset'
  | 'login'
  | 'logout'
  | 'unclear';

export interface OrchestratorPayload {
  intent: AgentIntent;
  user_role: 'admin' | 'homeowner';
  delegate_to: string | null;
  payload: {
    user_id: string;
    timestamp: string;
    original_request: string;
    extracted_params: Record<string, unknown>;
  };
  follow_up_agents: string[];
  clarification_required?: boolean;
  clarification_question?: string;
}
