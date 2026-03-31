import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../lib/supabase";
import { TreasuryDataService } from "../services/treasuryDataService";
import type { Organization } from "../types/domain";

export function SignupPage(): JSX.Element {
  const { session, signUpWithRequest } = useAuth();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [fullName, setFullName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      navigate("/overview", { replace: true });
    }
  }, [session, navigate]);

  useEffect(() => {
    TreasuryDataService.getOrganizationsForSignup()
      .then((result) => {
        setOrganizations(result);
        if (result.length > 0) {
          setOrganizationId(result[0].id);
        }
      })
      .catch(() => {
        setOrganizations([]);
      });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Password confirmation does not match.");
      return;
    }
    if (!organizationId) {
      setErrorMessage("Please select an organization.");
      return;
    }

    setLoading(true);
    try {
      await signUpWithRequest({
        fullName,
        email,
        password,
        organizationId
      });
      setSuccessMessage(
        "Account request submitted. A treasurer/admin will approve your access before first sign-in."
      );
      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not submit signup request.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="signin-page">
      <div className="signin-card">
        <p className="eyebrow">Treasury Operations Dashboard</p>
        <h1>Request account access</h1>
        <p className="muted">
          New users register here, then a treasurer/admin approves access.
        </p>
        {!isSupabaseConfigured ? (
          <div className="warning-callout" role="alert">
            Add `VITE_SUPABASE_URL` and either `VITE_SUPABASE_ANON_KEY` or
            `VITE_SUPABASE_PUBLISHABLE_KEY` to `.env` first.
          </div>
        ) : null}
        {organizations.length === 0 ? (
          <div className="warning-callout" role="alert">
            No organizations are available yet. Ask an admin to create one in Supabase first.
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Full name
            <input
              type="text"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>
          <label>
            Organization
            <select
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              required
              disabled={organizations.length === 0}
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          {successMessage ? <p className="form-success">{successMessage}</p> : null}

          <button
            className="primary-button"
            type="submit"
            disabled={loading || organizations.length === 0}
          >
            {loading ? "Submitting..." : "Request access"}
          </button>
        </form>
        <p className="muted">
          Already approved? <Link to="/signin">Sign in</Link>
        </p>
      </div>
    </section>
  );
}
