import { useEffect, useState } from "react";
import { StatusPill } from "../components/common/StatusPill";
import { StateMessage } from "../components/common/StateMessage";
import { RoleGate } from "../components/layout/RoleGate";
import { useAuth } from "../context/AuthContext";
import { ExpenseService } from "../services/expenseService";
import { TreasuryDataService } from "../services/treasuryDataService";
import type { ExpenseReport, Reimbursement } from "../types/domain";
import { toShortDate, toUsd } from "../utils/format";

export function ReimbursementsPage(): JSX.Element {
  const { profile } = useAuth();
  const [queue, setQueue] = useState<ExpenseReport[]>([]);
  const [history, setHistory] = useState<Reimbursement[]>([]);
  const [methodByReport, setMethodByReport] = useState<Record<string, string>>({});
  const [referenceByReport, setReferenceByReport] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData(): Promise<void> {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextQueue, nextHistory] = await Promise.all([
        TreasuryDataService.getReimbursementsQueue(profile.organization_id),
        TreasuryDataService.getReimbursements(profile.organization_id)
      ]);
      setQueue(nextQueue);
      setHistory(nextHistory);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load reimbursements");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [profile?.organization_id]);

  async function markPaid(report: ExpenseReport): Promise<void> {
    if (!profile?.organization_id) {
      return;
    }
    const method = methodByReport[report.id] ?? "ACH";
    const reference = referenceByReport[report.id];
    setError(null);
    try {
      await ExpenseService.markPaid(report.id, {
        organizationId: profile.organization_id,
        reportId: report.id,
        method,
        paidAt: new Date().toISOString(),
        reference
      });
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to mark reimbursement as paid");
    }
  }

  return (
    <RoleGate role={profile?.role} allowed={["admin", "treasurer"]}>
      <section className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Payout Tracking</p>
            <h1>Reimbursements</h1>
          </div>
        </header>

        {loading ? <StateMessage kind="loading" title="Loading reimbursement queue..." /> : null}
        {error ? <StateMessage kind="error" title="Could not load reimbursements" detail={error} /> : null}

        <div className="panel-grid">
          <article className="panel">
            <h2>Pending payment</h2>
            {!loading && queue.length === 0 ? (
              <StateMessage title="No approved reports waiting for payment" />
            ) : null}
            {queue.map((report) => (
              <div key={report.id} className="queue-row">
                <div>
                  <p>{report.title}</p>
                  <p className="muted">{toUsd(report.total_amount)}</p>
                </div>
                <label>
                  Method
                  <select
                    value={methodByReport[report.id] ?? "ACH"}
                    onChange={(event) =>
                      setMethodByReport((current) => ({
                        ...current,
                        [report.id]: event.target.value
                      }))
                    }
                  >
                    <option value="ACH">ACH</option>
                    <option value="Check">Check</option>
                    <option value="Cash">Cash</option>
                  </select>
                </label>
                <label>
                  Reference
                  <input
                    value={referenceByReport[report.id] ?? ""}
                    onChange={(event) =>
                      setReferenceByReport((current) => ({
                        ...current,
                        [report.id]: event.target.value
                      }))
                    }
                    placeholder="Txn/check #"
                  />
                </label>
                <button className="primary-button" type="button" onClick={() => void markPaid(report)}>
                  Mark paid
                </button>
              </div>
            ))}
          </article>

          <article className="panel">
            <h2>Recent reimbursements</h2>
            {!loading && history.length === 0 ? (
              <StateMessage title="No paid reimbursements yet" />
            ) : null}
            {history.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Paid</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th>Status</th>
                      <th className="align-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((payment) => (
                      <tr key={payment.id}>
                        <td>{toShortDate(payment.paid_at)}</td>
                        <td>{payment.method}</td>
                        <td>{payment.reference ?? "-"}</td>
                        <td>
                          <StatusPill status="paid" />
                        </td>
                        <td className="align-right">{toUsd(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </article>
        </div>
      </section>
    </RoleGate>
  );
}
