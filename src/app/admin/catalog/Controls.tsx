"use client";
import { useOptimistic, useTransition } from "react";
import { deleteBanner, removeCategory, setBannerImage, setCategoryImage, toggleBanner, toggleCategory, updateCategory } from "../actions";
import { uploadImage } from "../ImageUpload";
import { useRef, useState } from "react";
import { Switch } from "../Switch";

export function CategoryToggle({ id, visible }: { id: string; visible: boolean }) {
  const [v, setV] = useOptimistic(visible);
  const [, start] = useTransition();
  return <Switch on={v} label="إظهار القسم" onChange={(n) => start(async () => { setV(n); await toggleCategory(id, n); })} />;
}

export function BannerControls({ id, active }: { id: string; active: boolean }) {
  const [v, setV] = useOptimistic(active);
  const [pending, start] = useTransition();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Switch on={v} label="تفعيل البانر" onChange={(n) => start(async () => { setV(n); await toggleBanner(id, n); })} />
      <button type="button" className="btn soft" disabled={pending} onClick={() => confirm("حذف هذا البانر؟") && start(() => deleteBanner(id))}>حذف</button>
    </div>
  );
}

/** زر صغير لتغيير صورة قسم/بانر موجود */
function ChangeImage({ folder, url, save }: { folder: string; url: string | null; save: (u: string) => Promise<void> }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" className="btn soft" disabled={busy} onClick={() => ref.current?.click()}>{busy ? "جارٍ الرفع…" : url ? "تغيير الصورة" : "رفع صورة"}</button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        setBusy(true);
        try { await save(await uploadImage(f, folder)); } catch { alert("تعذّر رفع الصورة، حاولي مجدداً"); }
        setBusy(false); e.target.value = "";
      }} />
    </>
  );
}
export const CategoryImage = ({ id, url }: { id: string; url: string | null }) => <ChangeImage folder="categories" url={url} save={(u) => setCategoryImage(id, u)} />;
export const BannerImage = ({ id, url }: { id: string; url: string | null }) => <ChangeImage folder="banners" url={url} save={(u) => setBannerImage(id, u)} />;

/** تعديل قسم موجود: الاسم والترتيب + حفظ / حذف */
export function EditCategory({ id, name, nameEn, sort }: { id: string; name: string; nameEn: string | null; sort: number }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name, name_en: nameEn ?? "", sort_order: sort });
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  if (!open) return <button type="button" className="btn soft" onClick={() => setOpen(true)}>تعديل</button>;
  return (
    <div style={{ flexBasis: "100%", display: "flex", flexDirection: "column", gap: 10, paddingTop: 10, borderTop: "1px solid var(--border-row)" }}>
      <div className="a-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
        <label className="a-field">الاسم<input className="a-in" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="a-field">بالإنجليزية<input className="a-in ltr" value={f.name_en} onChange={(e) => setF({ ...f, name_en: e.target.value })} /></label>
        <label className="a-field">الترتيب<input className="a-in" type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: Number(e.target.value) })} /></label>
      </div>
      {msg && <span className={`a-flash ${msg.ok ? "tone-success" : "tone-danger"}`}>{msg.message}</span>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn" disabled={pending} onClick={() => start(async () => { const r = await updateCategory(id, f); setMsg(r); if (r.ok) setOpen(false); })}>{pending ? "جارٍ الحفظ…" : "حفظ"}</button>
        <button type="button" className="btn soft" disabled={pending} onClick={() => setOpen(false)}>إلغاء</button>
        <button type="button" className="btn soft" disabled={pending} style={{ color: "#c62828", marginInlineStart: "auto" }}
          onClick={() => confirm(`حذف قسم «${name}»؟`) && start(async () => setMsg(await removeCategory(id)))}>حذف القسم</button>
      </div>
    </div>
  );
}
