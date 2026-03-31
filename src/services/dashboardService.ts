import { supabase } from "../lib/supabase";
import type { Alert, BudgetCategory, DashboardKpis, DateRange, ExpenseReport, Transaction } from "../types/domain";
import { calculateDashboardKpis } from "./kpi";

export const DashboardService = {
  async getKpis(organizationId: string, dateRange: DateRange): Promise<DashboardKpis> {
    const [transactionsResult, budgetsResult, reportsResult] = await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("occurred_on", dateRange.from)
        .lte("occurred_on", dateRange.to),
      supabase
        .from("budget_categories")
        .select("*")
        .eq("organization_id", organizationId),
      supabase
        .from("expense_reports")
        .select("*")
        .eq("organization_id", organizationId)
    ]);

    if (transactionsResult.error) {
      throw transactionsResult.error;
    }
    if (budgetsResult.error) {
      throw budgetsResult.error;
    }
    if (reportsResult.error) {
      throw reportsResult.error;
    }

    const transactions = (transactionsResult.data ?? []) as Transaction[];
    const budgets = (budgetsResult.data ?? []) as BudgetCategory[];
    const reports = (reportsResult.data ?? []) as ExpenseReport[];

    const budgetSnapshot = budgets.reduce(
      (accumulator, budget) => {
        accumulator.limit += budget.limit_amount;
        accumulator.spent += budget.spent_amount;
        return accumulator;
      },
      { limit: 0, spent: 0 }
    );

    return calculateDashboardKpis({
      transactions,
      pendingApprovals: reports.filter((report) => report.status === "submitted"),
      approvedPendingPayment: reports.filter((report) => report.status === "approved"),
      budgetSnapshot
    });
  },

  async getAlerts(organizationId: string): Promise<Alert[]> {
    const alertsResult = await supabase
      .from("alerts")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (alertsResult.error) {
      throw alertsResult.error;
    }

    return (alertsResult.data ?? []) as Alert[];
  }
};
