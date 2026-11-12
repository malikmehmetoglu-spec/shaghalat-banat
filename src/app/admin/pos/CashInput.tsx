"use client";

/** يكتب المبلغ بالكلمات بوضوح: 7000 ← «7 آلاف ليرة»، 10050 ← «10 آلاف و50 ليرة» */
export function inWords(n: number): string {
  if (!(n > 0)) return "صفر";
  const m = Math.floor(n / 1_000_000), k = Math.floor((n % 1_000_000) / 1000), r = Math.round(n % 1000);
  const parts: string[] = [];
  if (m) parts.push(m === 1 ? "مليون" : m === 2 ? "مليونان" : m <= 10 ? `${m} ملايين` : `${m} مليون`);
  if (k) parts.push(k === 1 ? "ألف" : k === 2 ? "ألفان" : k <= 10 ? `${k} آلاف` : `${k} ألف`);
  if (r) parts.push(String(r));
  return parts.join(" و") + " ليرة";
}

/**
 * خانة مبلغ الصندوق: أرقام صحيحة فقط (بلا فواصل أو أصفار عشرية)، والمبلغ يظهر تحتها بالكلمات
 * حتى لا تُكتب 7 بدل 7000. وتنبيه إن بدا المبلغ أصغر بكثير من المتوقع.
 */
export function CashInput({ id, value, onChange, expected, autoFocus, big }: { id?: string; value: string; onChange: (v: string) => void; expected?: number | null; autoFocus?: boolean; big?: boolean }) {
  const n = Number(value || 0);
  const suspicious = value !== "" && expected != null && expected >= 1000 && n > 0 && n * 50 < expected;
  return (
    <div className="cash-in">
      <div className={big ? "pos-gate-in" : "cash-box"}>
        <input id={id} type="text" inputMode="numeric" autoFocus={autoFocus} value={value} placeholder="مثلاً 7000" autoComplete="off" dir="ltr"
          onChange={(e) => onChange(e.target.value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 10))} />
        <span>ل.س</span>
      </div>
      <span className={`cash-words${value ? "" : " empty"}`}>{value ? `= ${inWords(n)}` : "اكتبي الرقم كاملاً بالأصفار، مثلاً 7000 لسبعة آلاف"}</span>
      {suspicious && <span className="a-flash tone-warning">تأكدي: كتبتِ {inWords(n)} فقط، والمتوقع حوالي {inWords(expected!)}. هل نسيتِ الأصفار؟</span>}
    </div>
  );
}
