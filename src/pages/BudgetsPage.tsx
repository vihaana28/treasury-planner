import { useEffect, useMemo, useState } from "react";
import { StateMessage } from "../components/common/StateMessage";
import { useAuth } from "../context/AuthContext";
import { evaluateBudgetAlert } from "../services/alertRules";
import { TreasuryDataService } from "../services/treasuryDataService";
import type { BudgetCategory } from "../types/domain";
import { toUsd } from "../utils/format";

export function BudgetsPage(): JSX.Element {
  const { profile } = useAuth();
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    TreasuryDataService.getBudgets(profile.organization_id)
      .then((result) => setBudgets(result))
      .catch((nextError: unknown) =>
        setError(nextError instanceof Error ? nextError.message : "Unable to load budgets")
      )
      .finally(() => setLoading(false));
  }, [profile?.organization_id]);

  const budgetRows = useMemo(
    () =>
      budgets.map((budget) => {
        const usagePct =
          budget.limit_amount > 0
            ? Math.min(100, Math.round((budget.spent_amount / budget.limit_amount) * 100))
            : 0;
        return {
          ...budget,
          usagePct,
          alert: evaluateBudgetAlert(budget)
        };
      }),
    [budgets]
  );

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Budget Controls</p>
          <h1>Budgets</h1>
        </div>
      </header>

      {loading ? <StateMessage kind="loading" title="Loading budget categories..." /> : null}
      {error ? <StateMessage kind="error" title="Could not load budgets" detail={error} /> : null}
      {!loading && !error && budgetRows.length === 0 ? (
        <StateMessage title="No budget categories yet" detail="Create categories in Supabase to begin tracking." />
      ) : null}

      {!loading && !error && budgetRows.length > 0 ? (
        <div className="budget-grid">
          {budgetRows.map((budget) => (
            <article key={budget.id} className="panel budget-card">
              <div className="budget-card__header">
                <h2>{budget.name}</h2>
                <span className={`status-pill status-pill--${budget.alert.severity}`}>
                  {budget.alert.severity}
                </span>
              </div>
              <p className="muted">{budget.alert.message}</p>
              <p className="budget-card__numbers">
                <strong>{toUsd(budget.spent_amount)}</strong> spent of {toUsd(budget.limit_amount)}
              </p>
              <div className="progress">
                <div
                  className={`progress__fill progress__fill--${budget.alert.severity}`}
                  style={{ width: `${budget.usagePct}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
