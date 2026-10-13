import { useCallback, useEffect, useState } from "react";
import { Droplets, Dumbbell, Plus, ScanBarcode, Scale, Utensils } from "lucide-react";
import { apiRequest } from "../api.js";
import { Card, EmptyState, MacroBar, Ring, ScreenHeader, Skeleton, useToast } from "../ui.js";
import { MEAL_TYPES, errorMessage, formatNumber, greeting, mealLabel, todayISO, type DailyResponse, type Profile, type View } from "../lib.js";

const WATER_STEP = 250;

export function Today({ token, profile, go }: { token: string; profile: Profile | null; go: (view: View) => void }) {
  const toast = useToast();
  const [daily, setDaily] = useState<DailyResponse | null>(null);
  const [waterMl, setWaterMl] = useState(0);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const date = todayISO();
      const [meals, water] = await Promise.all([
        apiRequest<DailyResponse>({ token }, `/meals/daily?date=${date}`),
        apiRequest<{ totalMl: number }>({ token }, `/water/daily?date=${date}`)
      ]);
      setDaily(meals);
      setWaterMl(water.totalMl);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Couldn't load today's data."));
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addWater() {
    const previous = waterMl;
    setWaterMl(previous + WATER_STEP);
    try {
      await apiRequest({ token }, "/water", { method: "POST", body: JSON.stringify({ date: todayISO(), amountMl: WATER_STEP }) });
      toast(`+${WATER_STEP} ml logged`);
    } catch (err) {
      setWaterMl(previous);
      setError(errorMessage(err));
    }
  }

  const name = profile?.name?.split(" ")[0] ?? "there";
  const total = daily?.total;
  const targets = daily?.targets;
  const waterTarget = targets?.waterMl ?? profile?.waterTargetMl ?? 2500;
  const mealCount = daily?.meals.length ?? 0;
  const nudge = !daily
    ? ""
    : mealCount === 0
      ? "Start by logging your first meal. Even a rough entry counts."
      : (total?.proteinG ?? 0) < (targets?.proteinG ?? 0) * 0.5
        ? "Protein is a bit low so far. Eggs, dal, paneer or chicken would help."
        : "You're on track. Keep it up.";

  return (
    <div className="screen">
      <ScreenHeader eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} title={`${greeting()}, ${name}`} />
      {error && <p className="form-error" role="alert">{error}</p>}

      <Card className="hero-card">
        {daily ? (
          <div className="hero-row">
            <Ring value={total?.calories ?? 0} target={targets?.calories} />
            <div className="hero-side">
              <div><span>Eaten</span><strong>{formatNumber(total?.calories)}</strong></div>
              <div><span>Goal</span><strong>{formatNumber(targets?.calories)}</strong></div>
            </div>
          </div>
        ) : (
          <Skeleton height={168} />
        )}
        {nudge && <p className="nudge">{nudge}</p>}
      </Card>

      <div className="quick-actions">
        <button onClick={() => go("eat")}><span><Utensils size={20} /></span>Log food</button>
        <button onClick={() => go("eat")}><span><ScanBarcode size={20} /></span>Scan</button>
        <button onClick={() => go("train")}><span><Dumbbell size={20} /></span>Workout</button>
        <button onClick={() => go("progress")}><span><Scale size={20} /></span>Weigh in</button>
      </div>

      <Card title="Macros">
        <div className="macro-list">
          <MacroBar label="Protein" value={total?.proteinG} target={targets?.proteinG} tone="protein" />
          <MacroBar label="Carbs" value={total?.carbsG} target={targets?.carbsG} tone="carbs" />
          <MacroBar label="Fat" value={total?.fatG} target={targets?.fatG} tone="fat" />
        </div>
      </Card>

      <Card
        title="Water"
        aside={
          <button className="btn small" onClick={() => void addWater()}>
            <Plus size={16} /> {WATER_STEP} ml
          </button>
        }
      >
        <div className="water-row">
          <Droplets size={22} className="water-icon" />
          <div className="bar water"><i style={{ width: `${Math.min(100, (waterMl / waterTarget) * 100)}%` }} /></div>
          <b>{formatNumber(waterMl / 1000, 2)} / {formatNumber(waterTarget / 1000, 1)} L</b>
        </div>
      </Card>

      <Card title="Today's meals">
        {!daily ? (
          <Skeleton height={48} />
        ) : mealCount === 0 ? (
          <EmptyState icon={<Utensils size={24} />} title="Nothing logged yet" hint="Search for a food or scan a barcode to add your first meal." action={<button className="btn primary small" onClick={() => go("eat")}>Log a meal</button>} />
        ) : (
          <ul className="list">
            {MEAL_TYPES.flatMap((type) => daily.meals.filter((meal) => meal.mealType === type)).concat(daily.meals.filter((meal) => !MEAL_TYPES.includes(meal.mealType as never))).map((meal) => (
              <li key={meal.id}>
                <div>
                  <strong>{meal.customName ?? mealLabel(meal.mealType)}</strong>
                  <small>{meal.items.map((item) => item.foodSnapshot?.name).filter(Boolean).join(", ") || `${meal.items.length} items`}</small>
                </div>
                <b>{formatNumber(meal.calories)} kcal</b>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
