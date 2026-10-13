import { useCallback, useEffect, useState } from "react";
import { Scale, TrendingDown, TrendingUp } from "lucide-react";
import { apiRequest } from "../api.js";
import { Card, EmptyState, ScreenHeader, useToast } from "../ui.js";
import { errorMessage, formatNumber, type Profile } from "../lib.js";

interface WeightEntry {
  id: string;
  weightKg: number;
  measuredAt: string;
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const width = 320;
  const height = 120;
  const pad = 10;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points.map((value, index) => [pad + (index / (points.length - 1)) * (width - pad * 2), height - pad - ((value - min) / span) * (height - pad * 2)] as const);
  const path = coords.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sparkline" role="img" aria-label="Weight trend">
      <path d={path} fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {last && <circle cx={last[0]} cy={last[1]} r="5" />}
    </svg>
  );
}

export function Progress({ token, profile, onWeight }: { token: string; profile: Profile | null; onWeight: (kg: number) => void }) {
  const toast = useToast();
  const [entries, setEntries] = useState<WeightEntry[] | null>(null);
  const [weight, setWeight] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const payload = await apiRequest<{ weights: WeightEntry[] }>({ token }, "/progress");
      setEntries(payload.weights);
    } catch (err) {
      setError(errorMessage(err));
      setEntries([]);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    const value = Number(weight);
    if (!(value >= 30 && value <= 300)) return setError("Enter a weight between 30 and 300 kg.");
    setError("");
    try {
      await apiRequest({ token }, "/progress/weight", { method: "POST", body: JSON.stringify({ weightKg: value }) });
      setWeight("");
      toast("Weight logged");
      onWeight(value);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const chronological = [...(entries ?? [])].reverse();
  const latest = entries?.[0]?.weightKg ?? profile?.currentWeightKg ?? null;
  const start = profile?.startingWeightKg ?? chronological[0]?.weightKg ?? null;
  const change = latest !== null && start !== null ? latest - start : null;
  const target = profile?.targetWeightKg ?? null;

  return (
    <div className="screen">
      <ScreenHeader eyebrow="Results" title="Progress" />

      <Card>
        <div className="stat-row">
          <div><span>Current</span><strong>{formatNumber(latest, 1)}<small> kg</small></strong></div>
          <div>
            <span>Change</span>
            <strong className={change === null ? "" : change <= 0 ? "good" : "warn"}>
              {change === null ? "–" : <>{change > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />} {formatNumber(Math.abs(change), 1)}<small> kg</small></>}
            </strong>
          </div>
          {target && <div><span>Goal</span><strong>{formatNumber(target, 1)}<small> kg</small></strong></div>}
        </div>
        <Sparkline points={chronological.map((entry) => entry.weightKg)} />
      </Card>

      <Card title="Log today's weight">
        <div className="inline-field">
          <input inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="e.g. 72.5" aria-label="Weight in kg" />
          <span>kg</span>
          <button className="btn primary" onClick={() => void save()}>Save</button>
        </div>
        <p className="fineprint">Weigh yourself at the same time each day, ideally in the morning. The trend matters more than any single day.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
      </Card>

      <Card title="History">
        {entries === null ? null : entries.length === 0 ? (
          <EmptyState icon={<Scale size={24} />} title="No weigh-ins yet" hint="Log your weight above to start your trend line." />
        ) : (
          <ul className="list">
            {entries.slice(0, 14).map((entry) => (
              <li key={entry.id}>
                <span>{new Date(entry.measuredAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                <b>{formatNumber(entry.weightKg, 1)} kg</b>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
