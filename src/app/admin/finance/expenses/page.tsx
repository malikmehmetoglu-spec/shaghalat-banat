import { FINANCE_ROLES, requireStaff } from "@/lib/admin";
import { date, price } from "@/lib/format";
import { monthLabel, periodRange } from "@/lib/finance";
import { FormCard } from "../../FormCard";
import { addExpenseCategory, recordExpense } from "../actions";

export const metadata = { title: "المصاريف" };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const { sb } = await requireStaff(FINANCE_ROLES);
  const m = periodRange("month");
  let q = sb.from("expenses").select("id,expense_date,description,amount,is_recurring,receipt_url,category:accounts!expenses_category_fkey(code,name),paid:accounts!expenses_paid_from_fkey(name)").gte("expense_date", m.from).lte("expense_date", m.to).order("expense_date", { ascending: false });
  if (cat) q = q.eq("category", cat);
  const [{ data }, { data: cats }, { data: cashAccs }] = await Promise.all([
    q,
    sb.from("accounts").select("code,name").eq("is_expense_category", true).order("code"),
    sb.from("accounts").select("code,name").eq("is_cash", true).order("code"),
  ]);
  const total = (data ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const receipts = await Promise.all((data ?? []).filter((e) => e.receipt_url).map(async (e) => [e.id, (await sb.storage.from("receipts").createSignedUrl(e.receipt_url!, 3600)).data?.signedUrl] as const));
  const rmap = new Map(receipts);

  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">المصاريف</h1><span className="adm-sub">{monthLabel(new Date())} · إجمالي {price(total)}</span></div></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a href="/admin/finance/expenses" className={`a-chip${!cat ? " on" : ""}`}>الكل</a>
        {(cats ?? []).map((c) => <a key={c.code} href={`/admin/finance/expenses?cat=${c.code}`} className={`a-chip${cat === c.code ? " on" : ""}`}>{c.name}</a>)}
      </div>
      <div className="split">
        <div className="acard flush wide">
          <div className="tw"><table className="tbl">
            <thead><tr><th>البيان</th><th>التصنيف</th><th>التاريخ</th><th>دُفع من</th><th>المبلغ</th><th>الإيصال</th></tr></thead>
            <tbody>
              {(data ?? []).map((e: any) => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 500 }}>{e.description}{e.is_recurring && <span className="pill tone-info" style={{ marginInlineStart: 8 }}>شهري</span>}</td>
                  <td className="caption">{e.category?.name}</td>
                  <td className="caption">{date(e.expense_date)}</td>
                  <td className="caption">{e.paid?.name}</td>
                  <td style={{ fontWeight: 600 }}>{price(e.amount)}</td>
                  <td>{rmap.get(e.id) ? <a href={rmap.get(e.id)!} target="_blank" rel="noreferrer" style={{ color: "var(--magenta)" }}>عرض</a> : <span className="caption">—</span>}</td>
                </tr>
              ))}
              {!data?.length && <tr><td colSpan={6} className="caption" style={{ textAlign: "center", padding: 24 }}>لا مصاريف مسجّلة هذا الشهر</td></tr>}
            </tbody>
          </table></div>
        </div>
        <div className="narrow">
          <FormCard title="تسجيل مصروف" action={recordExpense} submitLabel="حفظ المصروف">
            <label className="a-field">التصنيف<select name="category" className="a-in">{(cats ?? []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
            <label className="a-field">البيان<input name="description" className="a-in" required placeholder="إيجار المحل لشهر أكتوبر" /></label>
            <div className="a-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
              <label className="a-field">المبلغ (ل.س)<input name="amount" type="number" min="1" step="0.01" className="a-in" required /></label>
              <label className="a-field">التاريخ<input name="date" type="date" className="a-in" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
            </div>
            <label className="a-field">دُفع من<select name="paid_from" className="a-in">{(cashAccs ?? []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
            <label className="a-field">صورة الإيصال (اختياري)<input name="receipt" type="file" accept="image/*,application/pdf" capture="environment" className="a-in" style={{ paddingTop: 10 }} /></label>
            <label className="caption" style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="recurring" /> مصروف متكرر شهرياً</label>
          </FormCard>
          <div style={{ height: 16 }} />
          <FormCard title="تصنيف مصاريف جديد" action={addExpenseCategory} submitLabel="إضافة التصنيف">
            <label className="a-field">اسم التصنيف<input name="name" className="a-in" required placeholder="صيانة المحل" /></label>
          </FormCard>
        </div>
      </div>
    </>
  );
}
