import type { BudgetCategory } from "../types/domain";

export interface BudgetAlertEvaluation {
  categoryId: string;
  triggered: boolean;
  severity: "info" | "warning" | "critical";
  message: string;
}

export function evaluateBudgetAlert(
  category: Pick<BudgetCategory, "id" | "name" | "limit_amount" | "spent_amount" | "alert_threshold">
): BudgetAlertEvaluation {
  if (category.limit_amount <= 0) {
    return {
      categoryId: category.id,
      triggered: false,
      severity: "info",
      message: `${category.name}: no budget cap configured`
    };
  }

  const usage = category.spent_amount / category.limit_amount;

  if (usage >= 1) {
    return {
      categoryId: category.id,
      triggered: true,
      severity: "critical",
      message: `${category.name} is over budget`
    };
  }

  if (usage >= category.alert_threshold) {
    return {
      categoryId: category.id,
      triggered: true,
      severity: "warning",
      message: `${category.name} reached ${Math.round(usage * 100)}% of budget`
    };
  }

  return {
    categoryId: category.id,
    triggered: false,
    severity: "info",
    message: `${category.name} is within budget`
  };
}
