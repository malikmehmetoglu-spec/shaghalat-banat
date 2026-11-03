/** حفظ صورة على الجهاز: على الهاتف عبر نافذة المشاركة («حفظ الصورة»)، وإلا تنزيل مباشر */
export async function saveImage(url: string, name: string): Promise<"ok" | "cancel" | "fail"> {
  try {
    const blob = await (await fetch(url, { mode: "cors" })).blob();
    const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
    const safe = name.replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 60) || "image";
    const file = new File([blob], `${safe}.${ext}`, { type: blob.type || "image/jpeg" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return "ok"; }
      catch (e) { if ((e as Error).name === "AbortError") return "cancel"; }
    }
    const href = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href, download: file.name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 4000);
    return "ok";
  } catch {
    window.open(url, "_blank");
    return "fail";
  }
}
