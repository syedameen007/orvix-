import { useEffect, useState } from "react";
import { Activity, Apple, Bot, Dumbbell, Home, LineChart } from "lucide-react";
import { apiRequest, setUnauthorizedHandler } from "./api.js";
import { ToastProvider } from "./ui.js";
import { useStoredToken, type Profile as ProfileData, type SessionUser, type View } from "./lib.js";
import { AuthScreen } from "./screens/Auth.js";
import { Onboarding } from "./screens/Onboarding.js";
import { Today } from "./screens/Today.js";
import { Eat } from "./screens/Eat.js";
import { Train } from "./screens/Train.js";
import { Progress } from "./screens/Progress.js";
import { Coach } from "./screens/Coach.js";
import { Profile } from "./screens/Profile.js";

const TABS: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "today", label: "Today", icon: Home },
  { id: "eat", label: "Food", icon: Apple },
  { id: "train", label: "Train", icon: Dumbbell },
  { id: "progress", label: "Progress", icon: LineChart },
  { id: "coach", label: "Coach", icon: Bot }
];

export function App() {
  const [token, setToken] = useStoredToken();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [view, setView] = useState<View>("today");
  const [todayKey, setTodayKey] = useState(0);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([apiRequest<SessionUser>({ token }, "/auth/me"), apiRequest<ProfileData>({ token }, "/profile").catch(() => null)])
      .then(([me, prof]) => {
        if (cancelled) return;
        setUser(me);
        setProfile(prof ?? { name: me.profile?.name ?? null });
      })
      .catch(() => !cancelled && setToken(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, setToken]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
      setProfile(null);
    });
    return () => setUnauthorizedHandler(null);
  }, [setToken]);

  function logout() {
    if (token) void apiRequest({ token }, "/auth/logout", { method: "POST" }).catch(() => undefined);
    setToken(null);
    setUser(null);
    setProfile(null);
    setView("today");
  }

  if (!token) {
    return (
      <AuthScreen
        onAuth={(nextToken, nextUser) => {
          setUser(nextUser);
          setToken(nextToken);
        }}
      />
    );
  }

  if (loading || !profile) {
    return (
      <div className="splash">
        <div className="logo-mark"><Activity size={28} /></div>
      </div>
    );
  }

  const needsOnboarding = !profile.onboardingCompleted && !profile.calorieTarget;
  if (needsOnboarding) {
    return (
      <ToastProvider>
        <Onboarding token={token} defaultName={profile.name && profile.name !== "ORVIX Athlete" ? profile.name : ""} onDone={setProfile} />
      </ToastProvider>
    );
  }

  const initial = (profile.name ?? user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <ToastProvider>
      <div className="app">
        <button className={view === "profile" ? "avatar floating active" : "avatar floating"} aria-label="Profile" onClick={() => setView("profile")}>
          {initial}
        </button>
        <main className="content">
          {view === "today" && <Today key={todayKey} token={token} profile={profile} go={setView} />}
          {view === "eat" && <Eat token={token} onSaved={() => setTodayKey((key) => key + 1)} />}
          {view === "train" && <Train token={token} />}
          {view === "progress" && <Progress token={token} profile={profile} onWeight={(kg) => setProfile({ ...profile, currentWeightKg: kg })} />}
          {view === "coach" && <Coach token={token} />}
          {view === "profile" && <Profile token={token} user={user} profile={profile} onUpdated={setProfile} onLogout={logout} />}
        </main>
        <nav className="tabbar" aria-label="Main">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={view === id ? "active" : ""} aria-current={view === id ? "page" : undefined} onClick={() => setView(id)}>
              <Icon size={22} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </ToastProvider>
  );
}
