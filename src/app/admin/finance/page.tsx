import Link from "next/link";
import { FINANCE_ROLES, requireStaff } from "@/lib/admin";
import { date, price } from "@/lib/format";
import { accountTotals, balanceOf, monthLabel, monthShort, periodRange } from "@/lib/finance";

export const metadata = { title: "اللوحة المالية" };

export default async function FinanceDashboard() {
  const { sb } = await requireStaff(FINANCE_ROLES);
  const now = new Date();
  const m = periodRange("month");
  const sixAgo = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 5, 1)).toISOString().slice(0, 10);

  const [all, month, { data: lines }, { data: payables }, { data: cod }] = await Promise.all([
    accountTotals(sb),
    accountTotals(sb, m.from, m.to),
    sb.from("journal_lines").select("debit,credit,account:accounts(type),entry:journal_entries!inner(entry_date)").gte("entry.entry_date", sixAgo),
    sb.from("journal_lines").select("party_id,party_name,debit,credit").eq("account_code", "2100"),
    sb.from("orders").select("id,number,total,created_at").eq("channel", "online").eq("payment_method", "cod").eq("status", "delivered").eq("is_paid", false).order("created_at").limit(5),
  ]);
  const A = all ?? [], M = month ?? [];
  const sum = (rows: typeof A, t: string) => rows.filter((r) => r.type === t).reduce((s, r) => s + balanceOf(r), 0);
  const revenue = sum(M, "revenue"), expense = sum(M, "expense");

  // آخر 6 أشهر
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1); return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: monthShort(d.getMonth()), rev: 0, exp: 0 }; });
  for (const l of (lines ?? []) as any[]) {
    const mo = months.find((x) => l.entry.entry_date.startsWith(x.key));
    if (!mo) continue;
    if (l.account.type === "revenue") mo.rev += Number(l.credit) - Number(l.debit);
    if (l.account.type === "expense") mo.exp += Number(l.debit) - Number(l.credit);
  }
  const max = Math.max(1, ...months.flatMap((x) => [x.rev, x.exp]));

  const expSplit = M.filter((r) => r.type === "expense" && balanceOf(r) > 0).map((r) => ({ name: r.name, v: balanceOf(r) })).sort((a, b) => b.v - a.v);
  const cash = A.filter((r) => ["1110", "1120", "1130"].includes(r.code)).map((r) => ({ name: r.name, v: balanceOf(r) }));
  const supMap = new Map<string, { name: string; v: number }>();
  for (const p of payables ?? []) { const x = supMap.get(p.party_id!) ?? { name: p.party_name!, v: 0 }; x.v += Number(p.credit) - Number(p.debit); supMap.set(p.party_id!, x); }
  const due = [
    ...[...supMap.values()].filter((x) => x.v > 0).map((x) => ({ who: x.name, kind: "علينا · مورد", v: x.v, when: "—" })),
    ...(cod ?? []).map((o) => ({ who: `شركة التوصيل · #${o.number}`, kind: "لنا · عند الاستلام", v: Number(o.total), when: date(o.created_at) })),
  ].slice(0, 8);

  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">نظرة عامة على الأموال</h1><span className="adm-sub">{monthLabel(now)} · أرقام المتجر الإلكتروني والمحل معاً</span></div></div>
      <div className="kpis">
        {[[price(revenue), "الإيرادات هذا الشهر"], [price(expense), "المصاريف هذا الشهر"], [price(revenue - expense), "صافي الربح"], [revenue ? `${Math.round(((revenue - expense) / revenue) * 100)}%` : "—", "هامش الربح"]].map(([v, l]) => (
          <div key={l} className="acard" style={{ display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 22, lineHeight: 1.4 }}>{v}</b><span className="adm-sub">{l}</span></div>
        ))}
      </div>
      <div className="split">
        <div className="acard wide" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="row-between"><h2 className="adm-h2">الإيرادات والمصاريف · آخر 6 أشهر</h2>
            <span className="caption" style={{ display: "flex", gap: 12 }}><span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "var(--magenta)" }} /> الإيرادات</span><span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "var(--rosy-gray)" }} /> المصاريف</span></span></div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 200, paddingTop: 10 }}>
            {months.map((x) => (
              <div key={x.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
                <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: "100%" }}>
                  <span title={price(x.rev)} style={{ width: 16, height: `${(x.rev / max) * 100}%`, minHeight: 2, borderRadius: 6, background: "var(--magenta)" }} />
                  <span title={price(x.exp)} style={{ width: 16, height: `${(x.exp / max) * 100}%`, minHeight: 2, borderRadius: 6, background: "var(--rosy-gray)" }} />
                </div>
                <span className="caption">{x.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="acard narrow" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className="adm-h2">توزيع المصاريف</h2>
          {!expSplit.length && <span className="caption">لا مصاريف هذا الشهر</span>}
          {expSplit.map((e) => (
            <div key={e.name} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="kv" style={{ fontSize: 13 }}><span>{e.name}</span><span>{price(e.v)}</span></div>
              <span style={{ display: "block", height: 6, borderRadius: 3, background: "var(--light-blush)" }}><span style={{ display: "block", height: 6, borderRadius: 3, width: `${(e.v / expense) * 100}%`, background: "var(--banat-pink)" }} /></span>
            </div>
          ))}
        </div>
      </div>
      <div className="split">
        <div className="acard narrow" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className="adm-h2">الأرصدة النقدية</h2>
          {cash.map((c) => <div key={c.name} className="kv"><span className="adm-sub">{c.name}</span><b>{price(c.v)}</b></div>)}
          <div className="kv" style={{ borderTop: "1px solid var(--border-row)", paddingTop: 10 }}><b>الإجمالي</b><b style={{ color: "var(--magenta)" }}>{price(cash.reduce((s, c) => s + c.v, 0))}</b></div>
          <Link href="/admin/finance/cash" className="btn secondary">عرض الصندوق والبنوك</Link>
        </div>
        <div className="acard flush wide">
          <div className="row-between" style={{ padding: "12px 14px 4px" }}><h2 className="adm-h2">مستحقات قريبة</h2><Link href="/admin/finance/receivables" className="caption" style={{ color: "var(--magenta)" }}>عرض الكل</Link></div>
          <div className="tw"><table className="tbl">
            <thead><tr><th>الجهة</th><th>النوع</th><th>المبلغ</th><th>منذ</th></tr></thead>
            <tbody>
              {due.map((d, i) => <tr key={i}><td>{d.who}</td><td><span className={`pill ${d.kind.startsWith("لنا") ? "tone-success" : "tone-warning"}`}>{d.kind}</span></td><td style={{ fontWeight: 600 }}>{price(d.v)}</td><td className="caption">{d.when}</td></tr>)}
              {!due.length && <tr><td colSpan={4} className="caption" style={{ textAlign: "center", padding: 24 }}>لا مستحقات</td></tr>}
            </tbody>
          </table></div>
        </div>
      </div>
    </>
  );
}
