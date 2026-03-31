import { calculateDashboardKpis } from "./kpi";
import type { ExpenseReport, Transaction } from "../types/domain";

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: "txn-1",
    organization_id: "org-1",
    account_id: null,
    category_id: null,
    direction: "expense",
    amount: 100,
    description: "Test",
    occurred_on: "2026-03-01",
    created_by: "user-1",
    created_at: "2026-03-01T00:00:00.000Z",
    ...overrides
  };
}

function report(overrides: Partial<ExpenseReport>): ExpenseReport {
  return {
    id: "rep-1",
    organization_id: "org-1",
    submitted_by: "user-1",
    title: "Report",
    note: null,
    status: "submitted",
    total_amount: 40,
    submitted_at: "2026-03-01T00:00:00.000Z",
    updated_at: "2026-03-01T00:00:00.000Z",
    ...overrides
  };
}

describe("calculateDashboardKpis", () => {
  it("calculates cash position and burn rate", () => {
    const kpis = calculateDashboardKpis({
      transactions: [
        transaction({ direction: "income", amount: 500 }),
        transaction({ id: "txn-2", direction: "expense", amount: 120 }),
        transaction({ id: "txn-3", direction: "expense", amount: 80 })
      ],
      pendingApprovals: [report({ id: "rep-a", status: "submitted" })],
      approvedPendingPayment: [report({ id: "rep-b", status: "approved" })],
      budgetSnapshot: {
        limit: 1000,
        spent: 700
      }
    });

    expect(kpis.cashPosition).toBe(300);
    expect(kpis.monthToDateIncome).toBe(500);
    expect(kpis.monthToDateExpense).toBe(200);
    expect(kpis.pendingApprovals).toBe(1);
    expect(kpis.pendingReimbursements).toBe(1);
    expect(kpis.budgetVariance).toBe(300);
    expect(kpis.burnRate).toBeGreaterThan(0);
  });
});
