"use client";
import { useOptimistic, useTransition } from "react";
import { deleteBanner, setBannerImage, setCategoryImage, toggleBanner, toggleCategory } from "../actions";
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
