import { useEffect, useMemo, useState } from "react";
import { StateMessage } from "../components/common/StateMessage";
import { useAuth } from "../context/AuthContext";
import { evaluateBudgetAlert } from "../services/alertRules";
import { TreasuryDataService } from "../services/treasuryDataService";
import type { BudgetCategory, Transaction } from "../types/domain";
import {
  buildCategorySpendBreakdown,
  buildLeaderBreakdown,
  parseSectionFromDescription,
  sanitizeTransactionDescription
} from "../utils/financeBreakdown";
import { toShortDate, toUsd } from "../utils/format";

type BreakdownMode = "category" | "leader";

export function BudgetsPage(): JSX.Element {
  const { profile } = useAuth();
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [reservePercent, setReservePercent] = useState(10);
  const [includeRollups, setIncludeRollups] = useState(false);
  const [mode, setMode] = useState<BreakdownMode>("category");
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [editableCaps, setEditableCaps] = useState<Record<string, number>>({});

  async function loadBudgetStudioData(): Promise<void> {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const [nextBudgets, nextTransactions] = await Promise.all([
        TreasuryDataService.getBudgets(profile.organization_id),
        TreasuryDataService.getTransactions(profile.organization_id, {})
      ]);
      setBudgets(nextBudgets);
      setTransactions(nextTransactions);
      setEditableCaps(
        Object.fromEntries(nextBudgets.map((budget) => [budget.id, Number(budget.limit_amount)]))
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load budgets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBudgetStudioData();
  }, [profile?.organization_id]);

  const categoryRows = useMemo(
    () =>
      budgets
        .map((budget) => {
          const usagePct =
            budget.limit_amount > 0
              ? Math.min(100, Math.round((budget.spent_amount / budget.limit_amount) * 100))
              : 0;
          return {
            ...budget,
            usagePct,
            alert: evaluateBudgetAlert(budget),
            editedLimit:
              editableCaps[budget.id] !== undefined
                ? Number(editableCaps[budget.id])
                : Number(budget.limit_amount)
          };
        })
        .sort((a, b) => b.spent_amount - a.spent_amount),
    [budgets, editableCaps]
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        includeRollups ? true : parseSectionFromDescription(transaction.description) !== "Total Costs"
      ),
    [transactions, includeRollups]
  );

  const spendBuckets = useMemo(() => {
    if (mode === "leader") {
      return buildLeaderBreakdown(filteredTransactions, includeRollups);
    }
    return buildCategorySpendBreakdown({
      transactions: filteredTransactions,
      budgets,
      includeRollups
    });
  }, [mode, filteredTransactions, budgets, includeRollups]);

  const categoryNameById = useMemo(
    () => new Map(budgets.map((budget) => [budget.id, budget.name])),
    [budgets]
  );

  const bucketTransactions = useMemo(() => {
    if (!selectedBucket) {
      return [];
    }
    if (mode === "leader") {
      return filteredTransactions
        .filter((transaction) => {
          if (transaction.direction !== "expense") {
            return false;
          }
          const section = parseSectionFromDescription(transaction.description);
          return section === selectedBucket || selectedBucket === "Chapter Operations";
        })
        .slice(0, 20);
    }
    return filteredTransactions
      .filter((transaction) => {
        if (transaction.direction !== "expense") {
          return false;
        }
        const name =
          (transaction.category_id
            ? categoryNameById.get(transaction.category_id)
            : parseSectionFromDescription(transaction.description)) ?? "Uncategorized";
        return name === selectedBucket;
      })
      .slice(0, 20);
  }, [selectedBucket, mode, filteredTransactions, categoryNameById]);

  const totalIncome = useMemo(
    () =>
      filteredTransactions
        .filter((transaction) => transaction.direction === "income")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    [filteredTransactions]
  );

  const projectedExpense = useMemo(
    () => categoryRows.reduce((sum, budget) => sum + budget.editedLimit, 0),
    [categoryRows]
  );

  const reserveTarget = useMemo(
    () => (totalIncome * reservePercent) / 100,
    [totalIncome, reservePercent]
  );

  const runway = useMemo(
    () => totalIncome - projectedExpense - reserveTarget,
    [totalIncome, projectedExpense, reserveTarget]
  );

  async function saveBudgetCaps(): Promise<void> {
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      await Promise.all(
        categoryRows
          .filter((row) => Number(row.editedLimit) !== Number(row.limit_amount))
          .map((row) =>
            TreasuryDataService.updateBudgetLimit(row.id, Number(row.editedLimit))
          )
      );
      setStatus("Budget caps saved.");
      await loadBudgetStudioData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save budget caps");
    } finally {
      setSaving(false);
    }
  }

  function resetCaps(): void {
    setEditableCaps(
      Object.fromEntries(budgets.map((budget) => [budget.id, Number(budget.limit_amount)]))
    );
    setStatus("Caps reset to saved values.");
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Budget Studio</p>
          <h1>Interactive budget planning</h1>
        </div>
        <div className="inline-filters">
          <label>
            Breakdown
            <select
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as BreakdownMode);
                setSelectedBucket(null);
              }}
            >
              <option value="category">By category</option>
              <option value="leader">By leader</option>
            </select>
          </label>
          <label>
            Include rollups
            <select
              value={includeRollups ? "yes" : "no"}
              onChange={(event) => setIncludeRollups(event.target.value === "yes")}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
        </div>
      </header>

      {loading ? <StateMessage kind="loading" title="Loading budget studio..." /> : null}
      {error ? <StateMessage kind="error" title="Could not load budgets" detail={error} /> : null}

      {!loading && !error ? (
        <>
          <div className="kpi-grid">
            <article className="kpi-card">
              <p className="kpi-card__label">Income in model</p>
              <p className="kpi-card__value">{toUsd(totalIncome)}</p>
            </article>
            <article className="kpi-card">
              <p className="kpi-card__label">Projected expense caps</p>
              <p className="kpi-card__value">{toUsd(projectedExpense)}</p>
            </article>
            <article className="kpi-card">
              <p className="kpi-card__label">Reserve target</p>
              <p className="kpi-card__value">{toUsd(reserveTarget)}</p>
            </article>
            <article className={`kpi-card ${runway >= 0 ? "kpi-card--positive" : "kpi-card--negative"}`}>
              <p className="kpi-card__label">Runway after reserve</p>
              <p className="kpi-card__value">{toUsd(runway)}</p>
            </article>
          </div>

          <article className="panel">
            <h2>Reserve policy simulator</h2>
            <label>
              Reserve percentage ({reservePercent}%)
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={reservePercent}
                onChange={(event) => setReservePercent(Number(event.target.value))}
              />
            </label>
          </article>

          <div className="panel-grid">
            <article className="panel">
              <h2>Money flow breakdown</h2>
              {spendBuckets.length === 0 ? (
                <StateMessage title="No expense activity available" />
              ) : (
                <div className="breakdown-list">
                  {spendBuckets.map((bucket) => (
                    <button
                      type="button"
                      key={bucket.id}
                      className={
                        selectedBucket === bucket.label
                          ? "breakdown-row breakdown-row--selected"
                          : "breakdown-row"
                      }
                      onClick={() => setSelectedBucket(bucket.label)}
                    >
                      <div className="breakdown-row__meta">
                        <strong>{bucket.label}</strong>
                        <span>{toUsd(bucket.amount)}</span>
                      </div>
                      <div className="progress">
                        <div
                          className="progress__fill progress__fill--critical"
                          style={{ width: `${Math.max(2, Math.round(bucket.share * 100))}%` }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </article>

            <article className="panel">
              <h2>Selected bucket transactions</h2>
              {!selectedBucket ? (
                <StateMessage title="Pick a bucket from the left chart" />
              ) : bucketTransactions.length === 0 ? (
                <StateMessage title="No rows for this bucket" />
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th className="align-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bucketTransactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td>{toShortDate(transaction.occurred_on)}</td>
                          <td>{sanitizeTransactionDescription(transaction.description)}</td>
                          <td className="align-right">{toUsd(transaction.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </div>

          <article className="panel">
            <div className="page-header">
              <h2>Category caps editor</h2>
              <div className="row-actions">
                <button type="button" className="secondary-button" onClick={resetCaps}>
                  Reset caps
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={saving}
                  onClick={() => void saveBudgetCaps()}
                >
                  {saving ? "Saving..." : "Save caps"}
                </button>
              </div>
            </div>
            {status ? <p className="form-success">{status}</p> : null}
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Current spend</th>
                    <th>Saved cap</th>
                    <th>Edited cap</th>
                    <th>Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryRows.map((budget) => (
                    <tr key={budget.id}>
                      <td>
                        <div className="budget-card__header">
                          <span>{budget.name}</span>
                          <span className={`status-pill status-pill--${budget.alert.severity}`}>
                            {budget.alert.severity}
                          </span>
                        </div>
                      </td>
                      <td>{toUsd(budget.spent_amount)}</td>
                      <td>{toUsd(budget.limit_amount)}</td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={budget.editedLimit}
                          onChange={(event) =>
                            setEditableCaps((current) => ({
                              ...current,
                              [budget.id]: Number(event.target.value)
                            }))
                          }
                        />
                      </td>
                      <td>{budget.usagePct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </>
      ) : null}
    </section>
  );
}
