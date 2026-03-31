import type { ExpenseStatus } from "../types/domain";

const validTransitions: Record<ExpenseStatus, ExpenseStatus[]> = {
  submitted: ["approved", "rejected"],
  approved: ["paid"],
  rejected: [],
  paid: []
};

export function canTransitionExpenseStatus(
  current: ExpenseStatus,
  next: ExpenseStatus
): boolean {
  return validTransitions[current].includes(next);
}

export function applyExpenseTransition(
  current: ExpenseStatus,
  next: ExpenseStatus
): ExpenseStatus {
  if (!canTransitionExpenseStatus(current, next)) {
    throw new Error(`Invalid expense status transition from ${current} to ${next}`);
  }
  return next;
}
