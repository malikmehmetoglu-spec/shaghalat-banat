import Link from "next/link";
import { FINANCE_ROLES, requireStaff } from "@/lib/admin";
import { date, price } from "@/lib/format";
import { accountTotals, balanceOf } from "@/lib/finance";
import { FormCard } from "../../FormCard";
import { cashMove, ownerDraw } from "../actions";
import { ShiftCard } from "./ShiftCard";

export const metadata = { title: "الصندوق والبنوك" };

export default async function CashPage({ searchParams }: { searchParams: Promise<{ acc?: string }> }) {
  const { acc } = await searchParams;
  const { sb, profile } = await requireStaff(FINANCE_ROLES);
  const isOwner = profile.role === "owner";
  const totals = (await accountTotals(sb)) ?? [];
  const cashAccs = totals.filter((t) => ["1110", "1120", "1130"].includes(t.code));
  const sel = cashAccs.find((a) => a.code === acc) ?? cashAccs[0];
  const [{ data: lines }, { data: shift }] = await Promise.all([
    sb.from("journal_lines").select("id,debit,credit,entry:journal_entries(entry_date,memo,number,created_at)").eq("account_code", sel?.code ?? "1110").order("id", { ascending: true }),
    sb.rpc("shift_summary"),
  ]);
  // سجل المسحوبات: كل ما خرج إلى «المسحوبات الشخصية» 3200
  const { data: drawLines } = await sb.from("journal_lines").select("id,debit,credit,entry:journal_entries(entry_date,memo,number,created_at)").eq("account_code", "3200").order("id", { ascending: false }).limit(500);
  const draws = ((drawLines ?? []) as any[]).map((l) => ({ id: l.id, amount: Number(l.debit) - Number(l.credit), date: l.entry.entry_date as string, memo: l.entry.memo as string }));
  const today = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
  const sumSince = (prefix: string) => draws.filter((d) => d.date.startsWith(prefix)).reduce((s, d) => s + d.amount, 0);
  const drawMonth = sumSince(today.slice(0, 7)), drawYear = sumSince(today.slice(0, 4)), drawAll = draws.reduce((s, d) => s + d.amount, 0);
  let run = 0;
  const rows = ((lines ?? []) as any[]).map((l) => { run += Number(l.debit) - Number(l.credit); return { ...l, run }; }).reverse().slice(0, 100);
  const s = (shift as any[])?.[0];
  const movable = cashAccs.filter((a) => a.code !== "1130");

  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">الصندوق والبنك</h1><span className="adm-sub">كم المال الموجود في كل مكان، وما دخل وما خرج، مع إغلاق وردية المحل اليومية</span></div></div>
      <div className="kpis">
        {cashAccs.map((a) => (
          <Link key={a.code} href={`/admin/finance/cash?acc=${a.code}`} className="acard" style={{ display: "flex", flexDirection: "column", gap: 4, color: "inherit", outline: sel?.code === a.code ? "2px solid var(--magenta)" : "none" }}>
            <b style={{ fontSize: 22, lineHeight: 1.4 }}>{price(balanceOf(a))}</b><span className="adm-sub">{a.name}</span>
          </Link>
        ))}
      </div>
      <div className="split">
        <div className="acard flush wide">
          <h2 className="adm-h2" style={{ padding: "12px 14px 4px" }}>حركة {sel?.name}</h2>
          <div className="tw"><table className="tbl">
            <thead><tr><th>التاريخ</th><th>البيان</th><th>وارد</th><th>صادر</th><th>الرصيد</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="caption">{date(r.entry.entry_date)}</td>
                  <td>{r.entry.memo}</td>
                  <td style={{ color: "#1a7f4b", fontWeight: 600 }}>{Number(r.debit) ? price(r.debit) : ""}</td>
                  <td style={{ color: "var(--magenta)", fontWeight: 600 }}>{Number(r.credit) ? price(r.credit) : ""}</td>
                  <td style={{ fontWeight: 600 }}>{price(r.run)}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5} className="caption" style={{ textAlign: "center", padding: 24 }}>لا حركات بعد</td></tr>}
            </tbody>
          </table></div>
        </div>
        <div className="narrow" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ShiftCard shift={s ? { openedAt: s.opened_at, by: s.opened_by_name, opening: Number(s.opening), sales: Number(s.cash_sales), expenses: Number(s.cash_expenses), draws: Number(s.cash_draws ?? 0), expected: Number(s.expected) } : null} />
          {isOwner && (
            <FormCard title="سحب إلى الخزنة الشخصية" action={ownerDraw} submitLabel="سحب المبلغ">
              <span className="caption" style={{ lineHeight: 1.7 }}>مال يخرج من المحل إلى جيبك نهائياً. لا يُحسب مصروفاً ولا يُنقص الربح، ويُخصم من المتوقع في درج الوردية.</span>
              <label className="a-field">من<select name="from" className="a-in">{movable.map((a) => <option key={a.code} value={a.code}>{a.name} — {price(balanceOf(a))}</option>)}</select></label>
              <label className="a-field">المبلغ (ل.س)<input name="amount" type="number" min="1" className="a-in" required /></label>
              <label className="a-field">ملاحظة<input name="note" className="a-in" placeholder="أرباح الشهر" /></label>
            </FormCard>
          )}
          <FormCard title="نقل أو إضافة مال" action={cashMove} submitLabel="تسجيل">
            <label className="a-field">ماذا تريد أن تفعل؟<select name="kind" className="a-in"><option value="transfer">نقل مال بين الصندوق والبنك</option><option value="deposit">إضافة مال من جيب صاحب المتجر</option></select></label>
            <div className="a-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
              <label className="a-field">من<select name="from" className="a-in">{movable.map((a) => <option key={a.code} value={a.code}>{a.name}</option>)}</select></label>
              <label className="a-field">إلى<select name="to" className="a-in" defaultValue={movable[1]?.code}>{movable.map((a) => <option key={a.code} value={a.code}>{a.name}</option>)}</select></label>
            </div>
            <label className="a-field">المبلغ (ل.س)<input name="amount" type="number" min="1" className="a-in" required /></label>
            <label className="a-field">ملاحظة<input name="note" className="a-in" placeholder="إيداع مبيعات الأسبوع في البنك" /></label>
            <span className="caption">عند الإضافة نستخدم «إلى» فقط.</span>
          </FormCard>
        </div>
      </div>

      <div className="acard flush">
        <div className="row-between" style={{ padding: "12px 14px 4px", flexWrap: "wrap" }}>
          <h2 className="adm-h2">سجل المسحوبات الشخصية</h2>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <span className="adm-sub">هذا الشهر <b style={{ color: "var(--magenta)" }}>{price(drawMonth)}</b></span>
            <span className="adm-sub">هذه السنة <b style={{ color: "var(--magenta)" }}>{price(drawYear)}</b></span>
            <span className="adm-sub">الإجمالي <b>{price(drawAll)}</b></span>
          </div>
        </div>
        <div className="tw"><table className="tbl">
          <thead><tr><th>التاريخ</th><th>البيان</th><th>المبلغ</th></tr></thead>
          <tbody>
            {draws.slice(0, 50).map((d) => (
              <tr key={d.id}><td className="caption">{date(d.date)}</td><td>{d.memo}</td><td style={{ color: "var(--magenta)", fontWeight: 600 }}>{price(d.amount)}</td></tr>
            ))}
            {!draws.length && <tr><td colSpan={3} className="caption" style={{ textAlign: "center", padding: 24 }}>لا مسحوبات بعد</td></tr>}
          </tbody>
        </table></div>
      </div>
    </>
  );
}
