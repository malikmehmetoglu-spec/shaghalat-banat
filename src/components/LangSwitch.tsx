"use client";
import { setLang, useLang } from "./LangProvider";

/** تبديل لغة التطبيق (عربي / English) */
export function LangSwitch() {
  const lang = useLang();
  return (
    <div className="seg" role="group" aria-label="Language">
      {(["ar", "en"] as const).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => lang !== l && setLang(l)}
          style={{ flex: 1, height: 44, borderRadius: 20, border: 0, fontSize: 14, lineHeight: 1, fontWeight: lang === l ? 600 : 500, color: lang === l ? "var(--magenta)" : "var(--text-muted)", background: lang === l ? "#fff" : "transparent", cursor: "pointer", font: "inherit" }}>
          {l === "ar" ? "العربية" : "English"}
        </button>
      ))}
    </div>
  );
}
