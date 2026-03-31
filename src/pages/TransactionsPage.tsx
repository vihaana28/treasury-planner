import { FormEvent, useEffect, useMemo, useState } from "react";
import { StateMessage } from "../components/common/StateMessage";
import { useAuth } from "../context/AuthContext";
import { TreasuryDataService } from "../services/treasuryDataService";
import type { Transaction } from "../types/domain";
import { toShortDate, toUsd } from "../utils/format";

function startOfMonthIso(): string {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return first.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionsPage(): JSX.Element {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(startOfMonthIso());
  const [to, setTo] = useState(todayIso());
  const [search, setSearch] = useState("");

  async function loadTransactions(): Promise<void> {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await TreasuryDataService.getTransactions(profile.organization_id, {
        from,
        to
      });
      setTransactions(result);
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Unable to load transactions";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTransactions();
  }, [profile?.organization_id]);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void loadTransactions();
  }

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return transactions;
    }
    return transactions.filter((transaction) =>
      transaction.description.toLowerCase().includes(term)
    );
  }, [transactions, search]);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Ledger Activity</p>
          <h1>Transactions</h1>
        </div>
        <form onSubmit={handleFilterSubmit} className="inline-filters">
          <label>
            From
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <label>
            Search
            <input
              type="text"
              placeholder="Search description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button className="secondary-button" type="submit">
            Apply
          </button>
        </form>
      </header>

      {loading ? <StateMessage kind="loading" title="Loading transactions..." /> : null}
      {error ? <StateMessage kind="error" title="Could not load transactions" detail={error} /> : null}
      {!loading && !error && filteredTransactions.length === 0 ? (
        <StateMessage title="No transactions in this range" detail="Try adjusting your filters." />
      ) : null}

      {!loading && !error && filteredTransactions.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th className="align-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{toShortDate(transaction.occurred_on)}</td>
                  <td>{transaction.description}</td>
                  <td>
                    <span className={`status-pill status-pill--${transaction.direction}`}>
                      {transaction.direction}
                    </span>
                  </td>
                  <td className="align-right">{toUsd(transaction.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
