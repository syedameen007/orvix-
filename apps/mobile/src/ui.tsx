import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, X } from "lucide-react";
import { formatNumber } from "./lib.js";

/* ---------- Toasts ---------- */
const ToastContext = createContext<(message: string) => void>(() => undefined);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const show = useCallback((next: string) => {
    setMessage(next);
    window.setTimeout(() => setMessage((current) => (current === next ? null : current)), 2600);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

/* ---------- Calorie ring ---------- */
export function Ring({ value, target, size = 168 }: { value: number; target?: number | null; size?: number }) {
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = target && target > 0 ? Math.min(1, value / target) : 0;
  const over = target ? value > target : false;
  const remaining = target ? Math.round(target - value) : null;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} className="ring-track" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={over ? "ring-value over" : "ring-value"}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-label">
        <strong>{remaining === null ? formatNumber(value) : formatNumber(Math.abs(remaining))}</strong>
        <span>{remaining === null ? "kcal eaten" : over ? "kcal over" : "kcal left"}</span>
      </div>
    </div>
  );
}

/* ---------- Macro bar ---------- */
export function MacroBar({ label, value, target, tone }: { label: string; value?: number | null; target?: number | null; tone: "protein" | "carbs" | "fat" }) {
  const current = value ?? 0;
  const percent = target && target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div className="macro">
      <div className="macro-head">
        <span>{label}</span>
        <b>
          {formatNumber(current)}
          {target ? <small> / {formatNumber(target)} g</small> : <small> g</small>}
        </b>
      </div>
      <div className="bar" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <i className={`tone-${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/* ---------- Layout helpers ---------- */
export function ScreenHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <header className="screen-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  );
}

export function Card({ title, aside, children, className = "" }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || aside) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <strong>{title}</strong>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ height = 16, width = "100%" }: { height?: number; width?: string | number }) {
  return <div className="skeleton" style={{ height, width }} />;
}

export function Chips<T extends string>({ options, value, onChange, format }: { options: readonly T[]; value: T; onChange: (next: T) => void; format?: (v: T) => string }) {
  return (
    <div className="chips" role="tablist">
      {options.map((option) => (
        <button key={option} role="tab" aria-selected={value === option} className={value === option ? "chip active" : "chip"} onClick={() => onChange(option)}>
          {format ? format(option) : option}
        </button>
      ))}
    </div>
  );
}

export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
