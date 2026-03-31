import type { BudgetCategory, Transaction } from "../types/domain";

export interface BucketTotal {
  id: string;
  label: string;
  amount: number;
  share: number;
}

export function sanitizeTransactionDescription(description: string): string {
  return description
    .replace(/^\[[^\]]*\]\s*/i, "")
    .replace(/^main\s+row\s*\d+\s*:\s*/i, "")
    .replace(/^row\s*\d+\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSectionFromDescription(description: string): string {
  const cleaned = sanitizeTransactionDescription(description);
  const marker = cleaned.indexOf(": ");
  if (marker < 0) {
    return "Uncategorized";
  }
  const payload = cleaned.slice(marker + 2);
  if (payload.startsWith("Summary:")) {
    return "Total Costs";
  }
  const section = payload.split(":")[0]?.trim();
  return section || "Uncategorized";
}

export function getLeaderFromDescription(description: string): string {
  const section = parseSectionFromDescription(description);
  const leadershipLabels = [
    "Recruitment Director",
    "BDD",
    "Secretary",
    "Risk Manager",
    "EVP",
    "IVP",
    "Finance Director",
    "EPD"
  ];
  if (leadershipLabels.includes(section)) {
    return section;
  }
  return "Chapter Operations";
}

export function buildCategorySpendBreakdown(params: {
  transactions: Transaction[];
  budgets: BudgetCategory[];
  includeRollups?: boolean;
}): BucketTotal[] {
  const budgetNameById = new Map(params.budgets.map((budget) => [budget.id, budget.name]));
  const totals = new Map<string, number>();

  for (const transaction of params.transactions) {
    if (transaction.direction !== "expense") {
      continue;
    }
    const categoryName =
      (transaction.category_id ? budgetNameById.get(transaction.category_id) : undefined) ??
      parseSectionFromDescription(transaction.description);
    if (!params.includeRollups && categoryName === "Total Costs") {
      continue;
    }
    totals.set(categoryName, (totals.get(categoryName) ?? 0) + transaction.amount);
  }

  const grandTotal = Array.from(totals.values()).reduce((sum, amount) => sum + amount, 0);
  return Array.from(totals.entries())
    .map(([label, amount], index) => ({
      id: `${label}-${index}`,
      label,
      amount,
      share: grandTotal > 0 ? amount / grandTotal : 0
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function buildRevenueBreakdown(transactions: Transaction[]): BucketTotal[] {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.direction !== "income") {
      continue;
    }
    const label = parseSectionFromDescription(transaction.description);
    totals.set(label, (totals.get(label) ?? 0) + transaction.amount);
  }

  const grandTotal = Array.from(totals.values()).reduce((sum, amount) => sum + amount, 0);
  return Array.from(totals.entries())
    .map(([label, amount], index) => ({
      id: `${label}-${index}`,
      label,
      amount,
      share: grandTotal > 0 ? amount / grandTotal : 0
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function buildLeaderBreakdown(
  transactions: Transaction[],
  includeRollups: boolean
): BucketTotal[] {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.direction !== "expense") {
      continue;
    }
    const section = parseSectionFromDescription(transaction.description);
    if (!includeRollups && section === "Total Costs") {
      continue;
    }
    const leader = getLeaderFromDescription(transaction.description);
    totals.set(leader, (totals.get(leader) ?? 0) + transaction.amount);
  }
  const grandTotal = Array.from(totals.values()).reduce((sum, amount) => sum + amount, 0);
  return Array.from(totals.entries())
    .map(([label, amount], index) => ({
      id: `${label}-${index}`,
      label,
      amount,
      share: grandTotal > 0 ? amount / grandTotal : 0
    }))
    .sort((a, b) => b.amount - a.amount);
}
