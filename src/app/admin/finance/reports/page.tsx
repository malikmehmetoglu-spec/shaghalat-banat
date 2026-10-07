import Link from "next/link";
import { FINANCE_ROLES, requireStaff } from "@/lib/admin";
import { price } from "@/lib/format";
import { accountTotals, balanceOf, periodRange, type AccTotal } from "@/lib/finance";
import { PrintButton } from "../PrintButton";
import { CsvButton } from "./CsvButton";

export const metadata = { title: "التقارير المالية" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ p?: string; from?: string; to?: string; r?: string }> }) {
  const sp = await searchParams;
  const { sb } = await requireStaff(FINANCE_ROLES);
  const per = periodRange(sp.p, sp.from, sp.to);
  const report = sp.r ?? "pl";
  const [period, upto] = await Promise.all([accountTotals(sb, per.from, per.to), accountTotals(sb, undefined, per.to)]);
  const P = period ?? [], U = upto ?? [];
  const bal = (rows: AccTotal[], t: string) => rows.filter((r) => r.type === t);
  const sum = (rows: AccTotal[]) => rows.reduce((s, r) => s + balanceOf(r), 0);

  const rev = bal(P, "revenue"), exp = bal(P, "expense");
  const cogs = exp.filter((r) => r.code === "5100"), opex = exp.filter((r) => r.code !== "5100");
  const gross = sum(rev) - sum(cogs), net = gross - sum(opex);
  const profitToDate = sum(bal(U, "revenue")) - sum(bal(U, "expense"));

  let csv: (string | number)[][] = [];
  const Section = ({ title, rows, total }: { title: string; rows: AccTotal[]; total?: string }) => {
    csv.push([title]); rows.forEach((r) => csv.push([r.code, r.name, balanceOf(r)]));
    return (
      <>
        <tr style={{ background: "var(--surface-admin)" }}><td colSpan={2} style={{ fontWeight: 700 }}>{title}</td></tr>
        {rows.filter((r) => balanceOf(r) !== 0).map((r) => <tr key={r.code}><td style={{ paddingInlineStart: 28 }}>{r.name}</td><td>{price(balanceOf(r))}</td></tr>)}
        {total && <tr><td style={{ fontWeight: 700 }}>{total}</td><td style={{ fontWeight: 700 }}>{price(sum(rows))}</td></tr>}
      </>
    );
  };
  const Total = ({ label, v, brand }: { label: string; v: number; brand?: boolean }) => { csv.push([label, "", v]); return <tr><td style={{ fontWeight: 700, fontSize: brand ? 16 : 14 }}>{label}</td><td style={{ fontWeight: 700, fontSize: brand ? 16 : 14, color: brand ? "var(--magenta)" : undefined }}>{price(v)}</td></tr>; };

  const body = report === "bs" ? (
    <>
      {Section({title: "الأصول", rows: bal(U, "asset"), total: "إجمالي الأصول"})}
      {Section({title: "الخصوم", rows: bal(U, "liability"), total: "إجمالي الخصوم"})}
      {Section({title: "حقوق الملكية", rows: bal(U, "equity")})}
      <tr><td style={{ paddingInlineStart: 28 }}>الأرباح المحتجزة حتى التاريخ</td><td>{price(profitToDate)}</td></tr>
      {Total({label: "إجمالي الخصوم وحقوق الملكية", v: sum(bal(U, "liability")) + sum(bal(U, "equity")) + profitToDate, brand: true})}
    </>
  ) : report === "tb" ? (
    <>
      {P.filter((r) => r.debit || r.credit).map((r) => { csv.push([r.code, r.name, r.debit, r.credit]); return <tr key={r.code}><td><span className="caption ltr">{r.code}</span> {r.name}</td><td>{price(r.debit)} · {price(r.credit)}</td></tr>; })}
      {Total({label: "الإجمالي (مدين = دائن)", v: P.reduce((s, r) => s + r.debit, 0), brand: true})}
    </>
  ) : (
    <>
      {Section({title: "الإيرادات", rows: rev, total: "إجمالي الإيرادات"})}
      {Section({title: "تكلفة البضاعة المباعة", rows: cogs})}
      {Total({label: "مجمل الربح", v: gross})}
      {Section({title: "المصاريف التشغيلية", rows: opex, total: "إجمالي المصاريف"})}
      {Total({label: "صافي الربح", v: net, brand: true})}
    </>
  );
  const q = (o: Record<string, string>) => "?" + new URLSearchParams({ p: sp.p ?? "month", r: report, ...(sp.from ? { from: sp.from } : {}), ...(sp.to ? { to: sp.to } : {}), ...o }).toString();
  const titles: Record<string, string> = { pl: "قائمة الدخل", bs: "الميزانية العمومية", tb: "ميزان المراجعة" };

  return (
    <>
      <div className="adm-top no-print">
        <div className="title-block"><h1 className="adm-h1">التقارير المالية</h1><span className="adm-sub">الفترة: {per.label}</span></div>
        <div style={{ display: "flex", gap: 8 }}><CsvButton rows={csv} name={`${titles[report]}-${per.from}`} /><PrintButton label="تصدير PDF" className="btn secondary" /></div>
      </div>
      <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[["month", "هذا الشهر"], ["quarter", "الربع الحالي"], ["year", "هذه السنة"]].map(([k, l]) => <Link key={k} href={q({ p: k, from: "", to: "" })} className={`a-chip${(sp.p ?? "month") === k ? " on" : ""}`}>{l}</Link>)}
        <form style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="hidden" name="p" value="custom" /><input type="hidden" name="r" value={report} />
          <label className="sr" htmlFor="rf">من</label><input id="rf" type="date" name="from" className="a-in" defaultValue={sp.from} />
          <label className="sr" htmlFor="rt">إلى</label><input id="rt" type="date" name="to" className="a-in" defaultValue={sp.to} />
          <button className={`a-chip${sp.p === "custom" ? " on" : ""}`}>فترة مخصصة</button>
        </form>
      </div>
      <div className="no-print" style={{ display: "flex", gap: 8 }}>
        {Object.entries(titles).map(([k, l]) => <Link key={k} href={q({ r: k })} className={`a-chip${report === k ? " on" : ""}`}>{l}</Link>)}
      </div>
      <div className="acard flush" style={{ maxWidth: 760 }}>
        <div style={{ padding: "16px 18px 6px", display: "flex", flexDirection: "column", gap: 4 }}>
          <b style={{ fontSize: 18, lineHeight: 1.5 }}>{titles[report]}</b>
          <span className="caption">شغلات بنات · {report === "bs" ? `حتى ${per.to}` : per.label}</span>
        </div>
        <div className="tw"><table className="tbl"><tbody>{body}</tbody></table></div>
      </div>
    </>
  );
}
