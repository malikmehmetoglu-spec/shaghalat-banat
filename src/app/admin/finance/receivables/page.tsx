import Link from "next/link";
import { FINANCE_ROLES, requireStaff } from "@/lib/admin";
import { date, price } from "@/lib/format";
import { FormCard } from "../../FormCard";
import { recordPayment } from "../actions";

export const metadata = { title: "الذمم" };
const days = (d: string) => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000));

export default async function ReceivablesPage({ searchParams }: { searchParams: Promise<{ party?: string }> }) {
  const { party = "courier" } = await searchParams;
  const { sb } = await requireStaff(FINANCE_ROLES);
  const [{ data: cod }, { data: supLines }, { data: sups }, { data: cashAccs }] = await Promise.all([
    sb.from("orders").select("id,number,total,created_at").eq("channel", "online").eq("payment_method", "cod").eq("status", "delivered").eq("is_paid", false).order("created_at"),
    sb.from("journal_lines").select("party_id,debit,credit,entry:journal_entries(entry_date)").eq("account_code", "2100"),
    sb.from("suppliers").select("id,name").order("name"),
    sb.from("accounts").select("code,name").eq("is_cash", true).order("code"),
  ]);

  const courierBal = (cod ?? []).reduce((s, o) => s + Number(o.total), 0);
  const parties = [
    { id: "courier", type: "courier", name: "شركة التوصيل (عند الاستلام)", dir: "لنا", count: cod?.length ?? 0, bal: courierBal, oldest: cod?.[0]?.created_at ?? null },
    ...(sups ?? []).map((s) => {
      const ls = ((supLines ?? []) as any[]).filter((l) => l.party_id === s.id);
      const bal = ls.reduce((a, l) => a + Number(l.credit) - Number(l.debit), 0);
      const oldest = ls.filter((l) => Number(l.credit) > 0).map((l) => l.entry.entry_date).sort()[0] ?? null;
      return { id: s.id, type: "supplier", name: s.name, dir: "علينا", count: ls.filter((l) => Number(l.credit) > 0).length, bal, oldest };
    }).filter((p) => p.bal !== 0),
  ];
  const sel = parties.find((p) => p.id === party) ?? parties[0];
  const totalIn = parties.filter((p) => p.dir === "لنا").reduce((s, p) => s + p.bal, 0);
  const totalOut = parties.filter((p) => p.dir === "علينا").reduce((s, p) => s + p.bal, 0);

  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">ذمم العملاء والموردين</h1><span className="adm-sub">ما لنا عند الآخرين وما علينا لهم، مرتّباً حسب مدة التأخير</span></div></div>
      <div className="kpis">
        <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 22, lineHeight: 1.4, color: "#1a7f4b" }}>{price(totalIn)}</b><span className="adm-sub">لنا (مستحق التحصيل)</span></div>
        <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 22, lineHeight: 1.4, color: "var(--magenta)" }}>{price(totalOut)}</b><span className="adm-sub">علينا (مستحق السداد)</span></div>
      </div>
      <div className="split">
        <div className="acard flush wide">
          <div className="tw"><table className="tbl">
            <thead><tr><th>الجهة</th><th>عدد الفواتير</th><th>الرصيد</th><th>أقدم استحقاق</th><th>التأخير</th></tr></thead>
            <tbody>
              {parties.map((p) => {
                const d = p.oldest ? days(p.oldest) : 0;
                return (
                  <tr key={p.id} className={sel?.id === p.id ? "sel" : ""}>
                    <td><Link className="rowlink" href={`/admin/finance/receivables?party=${p.id}`}>{p.name}</Link> <span className={`pill ${p.dir === "لنا" ? "tone-success" : "tone-warning"}`}>{p.dir}</span></td>
                    <td>{p.count}</td><td style={{ fontWeight: 600 }}>{price(p.bal)}</td>
                    <td className="caption">{p.oldest ? date(p.oldest) : "—"}</td>
                    <td>{p.oldest ? <span className={`pill ${d > 30 ? "tone-danger" : d > 14 ? "tone-warning" : "tone-neutral"}`}>{d} يوم</span> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
          {sel?.type === "courier" && !!cod?.length && (
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>طلبات بانتظار التحصيل من شركة التوصيل</span>
              {cod.map((o) => <div key={o.id} className="kv" style={{ fontSize: 13 }}><span className="ltr">#{o.number}</span><span className="caption">{date(o.created_at)} · {days(o.created_at)} يوم</span><span>{price(o.total)}</span></div>)}
            </div>
          )}
        </div>
        {sel && (
          <div className="narrow">
            <FormCard title={sel.type === "courier" ? "تسجيل تحصيل من شركة التوصيل" : `تسجيل سداد لـ ${sel.name}`} action={recordPayment} submitLabel="تسجيل الدفعة">
              <input type="hidden" name="party_type" value={sel.type} />
              <input type="hidden" name="party_id" value={sel.id} />
              <span className="adm-sub">الرصيد المستحق: <b>{price(sel.bal)}</b></span>
              <label className="a-field">المبلغ (ل.س)<input name="amount" type="number" min="1" className="a-in" required defaultValue={sel.bal > 0 ? sel.bal : undefined} /></label>
              <label className="a-field">{sel.type === "courier" ? "استُلم في" : "دُفع من"}<select name="account" className="a-in" defaultValue="1120">{(cashAccs ?? []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
              <label className="a-field">ملاحظة<input name="note" className="a-in" /></label>
              {sel.type === "courier" && <span className="caption">تُعلَّم الطلبات كمدفوعة بالأقدم أولاً حتى يغطيها المبلغ.</span>}
            </FormCard>
          </div>
        )}
      </div>
    </>
  );
}
