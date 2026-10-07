/** الأرقام دائماً إنجليزية، والعملة ليرة سورية: "1,200 ل.س" */
const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export const num = (n: number | string | null | undefined) => nf.format(Number(n ?? 0));
type Tr = (s: string) => string;
export const price = (n: number | string | null | undefined, t?: Tr) => `${num(n)} ${t ? t("ل.س") : "ل.س"}`;

const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

/** تاريخ بأرقام إنجليزية وأسماء أشهر عربية: "7 أكتوبر 2026" */
export function date(d: string | Date, withTime = false, t?: Tr) {
  const tr = t ?? ((x: string) => x);
  const x = new Date(d);
  const base = `${x.getDate()} ${tr(months[x.getMonth()])} ${x.getFullYear()}`;
  if (!withTime) return base;
  const h = x.getHours();
  const m = String(x.getMinutes()).padStart(2, "0");
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
  cod: "الدفع عند الاستلام",
  card: "بطاقة بنكية",
  transfer: "تحويل بنكي",
  cash: "نقداً",
};
