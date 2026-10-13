import { useState } from "react";
import { Activity, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "../api.js";
import { errorMessage, type SessionUser } from "../lib.js";

export function AuthScreen({ onAuth }: { onAuth: (token: string, user: SessionUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";

  async function submit() {
    setError("");
    if (isRegister && !name.trim()) return setError("Please tell us your name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    if (isRegister && (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password))) {
      return setError("Use at least 10 characters, including a letter and a number.");
    }
    if (!isRegister && !password) return setError("Enter your password.");
    setBusy(true);
    try {
      const payload = await apiRequest<{ token: string; user: SessionUser }>(
        { token: null },
        isRegister ? "/auth/register" : "/auth/login",
        { method: "POST", body: JSON.stringify(isRegister ? { name: name.trim(), email, password } : { email, password }) }
      );
      onAuth(payload.token, payload.user);
    } catch (err) {
      setError(errorMessage(err, "We couldn't sign you in. Check your details and try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <div className="auth-hero">
        <div className="logo-mark">
          <Activity size={28} />
        </div>
        <h1>ORVIX</h1>
        <p>Eat smarter. Train better. See real progress.</p>
      </div>
      <form
        className="auth-card"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="segmented" role="tablist">
          <button type="button" role="tab" aria-selected={isRegister} className={isRegister ? "active" : ""} onClick={() => setMode("register")}>
            Create account
          </button>
          <button type="button" role="tab" aria-selected={!isRegister} className={!isRegister ? "active" : ""} onClick={() => setMode("login")}>
            Sign in
          </button>
        </div>
        {isRegister && (
          <label className="field">
            <span>Your name</span>
            <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex" />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        </label>
        <label className="field">
          <span>Password</span>
          <div className="input-with-action">
            <input
              type={show ? "text" : "password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegister ? "10+ characters, letters and numbers" : "Your password"}
            />
            <button type="button" className="icon-btn" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((value) => !value)}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary block" type="submit" disabled={busy}>
          {busy ? "One moment…" : isRegister ? "Get started" : "Sign in"}
        </button>
        {isRegister && <p className="fineprint">It takes about a minute to set up your personal plan.</p>}
      </form>
    </main>
  );
}
