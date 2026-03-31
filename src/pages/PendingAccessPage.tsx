import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";

function statusLabel(status: string | undefined): string {
  if (!status) {
    return "No request found yet";
  }
  if (status === "pending") {
    return "Pending admin approval";
  }
  if (status === "rejected") {
    return "Request rejected";
  }
  if (status === "approved") {
    return "Approved, waiting for profile sync";
  }
  return status;
}

export function PendingAccessPage(): JSX.Element {
  const { mySignupRequest, refreshProfile, refreshSignupRequest, signOut } = useAuth();

  const message = useMemo(() => {
    if (!mySignupRequest) {
      return "Your account has no treasury profile yet. Ask an admin to approve your access request.";
    }
    if (mySignupRequest.status === "pending") {
      return "A treasurer/admin needs to approve your signup request before you can access the dashboard.";
    }
    if (mySignupRequest.status === "rejected") {
      return mySignupRequest.review_note
        ? `Request was rejected: ${mySignupRequest.review_note}`
        : "Request was rejected. Contact a treasurer/admin for next steps.";
    }
    return "Your request is approved. Click refresh to load access.";
  }, [mySignupRequest]);

  return (
    <section className="signin-page">
      <div className="signin-card">
        <p className="eyebrow">Access Review</p>
        <h1>Account not active yet</h1>
        <p className="muted">{message}</p>
        <p>
          Status:{" "}
          <span className={`status-pill status-pill--${mySignupRequest?.status ?? "info"}`}>
            {statusLabel(mySignupRequest?.status)}
          </span>
        </p>
        <div className="row-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              void refreshSignupRequest();
              void refreshProfile();
            }}
          >
            Refresh status
          </button>
          <button className="primary-button" type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </div>
    </section>
  );
}
