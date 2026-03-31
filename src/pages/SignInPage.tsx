import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../lib/supabase";

export function SignInPage(): JSX.Element {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      navigate("/overview", { replace: true });
    }
  }, [session, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign-in failed";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="signin-page">
      <div className="signin-card">
        <p className="eyebrow">Treasury Operations Dashboard</p>
        <h1>Sign in to your chapter workspace</h1>
        <p className="muted">
          Submit expenses, approve reimbursements, and monitor cash flow in one place.
        </p>
        {!isSupabaseConfigured ? (
          <div className="warning-callout" role="alert">
            Add `VITE_SUPABASE_URL` and either `VITE_SUPABASE_ANON_KEY` or
            `VITE_SUPABASE_PUBLISHABLE_KEY` to `.env` before sign-in.
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="form-grid">
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="muted">
          Need an account? <Link to="/signup">Request access</Link>
        </p>
      </div>
    </section>
  );
}
