import { supabase } from "../lib/supabase";
import type {
  BudgetCategory,
  ExpenseReport,
  Organization,
  Profile,
  Reimbursement,
  SignupRequest,
  UserRole,
  Transaction
} from "../types/domain";

export interface TransactionFilters {
  from?: string;
  to?: string;
  categoryId?: string;
}

export const TreasuryDataService = {
  async getTransactions(
    organizationId: string,
    filters: TransactionFilters
  ): Promise<Transaction[]> {
    let query = supabase
      .from("transactions")
      .select("*")
      .eq("organization_id", organizationId)
      .order("occurred_on", { ascending: false });

    if (filters.from) {
      query = query.gte("occurred_on", filters.from);
    }
    if (filters.to) {
      query = query.lte("occurred_on", filters.to);
    }
    if (filters.categoryId) {
      query = query.eq("category_id", filters.categoryId);
    }

    const result = await query;
    if (result.error) {
      throw result.error;
    }
    return (result.data ?? []) as Transaction[];
  },

  async getBudgets(organizationId: string): Promise<BudgetCategory[]> {
    const result = await supabase
      .from("budget_categories")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name");

    if (result.error) {
      throw result.error;
    }
    return (result.data ?? []) as BudgetCategory[];
  },

  async updateBudgetLimit(categoryId: string, limitAmount: number): Promise<void> {
    const result = await supabase
      .from("budget_categories")
      .update({
        limit_amount: limitAmount
      })
      .eq("id", categoryId);

    if (result.error) {
      throw result.error;
    }
  },

  async getApprovalsQueue(organizationId: string): Promise<ExpenseReport[]> {
    const result = await supabase
      .from("expense_reports")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: true });

    if (result.error) {
      throw result.error;
    }
    return (result.data ?? []) as ExpenseReport[];
  },

  async getReimbursementsQueue(organizationId: string): Promise<ExpenseReport[]> {
    const result = await supabase
      .from("expense_reports")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "approved")
      .order("updated_at", { ascending: true });

    if (result.error) {
      throw result.error;
    }
    return (result.data ?? []) as ExpenseReport[];
  },

  async getReimbursements(organizationId: string): Promise<Reimbursement[]> {
    const result = await supabase
      .from("reimbursements")
      .select("*")
      .eq("organization_id", organizationId)
      .order("paid_at", { ascending: false });

    if (result.error) {
      throw result.error;
    }
    return (result.data ?? []) as Reimbursement[];
  },

  async getMembers(organizationId: string): Promise<Profile[]> {
    const result = await supabase
      .from("profiles")
      .select("*")
      .eq("organization_id", organizationId)
      .order("full_name");

    if (result.error) {
      throw result.error;
    }
    return (result.data ?? []) as Profile[];
  },

  async getOrganizationsForSignup(): Promise<Organization[]> {
    const result = await supabase
      .from("organizations")
      .select("id, name, currency, timezone, created_at")
      .order("name");

    if (result.error) {
      throw result.error;
    }
    return (result.data ?? []) as Organization[];
  },

  async getSignupRequests(organizationId: string): Promise<SignupRequest[]> {
    const result = await supabase
      .from("signup_requests")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (result.error) {
      throw result.error;
    }
    return (result.data ?? []) as SignupRequest[];
  },

  async approveSignupRequest(
    request: SignupRequest,
    role: UserRole,
    reviewerId: string
  ): Promise<void> {
    const profileInsert = await supabase.from("profiles").upsert(
      {
        id: request.user_id,
        organization_id: request.organization_id,
        full_name: request.full_name,
        role
      },
      {
        onConflict: "id"
      }
    );

    if (profileInsert.error) {
      throw profileInsert.error;
    }

    const requestUpdate = await supabase
      .from("signup_requests")
      .update({
        status: "approved",
        requested_role: role,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", request.id);

    if (requestUpdate.error) {
      throw requestUpdate.error;
    }
  },

  async rejectSignupRequest(
    request: SignupRequest,
    reviewerId: string,
    reviewNote?: string
  ): Promise<void> {
    const requestUpdate = await supabase
      .from("signup_requests")
      .update({
        status: "rejected",
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote ?? null
      })
      .eq("id", request.id);

    if (requestUpdate.error) {
      throw requestUpdate.error;
    }
  }
};
