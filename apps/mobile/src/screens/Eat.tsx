import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Minus, Mic, Plus, Search, ShoppingBasket, Trash2, X } from "lucide-react";
import { apiRequest } from "../api.js";
import { Card, Chips, EmptyState, ScreenHeader, Sheet, useToast } from "../ui.js";
import { MEAL_TYPES, defaultMealType, errorMessage, foodScale, formatNumber, mealLabel, todayISO, unitOptions, useDebounced, type FoodResult } from "../lib.js";

interface DraftItem {
  key: string;
  food: FoodResult;
  quantity: number;
  unit: string;
}

interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike;
  }
}

const SUGGESTIONS = ["egg", "rice", "chapati", "dal", "paneer", "banana", "chicken", "milk"];

function scaleFor(item: DraftItem) {
  return foodScale(item.food.serving, item.quantity, item.unit) ?? 0;
}

/** Re-express the same amount of food in a different unit (e.g. 2 idli -> grams). */
function convertQuantity(item: DraftItem, nextUnit: string) {
  const perOne = foodScale(item.food.serving, 1, nextUnit);
  if (!perOne) return item.quantity;
  return Math.round((scaleFor(item) / perOne) * 10) / 10;
}

export function Eat({ token, onSaved }: { token: string; onSaved: () => void }) {
  const toast = useToast();
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]>(defaultMealType() as (typeof MEAL_TYPES)[number]);
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim());
  const [results, setResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [voiceText, setVoiceText] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    apiRequest<{ results: FoodResult[] }>({ token }, `/foods/search?q=${encodeURIComponent(debounced)}`)
      .then((payload) => !cancelled && setResults(payload.results))
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setSearching(false));
    return () => {
      cancelled = true;
    };
  }, [debounced, token]);

  const totals = useMemo(
    () =>
      draft.reduce(
        (sum, item) => {
          const scale = scaleFor(item);
          return { calories: sum.calories + (item.food.nutrientsPerServing.calories ?? 0) * scale, protein: sum.protein + (item.food.nutrientsPerServing.proteinG ?? 0) * scale };
        },
        { calories: 0, protein: 0 }
      ),
    [draft]
  );

  function addFood(food: FoodResult, quantity = food.serving.baseQuantity, unit = food.serving.baseUnit) {
    if (foodScale(food.serving, quantity, unit) === null) {
      quantity = food.serving.baseQuantity;
      unit = food.serving.baseUnit;
    }
    setDraft((items) => [...items, { key: `${food.id}-${Date.now()}-${items.length}`, food, quantity, unit }]);
    toast(`Added ${food.name}`);
  }

  function update(key: string, patch: Partial<DraftItem>) {
    setDraft((items) => items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  async function saveMeal() {
    setSaving(true);
    setError("");
    try {
      await apiRequest({ token }, "/meals", {
        method: "POST",
        body: JSON.stringify({ date: todayISO(), mealType, items: draft.map((item) => ({ foodId: item.food.id, quantity: item.quantity, unit: item.unit })) })
      });
      setDraft([]);
      setSheetOpen(false);
      toast(`${mealLabel(mealType)} saved`);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  /* ----- barcode ----- */
  function stopCamera() {
    runningRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }
  useEffect(() => stopCamera, []);

  async function lookupBarcode(code: string) {
    setScanNote("Looking up product…");
    try {
      const payload = await apiRequest<{ food: FoodResult }>({ token }, "/scanner/barcode", { method: "POST", body: JSON.stringify({ code, mealType, date: todayISO() }) });
      setScanNote("");
      toast(`Added ${payload.food.name} to ${mealLabel(mealType).toLowerCase()}`);
      onSaved();
    } catch (err) {
      setScanNote(errorMessage(err, "We couldn't find that product."));
    }
  }

  async function startScan() {
    setScanNote("");
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setScanNote("Barcode scanning isn't supported on this device. Try searching by name instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const video = videoRef.current;
      if (!video) return stopCamera();
      video.srcObject = stream;
      await video.play();
      const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
      runningRef.current = true;
      const tick = async () => {
        if (!runningRef.current) return;
        try {
          const found = await detector.detect(video);
          const value = found[0]?.rawValue;
          if (value) {
            stopCamera();
            await lookupBarcode(value);
            return;
          }
        } catch {
          /* frame not ready yet */
        }
        requestAnimationFrame(() => void tick());
      };
      void tick();
    } catch {
      stopCamera();
      setScanNote("Camera access was blocked. Allow camera permission and try again.");
    }
  }

  /* ----- "say what you ate" ----- */
  async function parseVoice() {
    if (!voiceText.trim()) return;
    setError("");
    try {
      const payload = await apiRequest<{ parsed: Array<{ quantity: number; unit: string; query: string; matches: FoodResult[] }> }>({ token }, "/scanner/voice", {
        method: "POST",
        body: JSON.stringify({ transcript: voiceText })
      });
      let added = 0;
      for (const item of payload.parsed) {
        const match = item.matches[0];
        if (match) {
          addFood(match, item.quantity, item.unit);
          added += 1;
        }
      }
      if (added === 0) setError("We couldn't match those foods. Try searching by name.");
      else {
        setVoiceText("");
        setVoiceOpen(false);
        setSheetOpen(true);
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="screen with-sticky">
      <ScreenHeader eyebrow="Fuel" title="Log food" />
      <Chips options={MEAL_TYPES} value={mealType} onChange={setMealType} format={mealLabel} />

      <div className="searchbar">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a food, e.g. “boiled egg”" aria-label="Search foods" />
        {query && (
          <button className="icon-btn" aria-label="Clear search" onClick={() => setQuery("")}>
            <X size={18} />
          </button>
        )}
      </div>

      <div className="tool-row">
        <button className="btn tonal" onClick={() => void (scanning ? stopCamera() : startScan())}>
          <Camera size={18} /> {scanning ? "Stop scanning" : "Scan barcode"}
        </button>
        <button className="btn tonal" onClick={() => setVoiceOpen(true)}>
          <Mic size={18} /> Say what you ate
        </button>
      </div>

      {scanning && <video ref={videoRef} className="scan-video" muted playsInline />}
      {scanNote && <p className="note">{scanNote}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {debounced.length < 2 ? (
        <Card title="Try searching for">
          <div className="suggestions">
            {SUGGESTIONS.map((word) => (
              <button key={word} className="chip" onClick={() => setQuery(word)}>{word}</button>
            ))}
          </div>
        </Card>
      ) : searching && results.length === 0 ? (
        <p className="note">Searching…</p>
      ) : results.length === 0 ? (
        <EmptyState icon={<Search size={24} />} title={`No matches for “${debounced}”`} hint="Check the spelling or try a simpler word." />
      ) : (
        <ul className="food-list">
          {results.map((food) => (
            <li key={food.id}>
              <div className="food-main">
                <strong>{food.brandName ? `${food.name} · ${food.brandName}` : food.name}</strong>
                <small>
                  {formatNumber(food.nutrientsPerServing.calories)} kcal · per {food.serving.label ?? `${food.serving.baseQuantity} ${food.serving.baseUnit}`}
                </small>
                <div className="pills">
                  <span>P {formatNumber(food.nutrientsPerServing.proteinG, 1)}g</span>
                  <span>C {formatNumber(food.nutrientsPerServing.carbsG, 1)}g</span>
                  <span>F {formatNumber(food.nutrientsPerServing.fatG, 1)}g</span>
                </div>
              </div>
              <button className="icon-btn filled" aria-label={`Add ${food.name}`} onClick={() => addFood(food)}>
                <Plus size={20} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {draft.length > 0 && (
        <button className="sticky-bar" onClick={() => setSheetOpen(true)}>
          <span className="sticky-count"><ShoppingBasket size={18} /> {draft.length}</span>
          <span>Review {mealLabel(mealType).toLowerCase()}</span>
          <b>{formatNumber(totals.calories)} kcal</b>
        </button>
      )}

      <Sheet open={sheetOpen} title={`Your ${mealLabel(mealType).toLowerCase()}`} onClose={() => setSheetOpen(false)}>
        {draft.length === 0 ? (
          <EmptyState icon={<ShoppingBasket size={24} />} title="Nothing added yet" hint="Search for a food and tap + to add it." />
        ) : (
          <>
            <ul className="draft-list">
              {draft.map((item) => (
                <li key={item.key}>
                  <div className="draft-top">
                    <strong>{item.food.name}</strong>
                    <button className="icon-btn" aria-label={`Remove ${item.food.name}`} onClick={() => setDraft((items) => items.filter((entry) => entry.key !== item.key))}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="stepper-row">
                    <div className="stepper">
                      <button aria-label="Decrease" onClick={() => update(item.key, { quantity: Math.max(0, item.quantity - (item.unit === "g" || item.unit === "ml" ? 10 : 1)) })}><Minus size={16} /></button>
                      <input
                        inputMode="decimal"
                        value={item.quantity}
                        aria-label="Quantity"
                        onChange={(event) => update(item.key, { quantity: Number(event.target.value.replace(/[^\d.]/g, "")) || 0 })}
                      />
                      <button aria-label="Increase" onClick={() => update(item.key, { quantity: item.quantity + (item.unit === "g" || item.unit === "ml" ? 10 : 1) })}><Plus size={16} /></button>
                    </div>
                    <select value={item.unit} aria-label="Unit" onChange={(event) => update(item.key, { unit: event.target.value, quantity: convertQuantity(item, event.target.value) })}>
                      {unitOptions(item.food.serving).map((unit) => (
                        <option key={unit}>{unit}</option>
                      ))}
                    </select>
                    <b>{formatNumber((item.food.nutrientsPerServing.calories ?? 0) * scaleFor(item))} kcal</b>
                  </div>
                </li>
              ))}
            </ul>
            <div className="sheet-total">
              <span>Total</span>
              <strong>{formatNumber(totals.calories)} kcal · {formatNumber(totals.protein)} g protein</strong>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn primary block" disabled={saving || draft.some((item) => item.quantity <= 0)} onClick={() => void saveMeal()}>
              {saving ? "Saving…" : `Save ${mealLabel(mealType).toLowerCase()}`}
            </button>
          </>
        )}
      </Sheet>

      <Sheet open={voiceOpen} title="Say what you ate" onClose={() => setVoiceOpen(false)}>
        <p className="lede small">Type or dictate it naturally. We'll match each food and let you review before saving.</p>
        <textarea rows={4} value={voiceText} onChange={(event) => setVoiceText(event.target.value)} placeholder="2 eggs, 2 chapatis and 200 ml milk" />
        <button className="btn primary block" disabled={!voiceText.trim()} onClick={() => void parseVoice()}>Find these foods</button>
      </Sheet>
    </div>
  );
}
