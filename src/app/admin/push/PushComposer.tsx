"use client";
import { useActionState, useState } from "react";
import { sendCampaign, type ActionResult } from "../actions";

export function PushComposer({ categories }: { categories: { label: string; link: string }[] }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [when, setWhen] = useState<"now" | "later">("now");
  const [at, setAt] = useState("");
  const [state, run, pending] = useActionState<ActionResult | null, FormData>(sendCampaign, null);
  const links = [{ label: "الصفحة الرئيسية", link: "/" }, { label: "كل المنتجات", link: "/search" }, ...categories];

  return (
    <div className="split">
      <form action={run} className="acard wide" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 className="adm-h2">إشعار جديد</h2>
        <label className="a-field">العنوان<input name="title" className="a-in" required maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="وصلت تشكيلة العبايات الجديدة ✨" /></label>
        <label className="a-field">النص<textarea name="body" className="a-in" required maxLength={160} rows={3} style={{ height: "auto", paddingTop: 12 }} value={body} onChange={(e) => setBody(e.target.value)} placeholder="خصم 15% لأول 50 طلب — استخدمي الكود BANAT15" /></label>
        <div className="a-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
          <label className="a-field">الجمهور<select name="audience" className="a-in"><option value="all">كل المشتركات</option><option value="buyers">من اشترين سابقاً</option><option value="no_orders">لم يشترين بعد</option><option value="staff">فريق العمل</option></select></label>
          <label className="a-field">عند الضغط يفتح<select name="link" className="a-in">{links.map((l) => <option key={l.link} value={l.link}>{l.label}</option>)}</select></label>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="hidden" name="when" value={when} />
          <button type="button" className={`a-chip${when === "now" ? " on" : ""}`} onClick={() => setWhen("now")}>الآن</button>
          <button type="button" className={`a-chip${when === "later" ? " on" : ""}`} onClick={() => setWhen("later")}>جدولة لوقت لاحق</button>
          {when === "later" && <><input aria-label="موعد الإرسال" type="datetime-local" className="a-in" required value={at} onChange={(e) => setAt(e.target.value)} /><input type="hidden" name="scheduled_at" value={at ? new Date(at).toISOString() : ""} /></>}
        </div>
        {state && <span className={`a-flash ${state.ok ? "tone-success" : "tone-danger"}`}>{state.message}</span>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="submit" className="btn" disabled={pending}>{pending ? "جارٍ الإرسال…" : when === "later" ? "جدولة الإشعار" : "إرسال"}</button>
          <button type="submit" name="test" value="1" className="btn soft" disabled={pending}>إرسال تجريبي لجهازي</button>
        </div>
        <span className="caption">الإرسال المجدول يتم عند فتح هذه الصفحة أو تلقائياً عبر رابط الجدولة (انظري README).</span>
      </form>
      <div className="acard narrow" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 className="adm-h2">المعاينة</h2>
        <div style={{ borderRadius: 28, padding: "18px 14px 40px", background: "linear-gradient(160deg,var(--deep-berry),var(--magenta))" }}>
          <div className="caption" style={{ color: "#fff", textAlign: "center", fontSize: 13, marginBottom: 14 }}>9:41</div>
          <div style={{ background: "rgba(255,255,255,.92)", borderRadius: 18, padding: 12, display: "flex", gap: 10 }}>
            <img src="/icons/icon-192.png" alt="" style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <div className="row-between"><span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>شغلات بنات</span><span className="caption">الآن</span></div>
              <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{title || "عنوان الإشعار"}</span>
              <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-muted)" }}>{body || "نص الإشعار يظهر هنا"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
