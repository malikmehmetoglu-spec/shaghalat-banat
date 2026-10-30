"use client";

/** خانة مبلغ كبيرة مع تبديل الليرة/الدولار ومعاينة التحويل */
export function AmountField({ value, onChange, currency, onCurrency, rate, label = "المبلغ", allowUsd = true, autoFocus }: {
  value: string; onChange: (v: string) => void; currency: "SYP" | "USD"; onCurrency: (c: "SYP" | "USD") => void; rate: number; label?: string; allowUsd?: boolean; autoFocus?: boolean;
}) {
  const n = Number(value);
  return (
    <div className="fin-amount">
      <span className="fin-label">{label}</span>
      <div className="fin-amount-box">
        <input inputMode="decimal" type="number" min="0" step="any" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" autoFocus={autoFocus} aria-label={label} />
        {allowUsd ? (
          <div className="fin-cur" role="radiogroup" aria-label="العملة">
            {(["SYP", "USD"] as const).map((c) => (
              <button key={c} type="button" role="radio" aria-checked={currency === c} className={currency === c ? "on" : ""} onClick={() => onCurrency(c)}>{c === "SYP" ? "ل.س" : "$"}</button>
            ))}
          </div>
        ) : <span className="fin-cur-fixed">ل.س</span>}
      </div>
      {currency === "USD" && n > 0 && (
        <span className="fin-hint num">{rate > 0 ? `≈ ${Math.round(n * rate).toLocaleString("en-US")} ل.س · بسعر ${rate.toLocaleString("en-US")}` : "سعر الدولار غير محدد في الإعدادات"}</span>
      )}
    </div>
  );
}
