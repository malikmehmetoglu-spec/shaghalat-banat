/** الأرقام دائماً إنجليزية، والعملة ليرة سورية: "1,200 ل.س" */
const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export const num = (n: number | string | null | undefined) => nf.format(Number(n ?? 0));
type Tr = (s: string) => string;
const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
/** المبالغ بالليرة تُعرض بلا فواصل عشرية */
export const price = (n: number | string | null | undefined, t?: Tr) => `${nf0.format(Math.round(Number(n ?? 0)))} ${t ? t("ل.س") : "ل.س"}`;

const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

/** تاريخ بأرقام إنجليزية وأسماء أشهر عربية: "7 أكتوبر 2026" */
export const TZ = "Asia/Damascus";
const dtf = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", hourCycle: "h23" });
/** أجزاء التاريخ بتوقيت دمشق — نفس النتيجة على الخادم (UTC) والمتصفح */
export function damascus(d: string | Date = new Date()) {
  const o: Record<string, number> = {};
  for (const p of dtf.formatToParts(new Date(d))) if (p.type !== "literal") o[p.type] = Number(p.value);
  return { y: o.year, mo: o.month, d: o.day, h: o.hour % 24, mi: o.minute };
}
/** تاريخ اليوم بتوقيت دمشق بصيغة YYYY-MM-DD (للحقول الافتراضية) */
export const todayISO = () => { const x = damascus(); return `${x.y}-${String(x.mo).padStart(2, "0")}-${String(x.d).padStart(2, "0")}`; };
/** بداية يوم في دمشق (منتصف الليل) كلحظة زمنية */
export function damascusDayStart(daysAgo = 0) {
  const x = damascus();
  // دمشق UTC+3 ثابتة
  return new Date(Date.UTC(x.y, x.mo - 1, x.d - daysAgo, 0, 0, 0) - 3 * 3600 * 1000);
}
/** وقت (ساعة:دقيقة) بتوقيت دمشق */
export const timeHM = (d: string | Date) => { const x = damascus(d); return `${String(x.h).padStart(2, "0")}:${String(x.mi).padStart(2, "0")}`; };

export function date(d: string | Date, withTime = false, t?: Tr) {
  const tr = t ?? ((x: string) => x);
  const x = damascus(d);
  const base = `${x.d} ${tr(months[x.mo - 1])} ${x.y}`;
  if (!withTime) return base;
  const h = x.h;
  const m = String(x.mi).padStart(2, "0");
  return `${base} · ${h % 12 || 12}:${m} ${tr(h < 12 ? "ص" : "م")}`;
}

/** تدرّج بديل لصورة المنتج حين لا توجد صورة بعد */
const gradients = [
  "linear-gradient(160deg,#E85FA8,#8E0254)",
  "linear-gradient(160deg,#F3C1C3,#D6037F)",
  "linear-gradient(160deg,#D6037F,#3A2A30)",
  "linear-gradient(160deg,#E85FA8,#F3C1C3)",
  "linear-gradient(160deg,#8E0254,#E85FA8)",
  "linear-gradient(160deg,#3A2A30,#8E0254)",
];
export function placeholder(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return gradients[h % gradients.length];
}

export const ORDER_STATUS: Record<string, { label: string; tone: string }> = {
  new: { label: "جديد", tone: "info" },
  confirmed: { label: "تم التأكيد", tone: "info" },
  preparing: { label: "قيد التجهيز", tone: "warning" },
  shipped: { label: "قيد الشحن", tone: "brand" },
  delivered: { label: "تم التوصيل", tone: "success" },
  cancelled: { label: "ملغى", tone: "neutral" },
  returned: { label: "مُرتجع", tone: "neutral" },
};

export const PAYMENT_LABEL: Record<string, string> = {
  shamcash: "شام كاش",
  support: "عبر خدمة العملاء",
  cod: "الدفع عند الاستلام",
  card: "بطاقة بنكية",
  transfer: "تحويل بنكي",
  cash: "نقداً",
};

/** رابط النسخة المصغّرة من صورة مرفوعة (t_ قبل اسم الملف) */
export const thumbUrl = (u: string) => u.replace(/\/([^/]+)$/, "/t_$1");

/** الروابط العربية تصل مُرمَّزة (%D9%82…) — نفكّها قبل البحث عنها */
export const decodeSlug = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
