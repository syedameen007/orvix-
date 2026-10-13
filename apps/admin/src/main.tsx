import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { Apple, CheckCircle2, LayoutDashboard, LogOut, RefreshCw, Search, ShieldCheck, Users as UsersIcon } from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:4000" : "/api");
const TOKEN_KEY = "orvix-admin-token";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function request<T>(token: string | null, path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) }
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check your connection.", 0);
  }
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new ApiError(payload.error ?? `Request failed (${response.status})`, response.status);
  return payload as T;
}

type Lifecycle = "DRAFT" | "REVIEW" | "VERIFIED" | "PUBLISHED" | "DEPRECATED";
type Verification = "MANUFACTURER_VERIFIED" | "OFFICIAL_SOURCE" | "LICENSED_DATA" | "OPEN_DATA" | "USER_SUBMITTED" | "AI_ESTIMATED" | "UNVERIFIED";

interface Overview {
  users: number;
  foodsInReview: number;
  exercises: number;
  submissions: number;
}
interface AdminFood {
  id: string;
  name: string;
  lifecycle: Lifecycle;
  verificationState: Verification;
  brand?: { name: string } | null;
  source?: { name?: string } | null;
  owner?: { email: string } | null;
  updatedAt: string;
}
interface AdminUser {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  deletionQueued: boolean;
  createdAt: string;
  profile?: { name?: string | null } | null;
}

const LIFECYCLES: Lifecycle[] = ["REVIEW", "DRAFT", "VERIFIED", "PUBLISHED", "DEPRECATED"];
const VERIFICATIONS: Verification[] = ["MANUFACTURER_VERIFIED", "OFFICIAL_SOURCE", "LICENSED_DATA", "OPEN_DATA", "USER_SUBMITTED", "AI_ESTIMATED", "UNVERIFIED"];
const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");

type Page = "overview" | "foods" | "users";

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const payload = await request<{ token: string; user: { role: string } }>(null, "/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      if (payload.user.role !== "ADMIN") throw new ApiError("This account does not have admin access.", 403);
      onLogin(payload.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form
        className="login-card"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="brand"><span className="brand-mark"><ShieldCheck size={22} /></span><div><strong>ORVIX</strong><small>Admin console</small></div></div>
        <label>Email<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="alert" role="alert">{error}</p>}
        <button className="btn primary" type="submit" disabled={busy || !email || !password}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}

function OverviewPage({ overview }: { overview: Overview | null }) {
  const cards: Array<{ key: keyof Overview; title: string; hint: string }> = [
    { key: "users", title: "Active users", hint: "Accounts that aren't deleted" },
    { key: "foodsInReview", title: "Foods awaiting review", hint: "Needs a verification decision" },
    { key: "exercises", title: "Exercises", hint: "In the library" },
    { key: "submissions", title: "Pending submissions", hint: "User-contributed data" }
  ];
  return (
    <>
      <div className="page-head"><h1>Overview</h1></div>
      <section className="stats">
        {cards.map((card) => (
          <article key={card.key} className="stat">
            <span>{card.title}</span>
            <strong>{overview ? overview[card.key].toLocaleString() : "–"}</strong>
            <small>{card.hint}</small>
          </article>
        ))}
      </section>
    </>
  );
}

function FoodsPage({ token, notify, onAuthError }: { token: string; notify: (message: string) => void; onAuthError: (error: unknown) => boolean }) {
  const [filter, setFilter] = useState<Lifecycle | "ALL">("REVIEW");
  const [foods, setFoods] = useState<AdminFood[] | null>(null);
  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState<Record<string, Verification>>({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setFoods(null);
    try {
      const query = filter === "ALL" ? "" : `?lifecycle=${filter}`;
      setFoods((await request<{ foods: AdminFood[] }>(token, `/admin/foods${query}`)).foods);
      setError("");
    } catch (err) {
      if (!onAuthError(err)) setError(err instanceof Error ? err.message : "Could not load foods");
      setFoods([]);
    }
  }, [token, filter, onAuthError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function update(food: AdminFood, lifecycle: Lifecycle) {
    const verificationState = edits[food.id] ?? food.verificationState;
    try {
      await request(token, `/admin/foods/${food.id}`, { method: "PATCH", body: JSON.stringify({ lifecycle, verificationState }) });
      notify(`${food.name}: ${label(lifecycle)}`);
      await load();
    } catch (err) {
      if (!onAuthError(err)) setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  const visible = useMemo(() => (foods ?? []).filter((food) => `${food.brand?.name ?? ""} ${food.name}`.toLowerCase().includes(search.trim().toLowerCase())), [foods, search]);

  return (
    <>
      <div className="page-head">
        <h1>Food verification</h1>
        <button className="btn" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button>
      </div>
      <div className="toolbar">
        <div className="search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or brand" aria-label="Search foods" /></div>
        <div className="tabs" role="tablist">
          {(["ALL", ...LIFECYCLES] as const).map((value) => (
            <button key={value} role="tab" aria-selected={filter === value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "ALL" ? "All" : label(value)}</button>
          ))}
        </div>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Food</th><th>Source</th><th>Status</th><th>Verification</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {foods === null && <tr><td colSpan={5} className="muted">Loading…</td></tr>}
            {foods !== null && visible.length === 0 && <tr><td colSpan={5} className="muted">Nothing here. Try another filter.</td></tr>}
            {visible.map((food) => (
              <tr key={food.id}>
                <td><strong>{food.name}</strong>{food.brand?.name && <small>{food.brand.name}</small>}</td>
                <td>{food.source?.name ?? food.owner?.email ?? "–"}</td>
                <td><span className={`badge ${food.lifecycle.toLowerCase()}`}>{label(food.lifecycle)}</span></td>
                <td>
                  <select value={edits[food.id] ?? food.verificationState} aria-label={`Verification for ${food.name}`} onChange={(event) => setEdits({ ...edits, [food.id]: event.target.value as Verification })}>
                    {VERIFICATIONS.map((value) => <option key={value} value={value}>{label(value)}</option>)}
                  </select>
                </td>
                <td className="row-actions">
                  {food.lifecycle !== "PUBLISHED" && <button className="btn primary small" onClick={() => void update(food, "PUBLISHED")}><CheckCircle2 size={14} /> Publish</button>}
                  {food.lifecycle !== "DEPRECATED" && <button className="btn small" onClick={() => void update(food, "DEPRECATED")}>Deprecate</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function UsersPage({ token, onAuthError }: { token: string; onAuthError: (error: unknown) => boolean }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    request<{ users: AdminUser[] }>(token, "/admin/users")
      .then((payload) => setUsers(payload.users))
      .catch((err) => {
        if (!onAuthError(err)) setError(err instanceof Error ? err.message : "Could not load users");
        setUsers([]);
      });
  }, [token, onAuthError]);

  return (
    <>
      <div className="page-head"><h1>Users</h1></div>
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead>
          <tbody>
            {users === null && <tr><td colSpan={4} className="muted">Loading…</td></tr>}
            {users?.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.profile?.name ?? "–"}</strong><small>{user.email}</small></td>
                <td>{label(user.role)}</td>
                <td><span className={`badge ${user.deletionQueued ? "deprecated" : user.isActive ? "published" : "draft"}`}>{user.deletionQueued ? "Deletion queued" : user.isActive ? "Active" : "Inactive"}</span></td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [page, setPage] = useState<Page>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [toast, setToast] = useState("");

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setOverview(null);
  }, []);

  /** Returns true when the error was an expired/forbidden session and the user was signed out. */
  const handleAuthError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        logout();
        return true;
      }
      return false;
    },
    [logout]
  );

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }, []);

  useEffect(() => {
    if (!token) return;
    request<Overview>(token, "/admin/overview").then(setOverview).catch((error) => void handleAuthError(error));
  }, [token, handleAuthError]);

  if (!token) {
    return <Login onLogin={(next) => { localStorage.setItem(TOKEN_KEY, next); setToken(next); }} />;
  }

  const nav: Array<{ id: Page; title: string; icon: typeof Apple }> = [
    { id: "overview", title: "Overview", icon: LayoutDashboard },
    { id: "foods", title: "Foods", icon: Apple },
    { id: "users", title: "Users", icon: UsersIcon }
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><ShieldCheck size={22} /></span><div><strong>ORVIX</strong><small>Admin console</small></div></div>
        <nav aria-label="Main">
          {nav.map(({ id, title, icon: Icon }) => (
            <button key={id} className={page === id ? "active" : ""} aria-current={page === id ? "page" : undefined} onClick={() => setPage(id)}><Icon size={18} />{title}</button>
          ))}
        </nav>
        <button className="signout" onClick={logout}><LogOut size={18} />Sign out</button>
      </aside>
      <main className="main">
        {page === "overview" && <OverviewPage overview={overview} />}
        {page === "foods" && <FoodsPage token={token} notify={notify} onAuthError={handleAuthError} />}
        {page === "users" && <UsersPage token={token} onAuthError={handleAuthError} />}
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
