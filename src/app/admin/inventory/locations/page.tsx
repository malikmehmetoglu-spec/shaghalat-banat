import Link from "next/link";
import { getLocations, requireStaff } from "@/lib/admin";
import { price } from "@/lib/format";
import { loadVariants } from "@/lib/inventory";
import { FormCard } from "../../FormCard";
import { saveLocation } from "../../actions";
import { LocationOnline } from "./LocationOnline";
import { DeleteLocation } from "./DeleteLocation";

export const metadata = { title: "المواقع والمستودعات" };
const KIND: Record<string, string> = { store: "محل", warehouse: "مستودع", transit: "قيد النقل" };

export default async function LocationsPage() {
  const { sb, profile } = await requireStaff();
  const [locs, all] = await Promise.all([getLocations(), loadVariants(sb)]);
  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">المواقع والمستودعات</h1><span className="adm-sub">كل مكان يُحفظ فيه مخزون، وكيف يظهر للعميلات في التطبيق</span></div></div>
      <div className="split">
        <div className="wide" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
          {locs.map((l) => {
            const units = all.reduce((s, v) => s + (v.stock[l.id]?.on_hand ?? 0), 0);
            const value = all.reduce((s, v) => s + (v.stock[l.id]?.on_hand ?? 0) * v.price, 0);
            return (
              <div key={l.id} className="acard" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="row-between"><b style={{ fontSize: 16, lineHeight: 1.5 }}>{l.name}</b><span className="pill tone-brand">{KIND[l.kind]}</span></div>
                {l.address && <span className="caption">{l.address}</span>}
                <div className="kv" style={{ fontSize: 13 }}><span className="adm-sub">عدد القطع</span><b>{units}</b></div>
                <div className="kv" style={{ fontSize: 13 }}><span className="adm-sub">قيمة المخزون</span><b>{price(value)}</b></div>
                <div className="kv" style={{ fontSize: 13, alignItems: "center" }}><span className="adm-sub">متاح للطلب أونلاين</span><LocationOnline id={l.id} on={l.sells_online} /></div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link href={`/admin/inventory/count?loc=${l.id}`} className="btn soft" style={{ flex: 1 }}>جرد</Link>
                  <Link href="/admin/inventory/moves" className="btn soft" style={{ flex: 1 }}>تحويل منه</Link>
                </div>
                {profile.role === "owner" && l.kind !== "store" && <DeleteLocation id={l.id} name={l.name} units={units} />}
              </div>
            );
          })}
        </div>
        <div className="narrow" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 className="adm-h2">قواعد الربط مع التطبيق</h2>
            <span className="caption" style={{ lineHeight: 1.8 }}>المخزون في المواقع المفعّل فيها «متاح للطلب أونلاين» يظهر للعميلات كمتاح. عند الطلب يُحجز من المستودع أولاً ثم المحل.</span>
          </div>
          <FormCard title="إضافة موقع" action={saveLocation} submitLabel="إضافة">
            <label className="a-field">الاسم<input name="name" className="a-in" required /></label>
            <label className="a-field">النوع<select name="kind" className="a-in"><option value="warehouse">مستودع</option><option value="store">محل</option><option value="transit">قيد النقل</option></select></label>
            <label className="a-field">العنوان<input name="address" className="a-in" /></label>
            <label className="caption" style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="sells_online" /> متاح للطلب أونلاين</label>
          </FormCard>
        </div>
      </div>
    </>
  );
}
