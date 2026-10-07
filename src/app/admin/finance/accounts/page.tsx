import { FINANCE_ROLES, requireStaff } from "@/lib/admin";
import { price } from "@/lib/format";
import { accountTotals, balanceOf, isDebitNature, TYPE_LABEL } from "@/lib/finance";
import { FormCard } from "../../FormCard";
import { addAccount } from "../actions";

export const metadata = { title: "دليل الحسابات" };

export default async function AccountsPage() {
  const { sb } = await requireStaff(FINANCE_ROLES);
  const rows = (await accountTotals(sb)) ?? [];
  const groups = ["asset", "liability", "equity", "revenue", "expense"];

  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">دليل الحسابات</h1><span className="adm-sub">شجرة الحسابات مجهّزة لمتجر ملابس بقناتي بيع · الأرصدة حتى اليوم</span></div></div>
      <div className="split">
        <div className="acard flush wide">
          <div className="tw"><table className="tbl">
            <thead><tr><th>رقم الحساب</th><th>اسم الحساب</th><th>النوع</th><th>الطبيعة</th><th>الرصيد</th></tr></thead>
            <tbody>
              {groups.map((g) => {
                const list = rows.filter((r) => r.type === g);
                const tot = list.reduce((s, r) => s + balanceOf(r), 0);
                return [
                  <tr key={g} style={{ background: "var(--surface-admin)" }}><td colSpan={4} style={{ fontWeight: 700 }}>{TYPE_LABEL[g]}</td><td style={{ fontWeight: 700 }}>{price(tot)}</td></tr>,
                  ...list.map((r) => (
                    <tr key={r.code}>
                      <td className="ltr" style={{ textAlign: "right", paddingInlineStart: 28 }}>{r.code}</td>
                      <td>{r.name}</td>
                      <td className="caption">{TYPE_LABEL[r.type]}</td>
                      <td className="caption">{isDebitNature(r.type) ? "مدين" : "دائن"}</td>
                      <td style={{ fontWeight: 600 }}>{price(balanceOf(r))}</td>
                    </tr>
                  )),
                ];
              })}
            </tbody>
          </table></div>
        </div>
        <div className="narrow">
          <FormCard title="حساب جديد" action={addAccount} submitLabel="إضافة الحساب">
            <div className="a-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
              <label className="a-field">رقم الحساب<input name="code" className="a-in ltr" required placeholder="5800" inputMode="numeric" /></label>
              <label className="a-field">النوع<select name="type" className="a-in" defaultValue="expense">{groups.map((g) => <option key={g} value={g}>{TYPE_LABEL[g]}</option>)}</select></label>
            </div>
            <label className="a-field">اسم الحساب<input name="name" className="a-in" required placeholder="صيانة المحل" /></label>
            <label className="caption" style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="is_cash" /> حساب نقدي (صندوق أو بنك)</label>
            <span className="caption">حسابات المصاريف الجديدة تظهر تلقائياً كتصنيف في صفحة المصاريف.</span>
          </FormCard>
        </div>
      </div>
    </>
  );
}
