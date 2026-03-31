export type UserRole = "admin" | "treasurer" | "member";

export type ExpenseStatus = "submitted" | "approved" | "rejected" | "paid";
export type SignupRequestStatus = "pending" | "approved" | "rejected";

export interface Organization {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  created_at: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Account {
  id: string;
  organization_id: string;
  name: string;
  account_type: "cash" | "checking" | "savings";
  balance: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  organization_id: string;
  account_id: string | null;
  category_id: string | null;
  direction: "income" | "expense";
  amount: number;
  description: string;
  occurred_on: string;
  created_by: string;
  created_at: string;
}

export interface BudgetPeriod {
  id: string;
  organization_id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface BudgetCategory {
  id: string;
  organization_id: string;
  period_id: string;
  name: string;
  limit_amount: number;
  spent_amount: number;
  alert_threshold: number;
  created_at: string;
}

export interface ExpenseReport {
  id: string;
  organization_id: string;
  submitted_by: string;
  title: string;
  note: string | null;
  status: ExpenseStatus;
  total_amount: number;
  submitted_at: string;
  updated_at: string;
}

export interface ExpenseItem {
  id: string;
  report_id: string;
  organization_id: string;
  expense_date: string;
  category: string;
  amount: number;
  description: string;
  receipt_url: string | null;
}

export interface ApprovalAction {
  id: string;
  organization_id: string;
  report_id: string;
  actor_id: string;
  decision: "approve" | "reject";
  note: string | null;
  created_at: string;
}

export interface Reimbursement {
  id: string;
  organization_id: string;
  report_id: string;
  amount: number;
  method: string;
  reference: string | null;
  paid_at: string;
  created_at: string;
}

export interface Alert {
  id: string;
  organization_id: string;
  type: "budget" | "workflow" | "system";
  severity: "info" | "warning" | "critical";
  message: string;
  related_entity: string | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface DashboardKpis {
  cashPosition: number;
  monthToDateIncome: number;
  monthToDateExpense: number;
  burnRate: number;
  budgetVariance: number;
  pendingApprovals: number;
  pendingReimbursements: number;
}

export interface ExpenseItemInput {
  expenseDate: string;
  category: string;
  amount: number;
  description: string;
  receiptUrl?: string;
}

export interface SubmitExpensePayload {
  organizationId: string;
  title: string;
  note?: string;
  items: ExpenseItemInput[];
}

export interface ApprovalPayload {
  organizationId: string;
  reportId: string;
  decision: "approve" | "reject";
  note?: string;
}

export interface PaymentMeta {
  organizationId: string;
  reportId: string;
  method: string;
  paidAt: string;
  reference?: string;
}

export interface SignupRequest {
  id: string;
  user_id: string;
  organization_id: string;
  full_name: string;
  email: string;
  requested_role: UserRole;
  status: SignupRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}
