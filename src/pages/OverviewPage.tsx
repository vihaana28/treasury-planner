import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "../components/common/KpiCard";
import { StateMessage } from "../components/common/StateMessage";
import { useAuth } from "../context/AuthContext";
import { DashboardService } from "../services/dashboardService";
import { TreasuryDataService } from "../services/treasuryDataService";
import type { Alert, BudgetCategory, DashboardKpis, Transaction } from "../types/domain";
import {
  buildCategorySpendBreakdown,
  buildRevenueBreakdown
} from "../utils/financeBreakdown";
import { toUsd } from "../utils/format";

function startOfMonthIso(): string {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return first.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function OverviewPage(): JSX.Element {
  const { profile } = useAuth();
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(startOfMonthIso());
  const [to, setTo] = useState(todayIso());

  useEffect(() => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    Promise.all([
      DashboardService.getKpis(profile.organization_id, { from, to }),
      DashboardService.getAlerts(profile.organization_id),
      TreasuryDataService.getTransactions(profile.organization_id, { from, to }),
      TreasuryDataService.getBudgets(profile.organization_id)
    ])
      .then(([nextKpis, nextAlerts, nextTransactions, nextBudgets]) => {
        setKpis(nextKpis);
        setAlerts(nextAlerts);
        setTransactions(nextTransactions);
        setBudgets(nextBudgets);
      })
      .catch((nextError: unknown) => {
        const message = nextError instanceof Error ? nextError.message : "Unable to load overview";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [profile?.organization_id, from, to]);

  const cards = useMemo(() => {
    if (!kpis) {
      return [];
    }
    return [
      { label: "Cash Position", value: toUsd(kpis.cashPosition), tone: kpis.cashPosition >= 0 ? "positive" : "negative" },
      { label: "MTD Income", value: toUsd(kpis.monthToDateIncome), tone: "positive" },
      { label: "MTD Expense", value: toUsd(kpis.monthToDateExpense), tone: "negative" },
      { label: "Daily Burn Rate", value: toUsd(kpis.burnRate), tone: "neutral" },
      { label: "Budget Variance", value: toUsd(kpis.budgetVariance), tone: kpis.budgetVariance >= 0 ? "positive" : "negative" },
      { label: "Pending Approvals", value: String(kpis.pendingApprovals), tone: "neutral" },
      { label: "Pending Reimbursements", value: String(kpis.pendingReimbursements), tone: "neutral" }
    ] as const;
  }, [kpis]);

  const spendBreakdown = useMemo(
    () =>
      buildCategorySpendBreakdown({
        transactions,
        budgets,
        includeRollups: false
      }).slice(0, 6),
    [transactions, budgets]
  );

  const revenueBreakdown = useMemo(
    () => buildRevenueBreakdown(transactions).slice(0, 6),
    [transactions]
  );

  if (!profile) {
    return (
      <StateMessage
        kind="error"
        title="Missing profile setup"
        detail="Your account needs a profile record with role and organization."
      />
    );
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Cash Flow Overview</p>
          <h1>Treasury pulse</h1>
        </div>
        <div className="inline-filters">
          <label>
            From
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
      </header>

      {loading ? <StateMessage kind="loading" title="Loading dashboard metrics..." /> : null}
      {error ? <StateMessage kind="error" title="Could not load overview" detail={error} /> : null}

      {!loading && !error && cards.length > 0 ? (
        <>
          <div className="kpi-grid">
            {cards.map((card) => (
              <KpiCard key={card.label} label={card.label} value={card.value} tone={card.tone} />
            ))}
          </div>
          <div className="panel-grid">
            <article className="panel">
              <h2>Budget posture</h2>
              <p className="muted">Variance is computed as total budget minus posted spend.</p>
              <div className="variance-meter">
                <div
                  className="variance-meter__fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, ((kpis?.budgetVariance ?? 0) / Math.max(1, kpis?.monthToDateExpense ?? 1)) * 100 + 50)
                    )}%`
                  }}
                />
              </div>
              <div className="inline-metrics">
                <p>
                  <span className="muted">Period income:</span> {toUsd(kpis?.monthToDateIncome ?? 0)}
                </p>
                <p>
                  <span className="muted">Period expense:</span> {toUsd(kpis?.monthToDateExpense ?? 0)}
                </p>
              </div>
            </article>

            <article className="panel">
              <h2>Where money is going</h2>
              {spendBreakdown.length === 0 ? (
                <StateMessage title="No expense lines in this range" />
              ) : (
                <div className="breakdown-list">
                  {spendBreakdown.map((bucket) => (
                    <div key={bucket.id} className="breakdown-row">
                      <div className="breakdown-row__meta">
                        <strong>{bucket.label}</strong>
                        <span>{toUsd(bucket.amount)}</span>
                      </div>
                      <div className="progress">
                        <div
                          className="progress__fill progress__fill--warning"
                          style={{ width: `${Math.max(2, Math.round(bucket.share * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="panel">
              <h2>Where income comes from</h2>
              {revenueBreakdown.length === 0 ? (
                <StateMessage title="No revenue lines in this range" />
              ) : (
                <div className="breakdown-list">
                  {revenueBreakdown.map((bucket) => (
                    <div key={bucket.id} className="breakdown-row">
                      <div className="breakdown-row__meta">
                        <strong>{bucket.label}</strong>
                        <span>{toUsd(bucket.amount)}</span>
                      </div>
                      <div className="progress">
                        <div
                          className="progress__fill progress__fill--info"
                          style={{ width: `${Math.max(2, Math.round(bucket.share * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="panel">
              <h2>In-app alerts</h2>
              {alerts.length === 0 ? (
                <StateMessage title="No active alerts" detail="Budget and workflow alerts will appear here." />
              ) : (
                <ul className="alert-list">
                  {alerts.map((alert) => (
                    <li key={alert.id} className={`alert-row alert-row--${alert.severity}`}>
                      <strong>{alert.type}</strong>
                      <span>{alert.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </>
      ) : null}
    </section>
  );
}
