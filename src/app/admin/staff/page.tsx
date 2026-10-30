import { requireStaff, ROLE_LABEL } from "@/lib/admin";
import { date } from "@/lib/format";
import { FormCard } from "../FormCard";
import { createStaff } from "../actions";
import { AccessPicker, MyPassword, StaffRow } from "./StaffControls";
import { ROLE_BASE, SECTIONS } from "@/lib/access";

export const metadata = { title: "الموظفون والأدوار" };

const ROLES = ["owner", "manager", "sales", "marketing", "inventory"];
export default async function StaffPage() {
  const { sb, profile } = await requireStaff();
  const { data } = await sb.rpc("staff_accounts");
  const isOwner = profile.role === "owner";
  const rows = (data ?? []) as { id: string; login: string; full_name: string | null; role: string; extra_access: string[] | null; active: boolean; last_sign_in_at: string | null; created_at: string }[];

  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">الموظفون والأدوار</h1><span className="adm-sub">حسابات الدخول إلى لوحة الإدارة — اسم مستخدم وكلمة مرور</span></div></div>
      <div className="split">
        <div className="acard flush wide">
          <div className="tw">
            <table className="tbl">
              <thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>الصلاحيات</th><th>آخر دخول</th><th>الحالة</th>{isOwner && <th></th>}</tr></thead>
              <tbody>
                {rows.map((s) => (
                  <StaffRow key={s.id} isOwner={isOwner} isMe={s.id === profile.id}
                    s={{ ...s, login: s.login.replace(/@shaghalat-banat\.com$/, ""), last: s.last_sign_in_at ? date(s.last_sign_in_at, true) : "لم يدخل بعد" }}
                    roles={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} sections={[...SECTIONS]} base={ROLE_BASE} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="narrow" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isOwner ? (
            <FormCard title="حساب موظف جديد" action={createStaff} submitLabel="إنشاء الحساب">
              <label className="a-field">الاسم<input name="name" className="a-in" required placeholder="سارة" /></label>
              <label className="a-field">اسم المستخدم<input name="login" className="a-in ltr" required placeholder="sara" autoComplete="off" /></label>
              <label className="a-field">كلمة المرور<input name="password" type="text" className="a-in ltr" required minLength={6} autoComplete="new-password" /></label>
              <label className="a-field">الدور
                <select name="role" className="a-in" defaultValue="sales">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
              </label>
              <AccessPicker sections={[...SECTIONS]} base={ROLE_BASE} />
              <span className="caption">يدخل الموظف من صفحة <span className="ltr">/admin-login</span> باسم المستخدم وكلمة المرور.</span>
            </FormCard>
          ) : <div className="acard caption">إنشاء الحسابات وتعديلها متاح للمدير العام فقط.</div>}
          <MyPassword />
        </div>
      </div>
      <div className="acard">
        <h2 className="adm-h2">الأدوار وصلاحياتها الأساسية</h2>
        <div className="stf-roles">
          {ROLES.map((r) => (
            <div key={r} className="stf-role">
              <b>{ROLE_LABEL[r]}</b>
              <div className="stf-chips">{(r === "owner" ? SECTIONS.map((x) => x.key) : ROLE_BASE[r]).map((k) => <span key={k} className="stf-chip on">{SECTIONS.find((x) => x.key === k)?.label}</span>)}</div>
              {r === "owner" && <span className="caption">كل الأقسام، والموظفون والأدوار</span>}
            </div>
          ))}
        </div>
        <p className="caption" style={{ marginTop: 10 }}>لوحة المؤشرات وتغيير كلمة المرور متاحان للجميع. يستطيع المدير العام منح أي موظفة أقساماً إضافية من عمود «الصلاحيات».</p>
      </div>
    </>
  );
}
