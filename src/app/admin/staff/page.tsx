import { requireStaff, ROLE_LABEL } from "@/lib/admin";
import { date } from "@/lib/format";
import { FormCard } from "../FormCard";
import { setRole } from "../actions";

export const metadata = { title: "الموظفون والأدوار" };

const MATRIX: [string, string[]][] = [
  ["لوحة المؤشرات", ["owner", "sales", "inventory", "accountant", "cashier"]],
  ["الطلبات والعملاء", ["owner", "sales"]],
  ["المنتجات والأقسام والكوبونات", ["owner", "sales"]],
  ["المخزون والجرد والمشتريات", ["owner", "inventory"]],
  ["نقطة البيع في المحل", ["owner", "sales", "cashier"]],
  ["المالية والمحاسبة (المرحلة 3)", ["owner", "accountant"]],
  ["الموظفون والأدوار", ["owner"]],
];

export default async function StaffPage() {
  const { sb, profile } = await requireStaff();
  const { data } = await sb.from("profiles").select("id,full_name,phone,email,role,created_at").neq("role", "customer").order("created_at");
  const roles = ["owner", "sales", "inventory", "accountant", "cashier"];

  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">الموظفون والأدوار</h1><span className="adm-sub">من يستطيع الدخول إلى لوحة الإدارة</span></div></div>
      <div className="split">
        <div className="acard flush wide">
          <div className="tw">
            <table className="tbl">
              <thead><tr><th>الموظفة</th><th>التواصل</th><th>الدور</th><th>منذ</th></tr></thead>
              <tbody>
                {(data ?? []).map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.full_name || "—"}{s.id === profile.id ? " (أنتِ)" : ""}</td>
                    <td className="caption ltr" style={{ textAlign: "right" }}>{s.email || s.phone}</td>
                    <td><span className="pill tone-brand">{ROLE_LABEL[s.role]}</span></td>
                    <td className="caption">{date(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="narrow">
          {profile.role === "owner" ? (
            <FormCard title="إضافة موظفة أو تغيير دور" action={setRole} submitLabel="حفظ">
              <span className="caption">تسجّل الموظفة دخولها في التطبيق مرة واحدة أولاً، ثم تضيفينها هنا ببريدها أو رقمها. لإزالة صلاحية موظفة اختاري «عميلة».</span>
              <label className="a-field">البريد أو رقم الهاتف<input name="who" className="a-in ltr" required placeholder="name@email.com أو +9639…" /></label>
              <label className="a-field">الدور
                <select name="role" className="a-in" defaultValue="sales">
                  {[...roles, "customer"].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </label>
            </FormCard>
          ) : (
            <div className="acard caption">تغيير الأدوار متاح للمديرة فقط.</div>
          )}
        </div>
      </div>
      <div className="acard flush">
        <h2 className="adm-h2" style={{ padding: "12px 14px 4px" }}>صلاحيات الأدوار</h2>
        <div className="tw">
          <table className="tbl">
            <thead><tr><th>القسم</th>{roles.map((r) => <th key={r} style={{ textAlign: "center" }}>{ROLE_LABEL[r]}</th>)}</tr></thead>
            <tbody>
              {MATRIX.map(([area, allowed]) => (
                <tr key={area}><td style={{ fontWeight: 500 }}>{area}</td>{roles.map((r) => <td key={r} style={{ textAlign: "center", color: allowed.includes(r) ? "var(--magenta)" : "var(--rosy-gray)", fontWeight: 700 }}>{allowed.includes(r) ? "✓" : "—"}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="caption" style={{ padding: "10px 14px 14px" }}>في هذه المرحلة كل أعضاء الفريق يرون كل الأقسام؛ تقييد الأقسام حسب الدور يُفعّل مع المرحلة 3.</p>
      </div>
    </>
  );
}
