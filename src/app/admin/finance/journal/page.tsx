import { FINANCE_ROLES, requireStaff } from "@/lib/admin";
import { date, price } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/finance";
import { ManualEntry } from "./ManualEntry";

export const metadata = { title: "القيود اليومية" };

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ src?: string }> }) {
  const { src } = await searchParams;
  const { sb } = await requireStaff(FINANCE_ROLES);
  let q = sb.from("journal_entries").select("id,number,entry_date,memo,source,journal_lines(id,account_code,debit,credit,account:accounts(name))").order("created_at", { ascending: false }).limit(60);
  if (src) q = q.eq("source", src);
  const [{ data }, { data: accs }] = await Promise.all([q, sb.from("accounts").select("code,name").order("code")]);

  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">القيود اليومية</h1><span className="adm-sub">معظم القيود تُنشأ تلقائياً من الطلبات ونقطة البيع والمشتريات والمصاريف</span></div></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a href="/admin/finance/journal" className={`a-chip${!src ? " on" : ""}`}>الكل</a>
        {Object.entries(SOURCE_LABEL).map(([k, l]) => <a key={k} href={`/admin/finance/journal?src=${k}`} className={`a-chip${src === k ? " on" : ""}`}>{l}</a>)}
      </div>
      <div className="split">
        <div className="wide" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(data ?? []).map((e: any) => {
            const t = e.journal_lines.reduce((s: number, l: any) => s + Number(l.debit), 0);
            return (
              <div key={e.id} className="acard flush">
                <div className="row-between" style={{ padding: "12px 14px", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ lineHeight: 1.5 }}>{e.memo}</b><span className="caption"><span className="ltr">{e.number}</span> · {date(e.entry_date)}</span></span>
                  <span className={`pill ${e.source === "manual" ? "tone-brand" : "tone-neutral"}`}>{SOURCE_LABEL[e.source] ?? e.source}</span>
                </div>
                <div className="tw"><table className="tbl">
                  <thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th></tr></thead>
                  <tbody>
                    {e.journal_lines.map((l: any) => <tr key={l.id}><td><span className="caption ltr">{l.account_code}</span> {l.account?.name}</td><td>{Number(l.debit) ? price(l.debit) : ""}</td><td>{Number(l.credit) ? price(l.credit) : ""}</td></tr>)}
                    <tr><td style={{ fontWeight: 700 }}>الإجمالي</td><td style={{ fontWeight: 700 }}>{price(t)}</td><td style={{ fontWeight: 700 }}>{price(t)}</td></tr>
                  </tbody>
                </table></div>
              </div>
            );
          })}
          {!data?.length && <div className="acard caption" style={{ textAlign: "center" }}>لا قيود بعد</div>}
        </div>
        <div className="narrow"><ManualEntry accounts={accs ?? []} /></div>
      </div>
    </>
  );
}
