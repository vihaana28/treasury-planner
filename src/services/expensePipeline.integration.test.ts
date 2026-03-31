import { applyExpenseTransition } from "./expenseWorkflow";
import {
  canAccessOrganization,
  canApproveExpense,
  canMarkReimbursementPaid
} from "../utils/permissions";
import type { ExpenseStatus, UserRole } from "../types/domain";

function performApproval(role: UserRole, currentStatus: ExpenseStatus): ExpenseStatus {
  if (!canApproveExpense(role)) {
    throw new Error("Role cannot approve");
  }
  return applyExpenseTransition(currentStatus, "approved");
}

function performPayment(role: UserRole, currentStatus: ExpenseStatus): ExpenseStatus {
  if (!canMarkReimbursementPaid(role)) {
    throw new Error("Role cannot mark paid");
  }
  return applyExpenseTransition(currentStatus, "paid");
}

describe("expense pipeline integration", () => {
  it("enforces role access for approvals", () => {
    expect(() => performApproval("member", "submitted")).toThrow(/Role cannot approve/);
    expect(performApproval("treasurer", "submitted")).toBe("approved");
    expect(performApproval("admin", "submitted")).toBe("approved");
  });

  it("supports end-to-end submitted -> approved -> paid lifecycle", () => {
    const approved = performApproval("treasurer", "submitted");
    const paid = performPayment("treasurer", approved);
    expect(paid).toBe("paid");
  });

  it("guards organization isolation checks", () => {
    expect(canAccessOrganization("org-a", "org-a")).toBe(true);
    expect(canAccessOrganization("org-a", "org-b")).toBe(false);
  });
});
