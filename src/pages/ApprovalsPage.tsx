import { useEffect, useState } from "react";
import { RoleGate } from "../components/layout/RoleGate";
import { StateMessage } from "../components/common/StateMessage";
import { useAuth } from "../context/AuthContext";
import { ExpenseService } from "../services/expenseService";
import { TreasuryDataService } from "../services/treasuryDataService";
import type { ExpenseReport, SignupRequest, UserRole } from "../types/domain";
import { canApproveExpense } from "../utils/permissions";
import { toShortDate, toUsd } from "../utils/format";

export function ApprovalsPage(): JSX.Element {
  const { profile } = useAuth();
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [signupRequests, setSignupRequests] = useState<SignupRequest[]>([]);
  const [rolesByRequest, setRolesByRequest] = useState<Record<string, UserRole>>({});
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
      const [expenseQueue, signupQueue] = await Promise.all([
        TreasuryDataService.getApprovalsQueue(profile.organization_id),
        TreasuryDataService.getSignupRequests(profile.organization_id)
      ]);
      setReports(expenseQueue);
      setSignupRequests(signupQueue);
      setRolesByRequest((current) => {
        const next = { ...current };
        for (const request of signupQueue) {
          if (!next[request.id]) {
            next[request.id] = "member";
          }
        }
        return next;
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load approvals queue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, [profile?.organization_id]);

  async function handleExpenseDecision(
    reportId: string,
    decision: "approve" | "reject"
  ): Promise<void> {
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

  async function handleSignupApprove(request: SignupRequest): Promise<void> {
    if (!profile) {
      return;
    }
    setError(null);
    try {
      await TreasuryDataService.approveSignupRequest(
        request,
        rolesByRequest[request.id] ?? "member",
        profile.id
      );
      await loadQueue();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to approve signup request"
      );
    }
  }

  async function handleSignupReject(request: SignupRequest): Promise<void> {
    if (!profile) {
      return;
    }
    setError(null);
    try {
      await TreasuryDataService.rejectSignupRequest(request, profile.id);
      await loadQueue();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to reject signup request"
      );
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

        {!loading && !error && signupRequests.length > 0 ? (
          <article className="panel">
            <h2>Account signup requests</h2>
            <div className="approval-list">
              {signupRequests.map((request) => (
                <article key={request.id} className="panel approval-card">
                  <div>
                    <h3>{request.full_name}</h3>
                    <p className="muted">
                      {request.email} | Requested {toShortDate(request.created_at)}
                    </p>
                  </div>
                  <label>
                    Role on approval
                    <select
                      value={rolesByRequest[request.id] ?? "member"}
                      onChange={(event) =>
                        setRolesByRequest((current) => ({
                          ...current,
                          [request.id]: event.target.value as UserRole
                        }))
                      }
                    >
                      <option value="member">member</option>
                      <option value="treasurer">treasurer</option>
                      <option value="admin">admin</option>
                    </select>
                  </label>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void handleSignupApprove(request)}
                    >
                      Approve access
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => void handleSignupReject(request)}
                    >
                      Reject request
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </article>
        ) : null}

        {!loading && !error && reports.length > 0 ? (
          <article className="panel">
            <h2>Expense approvals</h2>
            <div className="approval-list">
              {reports.map((report) => (
                <article key={report.id} className="panel approval-card">
                  <div>
                    <h3>{report.title}</h3>
                    <p className="muted">
                      Submitted {toShortDate(report.submitted_at)} | {toUsd(report.total_amount)}
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
                      onClick={() => void handleExpenseDecision(report.id, "approve")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={!canApproveExpense(profile?.role ?? "member")}
                      onClick={() => void handleExpenseDecision(report.id, "reject")}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </article>
        ) : null}

        {!loading && !error && reports.length === 0 && signupRequests.length === 0 ? (
          <StateMessage
            title="Queue is clear"
            detail="No expense reports or access requests need approval right now."
          />
        ) : null}
      </section>
    </RoleGate>
  );
}
