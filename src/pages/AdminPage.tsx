import { FormEvent, useEffect, useState } from "react";
import { StateMessage } from "../components/common/StateMessage";
import { useAuth } from "../context/AuthContext";
import { isSuperAdminEmail, SUPER_ADMIN_EMAIL } from "../lib/adminConfig";
import { supabase } from "../lib/supabase";
import { TreasuryDataService } from "../services/treasuryDataService";
import type { SignupRequest, UserRole } from "../types/domain";
import { toShortDate } from "../utils/format";

export function AdminPage(): JSX.Element {
  const { session, profile } = useAuth();
  const [signupRequests, setSignupRequests] = useState<SignupRequest[]>([]);
  const [rolesByRequest, setRolesByRequest] = useState<Record<string, UserRole>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  const email = session?.user?.email?.toLowerCase() ?? "";
  const isAllowedEmail = isSuperAdminEmail(email);

  async function loadRequests(): Promise<void> {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const requests = await TreasuryDataService.getSignupRequests(profile.organization_id);
      setSignupRequests(requests);
      setRolesByRequest((current) => {
        const next = { ...current };
        for (const request of requests) {
          if (!next[request.id]) {
            next[request.id] = "member";
          }
        }
        return next;
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load signup approvals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAllowedEmail) {
      setLoading(false);
      return;
    }
    void loadRequests();
  }, [profile?.organization_id, isAllowedEmail]);

  async function handleApprove(request: SignupRequest): Promise<void> {
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
      await loadRequests();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not approve request.");
    }
  }

  async function handleReject(request: SignupRequest): Promise<void> {
    if (!profile) {
      return;
    }
    setError(null);
    try {
      await TreasuryDataService.rejectSignupRequest(request, profile.id);
      await loadRequests();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not reject request.");
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPasswordStatus(null);

    if (password.length < 6) {
      setPasswordStatus("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordStatus("New password and confirmation do not match.");
      return;
    }

    const updateResult = await supabase.auth.updateUser({ password });
    if (updateResult.error) {
      setPasswordStatus(updateResult.error.message);
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setPasswordStatus("Password updated successfully.");
  }

  if (!isAllowedEmail) {
    return (
      <StateMessage
        kind="error"
        title="Admin page restricted"
        detail={`Only ${SUPER_ADMIN_EMAIL} can open this page.`}
      />
    );
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Owner Controls</p>
          <h1>Admin Page</h1>
        </div>
      </header>

      <article className="panel">
        <h2>Password settings</h2>
        <p className="muted">
          You can sign in with your current password (for now `123456`) and change it here anytime.
        </p>
        <form className="form-grid" onSubmit={handlePasswordChange}>
          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>
          {passwordStatus ? (
            <p className={passwordStatus.includes("successfully") ? "form-success" : "form-error"}>
              {passwordStatus}
            </p>
          ) : null}
          <button type="submit" className="primary-button">
            Change password
          </button>
        </form>
      </article>

      <article className="panel">
        <h2>Account approvals</h2>
        {loading ? <StateMessage kind="loading" title="Loading account requests..." /> : null}
        {error ? <StateMessage kind="error" title="Could not load account requests" detail={error} /> : null}

        {!loading && !error && signupRequests.length === 0 ? (
          <StateMessage title="No pending account requests" />
        ) : null}

        {!loading && !error && signupRequests.length > 0 ? (
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
                    onClick={() => void handleApprove(request)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => void handleReject(request)}
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </article>
    </section>
  );
}
