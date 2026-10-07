import type { SupabaseClient } from "@supabase/supabase-js";

export const TYPE_LABEL: Record<string, string> = { asset: "أصول", liability: "خصوم", equity: "حقوق ملكية", revenue: "إيرادات", expense: "مصاريف" };
export const SOURCE_LABEL: Record<string, string> = {
  manual: "يدوي", sale: "مبيعات", sale_return: "مرتجع", purchase: "مشتريات", expense: "مصروف", payment: "دفعة", transfer: "تحويل", shift: "وردية",
};
/** الحسابات ذات الطبيعة المدينة (الرصيد = مدين − دائن) */
export const isDebitNature = (type: string) => type === "asset" || type === "expense";
export const balanceOf = (t: { type: string; debit: number; credit: number }) =>
  isDebitNature(t.type) ? Number(t.debit) - Number(t.credit) : Number(t.credit) - Number(t.debit);

export type AccTotal = { code: string; name: string; type: string; debit: number; credit: number };

/** مجاميع الحسابات لفترة. يعيد null إن لم تُنفّذ ملفات قاعدة البيانات الخاصة بالمالية بعد. */
export async function accountTotals(sb: SupabaseClient, from?: string, to?: string): Promise<AccTotal[] | null> {
  const { data, error } = await sb.rpc("account_totals", { p_from: from ?? null, p_to: to ?? null });
  if (error) return null;
  return (data as AccTotal[]).map((r) => ({ ...r, debit: Number(r.debit), credit: Number(r.credit) }));
}

export function periodRange(p: string | undefined, from?: string, to?: string) {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const y = now.getFullYear(), m = now.getMonth();
  if (p === "custom" && from && to) return { from, to, label: `${from} – ${to}` };
  if (p === "quarter") { const q = Math.floor(m / 3) * 3; return { from: iso(new Date(Date.UTC(y, q, 1))), to: iso(new Date(Date.UTC(y, q + 3, 0))), label: `الربع ${q / 3 + 1} · ${y}` }; }
  if (p === "year") return { from: `${y}-01-01`, to: `${y}-12-31`, label: `سنة ${y}` };
  return { from: iso(new Date(Date.UTC(y, m, 1))), to: iso(new Date(Date.UTC(y, m + 1, 0))), label: monthLabel(now) };
}

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
export const monthLabel = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
export const monthShort = (i: number) => MONTHS[i];
