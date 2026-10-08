import Link from "next/link";
import { FINANCE_ROLES, requireStaff } from "@/lib/admin";
import { price } from "@/lib/format";
import { accountTotals, balanceOf, monthShort, periodRange, type AccTotal } from "@/lib/finance";
import { PrintButton } from "../PrintButton";
import { CsvButton } from "./CsvButton";

export const metadata = { title: "تقرير الأرباح" };

/** ملخّص بلغة بسيطة لفترة: كم بعنا، كم كلّفتنا البضاعة، كم صرفنا، وكم ربحنا */
function summarize(rows: AccTotal[]) {
  const v = (code: string) => { const r = rows.find((x) => x.code === code); return r ? balanceOf(r) : 0; };
  const online = v("4100"), store = v("4200"), shipping = v("4400"), other = v("4900");
  const sales = online + store + shipping + other;
  const goods = v("5100");
  const expenses = rows.filter((r) => r.type === "expense" && r.code !== "5100").map((r) => ({ name: r.name, v: balanceOf(r) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const exp = expenses.reduce((s, x) => s + x.v, 0);
  return { online, store, shipping, other, sales, goods, gross: sales - goods, expenses, exp, net: sales - goods - exp };
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ p?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const { sb } = await requireStaff(FINANCE_ROLES);
  const per = periodRange(sp.p, sp.from, sp.to);
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 5 + k, 1));
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    return { label: `${monthShort(d.getUTCMonth())} ${d.getUTCFullYear()}`, from: d.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  });
  const [cur, ...hist] = await Promise.all([accountTotals(sb, per.from, per.to), ...months.map((m) => accountTotals(sb, m.from, m.to))]);
  const s = summarize(cur ?? []);
  const trend = months.map((m, k) => ({ ...m, ...summarize(hist[k] ?? []) }));

  const csv: (string | number)[][] = [
    ["تقرير الأرباح", per.label], [],
    ["مبيعات المتجر الإلكتروني", s.online], ["مبيعات المحل", s.store], ["أجور الشحن", s.shipping], ["إيرادات أخرى", s.other], ["إجمالي ما دخل", s.sales],
    ["ثمن البضاعة التي بعناها", s.goods], ["الربح من البيع", s.gross],
    ...s.expenses.map((e) => [e.name, e.v]), ["إجمالي المصاريف", s.exp], ["صافي الربح", s.net], [],
    ["الشهر", "المبيعات", "ثمن البضاعة", "المصاريف", "صافي الربح"], ...trend.map((t) => [t.label, t.sales, t.goods, t.exp, t.net]),
  ];
  const q = (o: Record<string, string>) => "?" + new URLSearchParams({ p: sp.p ?? "month", ...o }).toString();
  const Row = ({ l, v, sub, strong, tone }: { l: string; v: number; sub?: boolean; strong?: boolean; tone?: "good" | "bad" }) => (
    <div className="kv" style={{ fontSize: strong ? 16 : 14, padding: sub ? "2px 16px 2px 0" : "4px 0", color: sub ? "var(--text-muted)" : undefined }}>
      <span style={{ fontWeight: strong ? 700 : sub ? 400 : 500 }}>{l}</span>
      <span style={{ fontWeight: strong ? 700 : 600, color: tone === "good" ? "var(--success-fg)" : tone === "bad" ? "var(--danger-fg)" : undefined }}>{price(v || 0)}</span>
    </div>
  );

  return (
    <>
      <div className="adm-top no-print">
        <div className="title-block"><h1 className="adm-h1">تقرير الأرباح</h1><span className="adm-sub">{per.label} · المتجر الإلكتروني والمحل معاً</span></div>
        <div style={{ display: "flex", gap: 8 }}><CsvButton rows={csv} name={`تقرير-الأرباح-${per.from}`} /><PrintButton label="طباعة / PDF" className="btn secondary" /></div>
      </div>
      <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {[["month", "هذا الشهر"], ["quarter", "هذا الربع"], ["year", "هذه السنة"]].map(([k, l]) => <Link key={k} href={q({ p: k })} className={`a-chip${(sp.p ?? "month") === k ? " on" : ""}`}>{l}</Link>)}
        <form style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="hidden" name="p" value="custom" />
          <label className="sr" htmlFor="rf">من</label><input id="rf" type="date" name="from" className="a-in" defaultValue={sp.from} />
          <label className="sr" htmlFor="rt">إلى</label><input id="rt" type="date" name="to" className="a-in" defaultValue={sp.to} />
          <button className={`a-chip${sp.p === "custom" ? " on" : ""}`}>فترة أخرى</button>
        </form>
      </div>

      <div className="kpis">
        {[[s.sales, "كم دخل من البيع", undefined], [s.goods + s.exp, "كم صرفنا (بضاعة + مصاريف)", undefined], [s.net, "صافي الربح", s.net >= 0 ? "var(--success-fg)" : "var(--danger-fg)"]].map(([v, l, c]) => (
          <div key={String(l)} className="acard" style={{ display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 24, lineHeight: 1.4, color: c as string | undefined }}>{price(v as number)}</b><span className="adm-sub">{l}</span></div>
        ))}
      </div>

      <div className="split">
        <div className="acard wide" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="adm-h2">من أين جاء الربح؟</h2>
          <Row l="ما دخل من البيع" v={s.sales} />
          <Row l="المتجر الإلكتروني" v={s.online} sub />
          <Row l="المحل" v={s.store} sub />
          {s.shipping > 0 && <Row l="أجور الشحن من العميلات" v={s.shipping} sub />}
          {s.other > 0 && <Row l="إيرادات أخرى" v={s.other} sub />}
          <Row l="ناقص: ثمن البضاعة التي بعناها" v={-s.goods} />
          <div style={{ borderTop: "1px solid var(--border-row)" }} />
          <Row l="الربح من البيع" v={s.gross} strong />
          <Row l="ناقص: المصاريف" v={-s.exp} />
          {s.expenses.map((e) => <Row key={e.name} l={e.name} v={e.v} sub />)}
          <div style={{ borderTop: "2px solid var(--rosy-gray)" }} />
          <Row l="صافي الربح" v={s.net} strong tone={s.net >= 0 ? "good" : "bad"} />
          {s.goods === 0 && s.sales > 0 && <span className="caption" style={{ lineHeight: 1.7 }}>ثمن البضاعة صفر لأن «سعر التكلفة» غير مُدخل للمنتجات. أدخله في صفحة كل منتج ليكون الربح دقيقاً.</span>}
        </div>
        <div className="acard flush narrow">
          <h2 className="adm-h2" style={{ padding: "12px 14px 4px" }}>آخر 6 أشهر</h2>
          <div className="tw"><table className="tbl">
            <thead><tr><th>الشهر</th><th>المبيعات</th><th>الربح</th></tr></thead>
            <tbody>
              {trend.slice().reverse().map((t) => (
                <tr key={t.from}><td>{t.label}</td><td>{price(t.sales)}</td><td style={{ fontWeight: 700, color: t.net >= 0 ? "var(--success-fg)" : "var(--danger-fg)" }}>{price(t.net)}</td></tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </div>
    </>
  );
}
