import { useState } from "react";
import { ArrowLeft, Dumbbell, Flame, HeartPulse, Scale, Check } from "lucide-react";
import { apiRequest } from "../api.js";
import { errorMessage, formatNumber, type Profile } from "../lib.js";

type Goal = "LOSE_FAT" | "BUILD_MUSCLE" | "MAINTAIN" | "GET_FITTER";
type Activity = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE";
type Sex = "MALE" | "FEMALE" | "OTHER";

interface Plan {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
}

const GOALS: Array<{ id: Goal; title: string; hint: string; icon: typeof Flame }> = [
  { id: "LOSE_FAT", title: "Lose fat", hint: "Gentle calorie deficit, high protein", icon: Flame },
  { id: "BUILD_MUSCLE", title: "Build muscle", hint: "Slight surplus to fuel growth", icon: Dumbbell },
  { id: "GET_FITTER", title: "Get fitter", hint: "Feel better and move more", icon: HeartPulse },
  { id: "MAINTAIN", title: "Stay where I am", hint: "Keep my current weight", icon: Scale }
];

const ACTIVITY: Array<{ id: Activity; title: string; hint: string }> = [
  { id: "SEDENTARY", title: "Mostly sitting", hint: "Desk job, little exercise" },
  { id: "LIGHT", title: "Lightly active", hint: "Walks or workouts 1–3 days a week" },
  { id: "MODERATE", title: "Moderately active", hint: "Exercise 3–5 days a week" },
  { id: "ACTIVE", title: "Very active", hint: "Hard training 6–7 days or a physical job" }
];

const TOTAL_STEPS = 5;

export function Onboarding({ token, defaultName, onDone }: { token: string; defaultName: string; onDone: (profile: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [name, setName] = useState(defaultName);
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<Activity | null>(null);
  const [plan, setPlan] = useState<{ profile: Profile; targets: Plan } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ageN = Number(age);
  const heightN = Number(height);
  const weightN = Number(weight);

  const canContinue = [
    goal !== null,
    name.trim().length > 0 && sex !== null && ageN >= 13 && ageN <= 100,
    heightN >= 100 && heightN <= 250 && weightN >= 30 && weightN <= 300,
    activity !== null,
    true
  ][step];

  async function build() {
    if (!goal || !sex || !activity) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<{ profile: Profile; targets: Plan }>({ token }, "/profile/onboard", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), goal, sex, age: ageN, heightCm: heightN, weightKg: weightN, activityLevel: activity, trainingExperience: "BEGINNER" })
      });
      setPlan(result);
      setStep(4);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (step === 3) void build();
    else if (step === 4 && plan) onDone(plan.profile);
    else setStep((value) => value + 1);
  }

  return (
    <main className="onboarding">
      <div className="onboarding-top">
        {step > 0 && step < 4 ? (
          <button className="icon-btn" aria-label="Back" onClick={() => setStep((value) => value - 1)}>
            <ArrowLeft size={20} />
          </button>
        ) : (
          <span style={{ width: 40 }} />
        )}
        <div className="steps" aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}>
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <i key={index} className={index <= step ? "on" : ""} />
          ))}
        </div>
        <span style={{ width: 40 }} />
      </div>

      <div className="onboarding-body">
        {step === 0 && (
          <>
            <h1>What's your main goal?</h1>
            <p className="lede">We'll shape your daily targets around it. You can change this any time.</p>
            <div className="option-list">
              {GOALS.map(({ id, title, hint, icon: Icon }) => (
                <button key={id} className={goal === id ? "option selected" : "option"} onClick={() => setGoal(id)}>
                  <span className="option-icon"><Icon size={22} /></span>
                  <span className="option-text"><strong>{title}</strong><small>{hint}</small></span>
                  {goal === id && <Check size={20} className="option-check" />}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1>Tell us about you</h1>
            <p className="lede">This helps us estimate how much energy your body uses.</p>
            <label className="field"><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
            <div className="field">
              <span>Sex</span>
              <div className="segmented">
                {(["MALE", "FEMALE", "OTHER"] as const).map((value) => (
                  <button key={value} type="button" className={sex === value ? "active" : ""} onClick={() => setSex(value)}>
                    {value === "OTHER" ? "Other" : value === "MALE" ? "Male" : "Female"}
                  </button>
                ))}
              </div>
            </div>
            <label className="field"><span>Age</span><input inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value.replace(/\D/g, ""))} placeholder="25" /></label>
          </>
        )}

        {step === 2 && (
          <>
            <h1>Your body today</h1>
            <p className="lede">Just your starting point, no judgement. Only you can see this.</p>
            <label className="field"><span>Height (cm)</span><input inputMode="decimal" value={height} onChange={(event) => setHeight(event.target.value)} placeholder="170" /></label>
            <label className="field"><span>Weight (kg)</span><input inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="70" /></label>
          </>
        )}

        {step === 3 && (
          <>
            <h1>How active are you?</h1>
            <p className="lede">Think about a typical week, outside of any new plan.</p>
            <div className="option-list">
              {ACTIVITY.map(({ id, title, hint }) => (
                <button key={id} className={activity === id ? "option selected" : "option"} onClick={() => setActivity(id)}>
                  <span className="option-text"><strong>{title}</strong><small>{hint}</small></span>
                  {activity === id && <Check size={20} className="option-check" />}
                </button>
              ))}
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
          </>
        )}

        {step === 4 && plan && (
          <>
            <h1>Your plan is ready{name ? `, ${name.split(" ")[0]}` : ""}</h1>
            <p className="lede">Here's what to aim for each day. These are estimates, and you can fine-tune them in Profile.</p>
            <div className="plan-hero">
              <strong>{formatNumber(plan.targets.calories)}</strong>
              <span>calories per day</span>
            </div>
            <div className="plan-grid">
              <div><b>{formatNumber(plan.targets.proteinG)}g</b><span>Protein</span></div>
              <div><b>{formatNumber(plan.targets.carbsG)}g</b><span>Carbs</span></div>
              <div><b>{formatNumber(plan.targets.fatG)}g</b><span>Fat</span></div>
              <div><b>{formatNumber(plan.targets.waterMl / 1000, 1)}L</b><span>Water</span></div>
            </div>
            <p className="fineprint">ORVIX gives general fitness guidance, not medical advice. Talk to a doctor before big diet or exercise changes.</p>
          </>
        )}
      </div>

      <div className="onboarding-footer">
        <button className="btn primary block" disabled={!canContinue || busy} onClick={next}>
          {busy ? "Building your plan…" : step === 3 ? "Build my plan" : step === 4 ? "Start tracking" : "Continue"}
        </button>
      </div>
    </main>
  );
}
