"use client";
import { useState } from "react";
import { useT } from "./LangProvider";

/** أدوات الدفع من نفس الهاتف: حفظ رمز QR كصورة (لرفعه في تطبيق شام كاش) ونسخ كود الحساب */
export function ShamCashTools({ qr, code }: { qr: string | null; code: string | null }) {
  const t = useT();
  const [saved, setSaved] = useState<"" | "busy" | "ok" | "fail">("");
  const [copied, setCopied] = useState(false);

  async function saveQr() {
    if (!qr) return;
    setSaved("busy");
    try {
      const blob = await (await fetch(qr, { mode: "cors" })).blob();
      const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
      const file = new File([blob], `shamcash-shaghalat-banat.${ext}`, { type: blob.type || "image/png" });
      // على الهاتف: نافذة المشاركة تتيح «حفظ الصورة» مباشرة في المعرض
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "Sham Cash" }); setSaved("ok"); return; } catch (e) { if ((e as Error).name === "AbortError") { setSaved(""); return; } }
      }
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: file.name });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setSaved("ok");
    } catch {
      window.open(qr, "_blank");
      setSaved("fail");
    }
  }
  async function copyCode() {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); }
    catch {
      const ta = Object.assign(document.createElement("textarea"), { value: code });
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="sc-tools">
      {qr && (
        <button type="button" className="btn secondary block sc-save" onClick={saveQr} disabled={saved === "busy"}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
          {saved === "busy" ? t("جارٍ الحفظ…") : saved === "ok" ? t("تم حفظ الرمز ✓") : t("حفظ رمز QR كصورة")}
        </button>
      )}
      {qr && <span className="caption sc-hint">{saved === "fail" ? t("اضغطي مطوّلاً على الصورة التي فُتحت واختاري «حفظ الصورة».") : t("ثم افتحي شام كاش ← مسح الرمز ← اختيار صورة من المعرض.")}</span>}
      {code && (
        <div className="sc-code">
          <span className="sc-code-l">{t("أو انسخي كود الحساب وحوّلي عليه")}</span>
          <div className="sc-code-row">
            <code className="ltr">{code}</code>
            <button type="button" className={`sc-copy${copied ? " ok" : ""}`} onClick={copyCode}>{copied ? t("تم النسخ ✓") : t("نسخ")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
