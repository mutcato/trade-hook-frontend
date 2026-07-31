import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    password_confirm: "",
    first_name: "",
    last_name: "",
  });

  if (!loading && user) return <Navigate to="/" replace />;

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        if (form.password !== form.password_confirm) {
          throw new Error("Passwords do not match.");
        }
        await register({
          email: form.email,
          password: form.password,
          password_confirm: form.password_confirm,
          first_name: form.first_name,
          last_name: form.last_name,
        });
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div className="brand-text">
            <span className="brand-name">AlphaBot</span>
            <span className="brand-tag">Vigilant Trader</span>
          </div>
        </div>
        <h1>{mode === "login" ? "Welcome back" : "Create account"}</h1>
        <p className="muted">
          {mode === "login"
            ? "Sign in to manage strategies and webhook triggers."
            : "Register to start building TradingView-linked strategies."}
        </p>

        {params.get("expired") && (
          <div className="error-banner" style={{ marginTop: "1rem" }}>
            Session expired. Please sign in again.
          </div>
        )}
        {error && <div className="error-banner" style={{ marginTop: "1rem" }}>{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="field-row">
              <div className="field">
                <label htmlFor="first_name">First name</label>
                <input
                  id="first_name"
                  value={form.first_name}
                  onChange={(e) => update("first_name", e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="last_name">Last name</label>
                <input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) => update("last_name", e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
            />
          </div>
          {mode === "register" && (
            <div className="field">
              <label htmlFor="password_confirm">Confirm password</label>
              <input
                id="password_confirm"
                type="password"
                required
                autoComplete="new-password"
                value={form.password_confirm}
                onChange={(e) => update("password_confirm", e.target.value)}
              />
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <>
              No account?{" "}
              <button type="button" onClick={() => { setMode("register"); setError(""); }}>
                Register
              </button>
            </>
          ) : (
            <>
              Already registered?{" "}
              <button type="button" onClick={() => { setMode("login"); setError(""); }}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
