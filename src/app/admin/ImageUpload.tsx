"use client";
import { useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

/** تصغير الصورة وتحويلها إلى WebP قبل الرفع (أسرع للعميلات وأخف على الإنترنت) */
async function compress(file: File, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b ?? file), "image/webp", 0.85));
}

export async function uploadImage(file: File, folder: string): Promise<string> {
  const blob = await compress(file);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const sb = getBrowserClient();
  const { error } = await sb.storage.from("media").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw error;
  return sb.storage.from("media").getPublicUrl(path).data.publicUrl;
}

/**
 * حقل رفع صور. يكتب الروابط في حقل مخفي باسم `name` (سطر لكل صورة) ليُرسل مع النموذج.
 * multiple: عدة صور للمنتج — الأولى هي الصورة الرئيسية.
 */
export function ImageUpload({ name, folder, initial = [], multiple = false, label = "الصورة", ratio = "4 / 5", onChange }: {
  name?: string; folder: string; initial?: string[]; multiple?: boolean; label?: string; ratio?: string; onChange?: (urls: string[]) => void;
}) {
  const [urls, setUrls] = useState<string[]>(initial.filter(Boolean));
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const update = (next: string[]) => { setUrls(next); onChange?.(next); };

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    setErr("");
    const list = Array.from(files).slice(0, multiple ? 10 : 1);
    setBusy(list.length);
    const done: string[] = [];
    for (const f of list) {
      if (!f.type.startsWith("image/")) { setErr("اختاري ملف صورة (JPG أو PNG أو WEBP)"); continue; }
      try { done.push(await uploadImage(f, folder)); } catch { setErr("تعذّر رفع الصورة، تحقّقي من الاتصال وحاولي مجدداً"); }
      setBusy((b) => b - 1);
    }
    setBusy(0);
    if (done.length) update(multiple ? [...urls, ...done] : done);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="a-field" style={{ gap: 10 }}>
      <span>{label}{multiple && <span className="caption" style={{ fontWeight: 400 }}> — الصورة الأولى هي الرئيسية</span>}</span>
      {name && <input type="hidden" name={name} value={urls.join("\n")} />}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {urls.map((u, i) => (
          <div key={u} style={{ position: "relative", width: 96, aspectRatio: ratio, borderRadius: 14, overflow: "hidden", background: `url(${u}) center/cover`, border: i === 0 && multiple ? "2px solid var(--magenta)" : "1px solid var(--border-soft)", flexShrink: 0 }}>
            <div style={{ position: "absolute", insetInline: 4, bottom: 4, display: "flex", gap: 4, justifyContent: "space-between" }}>
              {multiple && i > 0 && <button type="button" title="اجعليها الرئيسية" onClick={() => update([u, ...urls.filter((x) => x !== u)])} style={btn}>★</button>}
              <button type="button" title="حذف الصورة" onClick={() => update(urls.filter((x) => x !== u))} style={{ ...btn, marginInlineStart: "auto" }}>×</button>
            </div>
          </div>
        ))}
        {(multiple || urls.length === 0) && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy > 0}
            style={{ width: 96, aspectRatio: ratio, borderRadius: 14, border: "1.5px dashed var(--rosy-gray)", background: "var(--surface-admin)", color: "var(--deep-berry)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", font: "inherit", fontSize: 12, lineHeight: 1.4, padding: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{busy ? "…" : "+"}</span>
            {busy ? "جارٍ الرفع" : "رفع صورة"}
          </button>
        )}
        {!multiple && urls.length > 0 && <button type="button" className="btn soft" style={{ alignSelf: "flex-end" }} onClick={() => input.current?.click()} disabled={busy > 0}>{busy ? "جارٍ الرفع…" : "تغيير"}</button>}
      </div>
      <input ref={input} type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => pick(e.target.files)} />
      {err && <span className="caption" style={{ color: "var(--danger-fg)" }}>{err}</span>}
    </div>
  );
}

const btn: React.CSSProperties = { width: 26, height: 26, padding: 0, border: 0, borderRadius: 13, background: "rgba(255,255,255,.92)", color: "var(--deep-berry)", fontSize: 14, lineHeight: 1, cursor: "pointer" };
