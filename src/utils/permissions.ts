import type { ExpenseStatus, UserRole } from "../types/domain";

export function canViewApprovals(role: UserRole): boolean {
  return role === "admin" || role === "treasurer";
}

export function canApproveExpense(role: UserRole): boolean {
  return role === "admin" || role === "treasurer";
}

export function canMarkReimbursementPaid(role: UserRole): boolean {
  return role === "admin" || role === "treasurer";
}

export function canManageMembers(role: UserRole): boolean {
  return role === "admin" || role === "treasurer";
}

export function canAccessExpenseReport(role: UserRole): boolean {
  return role === "admin" || role === "treasurer" || role === "member";
}

export function canTransitionToPaid(
  role: UserRole,
  currentStatus: ExpenseStatus
): boolean {
  return canMarkReimbursementPaid(role) && currentStatus === "approved";
}

export function canAccessOrganization(
  userOrganizationId: string,
  resourceOrganizationId: string
): boolean {
  return userOrganizationId === resourceOrganizationId;
}
