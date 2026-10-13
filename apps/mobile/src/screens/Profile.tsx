import { useState } from "react";
import { Download, KeyRound, LogOut, Trash2 } from "lucide-react";
import { apiRequest } from "../api.js";
import { Card, ScreenHeader, Sheet, useToast } from "../ui.js";
import { errorMessage, type Profile as ProfileData, type SessionUser } from "../lib.js";

const GOAL_LABEL: Record<string, string> = { LOSE_FAT: "Lose fat", BUILD_MUSCLE: "Build muscle", GET_FITTER: "Get fitter", MAINTAIN: "Maintain" };

const TARGET_FIELDS: Array<{ key: keyof ProfileData; label: string; unit: string }> = [
  { key: "calorieTarget", label: "Calories", unit: "kcal" },
  { key: "proteinTargetG", label: "Protein", unit: "g" },
  { key: "carbTargetG", label: "Carbs", unit: "g" },
  { key: "fatTargetG", label: "Fat", unit: "g" },
  { key: "waterTargetMl", label: "Water", unit: "ml" }
];

const PRIVACY_URL = import.meta.env.VITE_PRIVACY_URL as string | undefined;
const TERMS_URL = import.meta.env.VITE_TERMS_URL as string | undefined;
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL as string | undefined;

type Dialog = "password" | "delete" | null;

export function Profile({ token, user, profile, onUpdated, onLogout }: { token: string; user: SessionUser | null; profile: ProfileData | null; onUpdated: (profile: ProfileData) => void; onLogout: () => void }) {
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(TARGET_FIELDS.map(({ key }) => [key, profile?.[key] != null ? String(profile[key]) : ""])));
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [busy, setBusy] = useState(false);

  function closeDialog() {
    setDialog(null);
    setCurrent("");
    setNext("");
    setConfirmDelete("");
    setDialogError("");
  }

  async function saveTargets() {
    setError("");
    const body: Record<string, number> = {};
    for (const { key } of TARGET_FIELDS) {
      const raw = values[key];
      if (raw) {
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0) return setError("Targets must be positive numbers.");
        body[key] = value;
      }
    }
    try {
      onUpdated(await apiRequest<ProfileData>({ token }, "/profile", { method: "PUT", body: JSON.stringify(body) }));
      toast("Targets updated");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function changePassword() {
    setBusy(true);
    setDialogError("");
    try {
      await apiRequest({ token }, "/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword: current, newPassword: next }) });
      closeDialog();
      toast("Password changed");
    } catch (err) {
      setDialogError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    setDialogError("");
    try {
      await apiRequest({ token }, "/auth/account", { method: "DELETE", body: JSON.stringify({ password: current }) });
      closeDialog();
      onLogout();
    } catch (err) {
      setDialogError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function exportData() {
    try {
      const data = await apiRequest<unknown>({ token }, "/auth/export");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "orvix-data-export.json";
      link.click();
      URL.revokeObjectURL(url);
      toast("Your data was downloaded");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const initial = (profile?.name ?? user?.email ?? "?").charAt(0).toUpperCase();
  const newPasswordValid = next.length >= 10 && /[A-Za-z]/.test(next) && /\d/.test(next);

  return (
    <div className="screen">
      <ScreenHeader eyebrow="Account" title="Profile" />
      <Card>
        <div className="profile-head">
          <div className="avatar large">{initial}</div>
          <div>
            <strong>{profile?.name ?? "Athlete"}</strong>
            <small>{user?.email}</small>
            <small>{profile?.primaryGoal ? `Goal: ${GOAL_LABEL[profile.primaryGoal] ?? profile.primaryGoal}` : ""}</small>
          </div>
        </div>
      </Card>

      <Card title="Daily targets">
        <div className="target-grid">
          {TARGET_FIELDS.map(({ key, label, unit }) => (
            <label className="field" key={key}>
              <span>{label} <small>({unit})</small></span>
              <input inputMode="numeric" value={values[key] ?? ""} onChange={(event) => setValues({ ...values, [key]: event.target.value.replace(/[^\d.]/g, "") })} />
            </label>
          ))}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn primary block" onClick={() => void saveTargets()}>Save targets</button>
      </Card>

      <Card title="Security & data">
        <ul className="menu">
          <li><button onClick={() => setDialog("password")}><KeyRound size={20} /><span>Change password</span></button></li>
          <li><button onClick={() => void exportData()}><Download size={20} /><span>Download my data</span></button></li>
          <li><button className="danger" onClick={() => setDialog("delete")}><Trash2 size={20} /><span>Delete my account</span></button></li>
        </ul>
      </Card>

      <Card title="About">
        <ul className="menu">
          {PRIVACY_URL && <li><a href={PRIVACY_URL} target="_blank" rel="noreferrer">Privacy policy</a></li>}
          {TERMS_URL && <li><a href={TERMS_URL} target="_blank" rel="noreferrer">Terms of service</a></li>}
          {SUPPORT_EMAIL && <li><a href={`mailto:${SUPPORT_EMAIL}`}>Contact support</a></li>}
        </ul>
        <p className="fineprint">ORVIX provides general fitness and nutrition guidance, not medical advice. Calorie and macro targets are estimates. Speak to a doctor before making big changes to your diet or exercise.</p>
      </Card>

      <button className="btn danger-text block" onClick={onLogout}><LogOut size={18} /> Sign out</button>

      <Sheet open={dialog === "password"} title="Change password" onClose={closeDialog}>
        <label className="field"><span>Current password</span><input type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} /></label>
        <label className="field"><span>New password</span><input type="password" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} placeholder="10+ characters, letters and numbers" /></label>
        <p className="fineprint">Other devices will be signed out after you change it.</p>
        {dialogError && <p className="form-error" role="alert">{dialogError}</p>}
        <button className="btn primary block" disabled={busy || !current || !newPasswordValid} onClick={() => void changePassword()}>{busy ? "Saving…" : "Update password"}</button>
      </Sheet>

      <Sheet open={dialog === "delete"} title="Delete your account?" onClose={closeDialog}>
        <p className="lede small">This signs you out everywhere and schedules your account and all of its data for permanent deletion. You can download your data first.</p>
        <label className="field"><span>Enter your password to confirm</span><input type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} /></label>
        <label className="field"><span>Type DELETE to continue</span><input value={confirmDelete} onChange={(event) => setConfirmDelete(event.target.value)} autoCapitalize="characters" /></label>
        {dialogError && <p className="form-error" role="alert">{dialogError}</p>}
        <button className="btn danger block" disabled={busy || !current || confirmDelete !== "DELETE"} onClick={() => void deleteAccount()}>{busy ? "Deleting…" : "Permanently delete my account"}</button>
      </Sheet>
    </div>
  );
}
