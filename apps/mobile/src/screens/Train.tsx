import { useCallback, useEffect, useState } from "react";
import { Dumbbell, Plus, Search, Trash2, X } from "lucide-react";
import { apiRequest } from "../api.js";
import { Card, EmptyState, ScreenHeader, Sheet, useToast } from "../ui.js";
import { errorMessage, useDebounced, type ExerciseResult } from "../lib.js";

interface Workout {
  id: string;
  name: string;
  exercises: Array<{ id: string; exercise: { name: string } }>;
  _count?: { sessions: number };
}

interface Starter {
  key: string;
  name: string;
  level: string;
  daysPerWeek: number;
  equipment: "none" | "dumbbells" | "gym";
  summary: string;
  exercises: Array<{ name: string; sets: number; reps: string }>;
}

const EQUIPMENT_LABEL = { none: "No equipment", dumbbells: "Dumbbells", gym: "Gym" } as const;
const MUSCLES = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];

export function Train({ token }: { token: string }) {
  const toast = useToast();
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [starters, setStarters] = useState<Starter[]>([]);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [name, setName] = useState("My workout");
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim());
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [picked, setPicked] = useState<ExerciseResult[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [payload, starterPayload] = await Promise.all([
        apiRequest<{ workouts: Workout[] }>({ token }, "/workouts"),
        apiRequest<{ routines: Starter[] }>({ token }, "/workouts/starters").catch(() => ({ routines: [] as Starter[] }))
      ]);
      setWorkouts(payload.workouts);
      setStarters(starterPayload.routines);
    } catch (err) {
      setError(errorMessage(err));
      setWorkouts([]);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (debounced.length < 2) return setResults([]);
    let cancelled = false;
    apiRequest<{ results: ExerciseResult[] }>({ token }, `/exercises/search?q=${encodeURIComponent(debounced)}`)
      .then((payload) => !cancelled && setResults(payload.results))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [debounced, token]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      await apiRequest({ token }, "/workouts", { method: "POST", body: JSON.stringify({ name: name.trim() || "My workout", exercises: picked.map((exercise, order) => ({ exerciseId: exercise.id, order })) }) });
      toast("Workout saved");
      setPicked([]);
      setQuery("");
      setName("My workout");
      setBuilderOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function addStarter(routine: Starter) {
    setAddingKey(routine.key);
    setError("");
    try {
      await apiRequest({ token }, `/workouts/starters/${routine.key}`, { method: "POST" });
      toast(`${routine.name} added`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAddingKey(null);
    }
  }

  async function remove(id: string) {
    try {
      await apiRequest({ token }, `/workouts/${id}`, { method: "DELETE" });
      setWorkouts((items) => items?.filter((item) => item.id !== id) ?? null);
      toast("Workout removed");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="screen">
      <ScreenHeader eyebrow="Move" title="Train" action={<button className="btn primary small" onClick={() => setBuilderOpen(true)}><Plus size={16} /> New</button>} />
      {error && <p className="form-error" role="alert">{error}</p>}

      {workouts === null ? null : workouts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Dumbbell size={26} />}
            title="Build your first workout"
            hint="Pick a few exercises you enjoy. Beginners do well with 4–6 moves, 2–3 times a week."
            action={<button className="btn primary" onClick={() => setBuilderOpen(true)}>Create a workout</button>}
          />
        </Card>
      ) : (
        <ul className="workout-list">
          {workouts.map((workout) => (
            <li key={workout.id} className="card">
              <div className="card-head">
                <h2>{workout.name}</h2>
                <button className="icon-btn" aria-label={`Delete ${workout.name}`} onClick={() => void remove(workout.id)}><Trash2 size={18} /></button>
              </div>
              <p className="muted">{workout.exercises.map((entry) => entry.exercise.name).join(" · ") || "No exercises"}</p>
              <small className="muted">{workout.exercises.length} exercises{workout._count ? ` · done ${workout._count.sessions}×` : ""}</small>
            </li>
          ))}
        </ul>
      )}

      {workouts !== null && starters.some((routine) => !workouts.some((workout) => workout.name === routine.name)) && (
        <section aria-label="Ready-made routines" className="starter-section">
          <h2>Ready-made routines</h2>
          <p className="muted">Not sure where to start? Add one of these and adjust it any time.</p>
          <ul className="starter-list">
            {starters
              .filter((routine) => !workouts.some((workout) => workout.name === routine.name))
              .map((routine) => (
                <li key={routine.key} className="card">
                  <div className="card-head">
                    <h2>{routine.name}</h2>
                    <button className="btn small" disabled={addingKey === routine.key} onClick={() => void addStarter(routine)}>
                      {addingKey === routine.key ? "Adding…" : "Add"}
                    </button>
                  </div>
                  <div className="pills">
                    <span>{routine.daysPerWeek}× / week</span>
                    <span>{EQUIPMENT_LABEL[routine.equipment]}</span>
                    <span>{routine.exercises.length} exercises</span>
                  </div>
                  <p className="muted starter-summary">{routine.summary}</p>
                </li>
              ))}
          </ul>
        </section>
      )}

      <Sheet open={builderOpen} title="New workout" onClose={() => setBuilderOpen(false)}>
        <label className="field"><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <div className="searchbar">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exercises" aria-label="Search exercises" />
          {query && <button className="icon-btn" aria-label="Clear" onClick={() => setQuery("")}><X size={18} /></button>}
        </div>
        <div className="suggestions">
          {MUSCLES.map((muscle) => <button key={muscle} className="chip" onClick={() => setQuery(muscle.toLowerCase())}>{muscle}</button>)}
        </div>
        {results.length > 0 && (
          <ul className="food-list compact">
            {results.map((exercise) => {
              const added = picked.some((entry) => entry.id === exercise.id);
              return (
                <li key={exercise.id}>
                  <div className="food-main">
                    <strong>{exercise.name}</strong>
                    <small>{exercise.primaryMuscles.join(", ")}{exercise.equipment.length ? ` · ${exercise.equipment.join(", ")}` : ""}</small>
                  </div>
                  <button className={added ? "btn small tonal" : "btn small"} onClick={() => setPicked((items) => (added ? items.filter((entry) => entry.id !== exercise.id) : [...items, exercise]))}>
                    {added ? "Added" : "Add"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {picked.length > 0 && <p className="note"><b>{picked.length}</b> selected: {picked.map((exercise) => exercise.name).join(", ")}</p>}
        <button className="btn primary block" disabled={saving || picked.length === 0} onClick={() => void save()}>{saving ? "Saving…" : "Save workout"}</button>
      </Sheet>
    </div>
  );
}
