import { useEffect, useState } from "react";
import { RoleGate } from "../components/layout/RoleGate";
import { StateMessage } from "../components/common/StateMessage";
import { useAuth } from "../context/AuthContext";
import { ExpenseService } from "../services/expenseService";
import { TreasuryDataService } from "../services/treasuryDataService";
import type { ExpenseReport } from "../types/domain";
import { canApproveExpense } from "../utils/permissions";
import { toShortDate, toUsd } from "../utils/format";

export function ApprovalsPage(): JSX.Element {
  const { profile } = useAuth();
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadQueue(): Promise<void> {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const queue = await TreasuryDataService.getApprovalsQueue(profile.organization_id);
      setReports(queue);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load approvals queue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, [profile?.organization_id]);

  async function handleDecision(reportId: string, decision: "approve" | "reject"): Promise<void> {
    if (!profile?.organization_id) {
      return;
    }
    setError(null);
    try {
      await ExpenseService.approveReport(
        reportId,
        decision,
        profile.organization_id,
        notes[reportId]
      );
      await loadQueue();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to apply decision");
    }
  }

  return (
    <RoleGate role={profile?.role} allowed={["admin", "treasurer"]}>
      <section className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Approval Workflow</p>
            <h1>Approvals</h1>
          </div>
        </header>

        {loading ? <StateMessage kind="loading" title="Loading pending approvals..." /> : null}
        {error ? <StateMessage kind="error" title="Could not load approvals" detail={error} /> : null}
        {!loading && !error && reports.length === 0 ? (
          <StateMessage title="Queue is clear" detail="No submitted reports need approval right now." />
        ) : null}

        {!loading && !error && reports.length > 0 ? (
          <div className="approval-list">
            {reports.map((report) => (
              <article key={report.id} className="panel approval-card">
                <div>
                  <h2>{report.title}</h2>
                  <p className="muted">
                    Submitted {toShortDate(report.submitted_at)} • {toUsd(report.total_amount)}
                  </p>
                </div>
                <label>
                  Decision note
                  <textarea
                    rows={2}
                    value={notes[report.id] ?? ""}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [report.id]: event.target.value }))
                    }
                  />
                </label>
                <div className="row-actions">
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!canApproveExpense(profile?.role ?? "member")}
                    onClick={() => void handleDecision(report.id, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={!canApproveExpense(profile?.role ?? "member")}
                    onClick={() => void handleDecision(report.id, "reject")}
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </RoleGate>
  );
}
