import type { DashboardKpis, ExpenseReport, Transaction } from "../types/domain";

interface BudgetSnapshot {
  limit: number;
  spent: number;
}

export function calculateDashboardKpis(params: {
  transactions: Transaction[];
  pendingApprovals: ExpenseReport[];
  approvedPendingPayment: ExpenseReport[];
  budgetSnapshot: BudgetSnapshot;
}): DashboardKpis {
  const monthToDateIncome = params.transactions
    .filter((transaction) => transaction.direction === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const monthToDateExpense = params.transactions
    .filter((transaction) => transaction.direction === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const cashPosition = monthToDateIncome - monthToDateExpense;
  const burnRate = monthToDateExpense / Math.max(1, new Date().getDate());
  const budgetVariance = params.budgetSnapshot.limit - params.budgetSnapshot.spent;

  return {
    cashPosition,
    monthToDateIncome,
    monthToDateExpense,
    burnRate,
    budgetVariance,
    pendingApprovals: params.pendingApprovals.length,
    pendingReimbursements: params.approvedPendingPayment.length
  };
}
