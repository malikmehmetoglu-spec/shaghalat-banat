"use client";
import { Icon } from "@/components/Icon";

export type Place = { code: string; name: string; balance?: number | null };
const ICON: Record<string, Parameters<typeof Icon>[0]["name"]> = { "1120": "card", "1110": "boxes", "3100": "shield" };

/** اختيار مكان المال: بطاقات بالرصيد الحالي */
export function PlacePicker({ label, places, value, onChange, disabled }: { label: string; places: Place[]; value: string; onChange: (c: string) => void; disabled?: string }) {
  return (
    <div className="fin-field">
      <span className="fin-label">{label}</span>
      <div className="fin-places" role="radiogroup" aria-label={label}>
        {places.map((p) => (
          <button key={p.code} type="button" role="radio" aria-checked={value === p.code} disabled={disabled === p.code}
            className={`fin-place fin-p-${p.code}${value === p.code ? " on" : ""}`} onClick={() => onChange(p.code)}>
            <span className="fin-place-ic"><Icon name={ICON[p.code] ?? "card"} size={18} stroke={2} /></span>
            <span className="fin-place-t">
              <b>{p.name}</b>
              {p.balance != null && <span className="num">{Math.round(p.balance).toLocaleString("en-US")} ل.س</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
