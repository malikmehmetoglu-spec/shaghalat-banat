import type { SupabaseClient } from "@supabase/supabase-js";
import { accountTotals, balanceOf } from "@/lib/finance";

/** الأماكن الثلاثة للمال كما يراها صاحب المتجر */
export const SHAM = "1120", SHOP = "1110", PRIVATE = "3100";
export const PLACE_NAME: Record<string, string> = { "1120": "شام كاش", "1110": "صندوق المحل", "3100": "المال الخاص", "3200": "المال الخاص", none: "—" };
export const SOURCES = [
  { code: SHAM, name: "شام كاش" },
  { code: SHOP, name: "صندوق المحل" },
  { code: PRIVATE, name: "المال الخاص" },
] as const;

const damascusToday = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
export const monthBounds = (d = damascusToday()) => {
  const [y, m] = d.split("-").map(Number);
  return { from: `${d.slice(0, 7)}-01`, to: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10), key: d.slice(0, 7) };
};

export type Snapshot = {
  sham: number; shop: number;
  privateNet: number; drawn: number; added: number; paidPersonally: number;
  revenue: number; expenses: number; profit: number; consignDue: number;
};

/** الأرصدة الحالية + أرقام هذا الشهر */
export async function moneySnapshot(sb: SupabaseClient): Promise<Snapshot | null> {
  const mb = monthBounds();
  const [all, month] = await Promise.all([accountTotals(sb), accountTotals(sb, mb.from, mb.to)]);
  if (!all || !month) return null;
  const bal = (rows: typeof all, c: string) => { const r = rows.find((x) => x.code === c); return r ? balanceOf(r) : 0; };
  const sumType = (rows: typeof all, t: string) => rows.filter((r) => r.type === t).reduce((s, r) => s + balanceOf(r), 0);
  const drawnRow = month.find((r) => r.code === "3200"), addedRow = month.find((r) => r.code === "3100");
  const drawn = drawnRow ? drawnRow.debit - drawnRow.credit : 0;
  const added = addedRow ? addedRow.credit - addedRow.debit : 0;
  // ما دفعه المالك من جيبه عن المتجر هذا الشهر (مصاريف/رواتب/مشتريات من «المال الخاص») — جزء من «ما أضافه»
  const { data: personal } = await sb.from("journal_lines").select("credit,entry:journal_entries!inner(source,entry_date)")
    .eq("account_code", "3100").gte("entry.entry_date", mb.from).lte("entry.entry_date", mb.to).in("entry.source", ["expense", "salary", "purchase_stock", "consign_payout"]);
  const paidPersonally = (personal ?? []).reduce((s: number, l: any) => s + Number(l.credit), 0);
  const revenue = sumType(month, "revenue"), expenses = sumType(month, "expense");
  return {
    sham: bal(all, SHAM), shop: bal(all, SHOP),
    privateNet: drawn - added, drawn, added, paidPersonally,
    revenue, expenses, profit: revenue - expenses,
    consignDue: bal(all, "2300"),   // التزام: دائن − مدين
  };
}

export type Kind = "sale" | "refund" | "expense" | "salary" | "draw" | "add" | "transfer" | "purchase" | "consign" | "adjust" | "other";
export const KIND: Record<Kind, { label: string; icon: string; tone: string }> = {
  sale: { label: "بيع", icon: "bag", tone: "in" },
  refund: { label: "مرتجع", icon: "return", tone: "out" },
  expense: { label: "مصروف", icon: "minus", tone: "out" },
  salary: { label: "راتب", icon: "user", tone: "out" },
  draw: { label: "سحب إلى المال الخاص", icon: "logout", tone: "own" },
  add: { label: "إضافة من المال الخاص", icon: "plus", tone: "own" },
  transfer: { label: "نقل بين الصندوقين", icon: "sort", tone: "move" },
  purchase: { label: "شراء بضاعة", icon: "boxes", tone: "out" },
  consign: { label: "دفع لتاجر أمانة", icon: "truck", tone: "out" },
  adjust: { label: "ضبط رصيد", icon: "edit", tone: "move" },
  other: { label: "حركة", icon: "info", tone: "move" },
};

export type Movement = { id: string; date: string; at: string; kind: Kind; memo: string; amount: number; places: { code: string; delta: number }[]; personal: boolean };

/** الحركات بلغة بسيطة: كل قيد ← نوع + مبلغ + أي صندوق تأثّر وكيف */
export async function movements(sb: SupabaseClient, opts: { limit?: number; from?: string; to?: string } = {}): Promise<Movement[]> {
  let q = sb.from("journal_entries").select("id,entry_date,created_at,memo,source,journal_lines(account_code,debit,credit)").order("created_at", { ascending: false }).limit(opts.limit ?? 200);
  if (opts.from) q = q.gte("entry_date", opts.from);
  if (opts.to) q = q.lte("entry_date", opts.to);
  const { data } = await q;
  return (data ?? []).map((e: any) => {
    const L = e.journal_lines as { account_code: string; debit: number; credit: number }[];
    const net = (c: string) => L.filter((l) => l.account_code === c).reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
    const places = [SHAM, SHOP].map((c) => ({ code: c, delta: net(c) })).filter((p) => Math.abs(p.delta) > 0.004);
    const has = (c: string, side: "debit" | "credit") => L.some((l) => l.account_code === c && Number(l[side]) > 0);
    const personal = has("3100", "credit") && !places.some((p) => p.delta > 0);
    let kind: Kind = "other";
    switch (e.source) {
      case "sale": kind = "sale"; break;
      case "sale_return": case "store_return": kind = "refund"; break;
      case "expense": kind = "expense"; break;
      case "salary": kind = "salary"; break;
      case "owner_draw": kind = "draw"; break;
      case "purchase_stock": case "purchase": kind = "purchase"; break;
      case "consign_payout": kind = "consign"; break;
      case "adjust": case "shift": kind = "adjust"; break;
      case "transfer": kind = has("3200", "debit") ? "draw" : has("3100", "credit") ? "add" : "transfer"; break;
    }
    const amount = places.length ? Math.max(...places.map((p) => Math.abs(p.delta))) : L.reduce((s, l) => s + Number(l.debit), 0);
    return { id: e.id, date: e.entry_date, at: e.created_at, kind, memo: e.memo, amount, places, personal };
  });
}
