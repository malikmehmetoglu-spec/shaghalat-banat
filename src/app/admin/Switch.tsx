"use client";

/** مفتاح تشغيل/إيقاف — حسب نظام التصميم (المقبض في البداية عند التشغيل) */
export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      style={{ width: 44, height: 26, flexShrink: 0, padding: 3, border: "none", borderRadius: 13, display: "flex", justifyContent: on ? "flex-start" : "flex-end", background: on ? "var(--magenta)" : "var(--switch-off)", cursor: disabled ? "not-allowed" : "pointer" }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff" }} />
    </button>
  );
}
