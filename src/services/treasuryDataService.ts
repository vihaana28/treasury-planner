import { supabase } from "../lib/supabase";
import type { BudgetCategory, ExpenseReport, Profile, Reimbursement, Transaction } from "../types/domain";

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
  }
};
