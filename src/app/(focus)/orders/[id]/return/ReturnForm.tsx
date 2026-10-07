"use client";
import { useState } from "react";
import Link from "next/link";
import { PageHeaderClient } from "@/components/PageHeaderClient";
import { Icon } from "@/components/Icon";
import { getBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/components/LangProvider";

type Item = { id: number; product_name: string; variant_label: string | null; qty: number };
const REASONS = ["المقاس غير مناسب", "اللون مختلف عن الصورة", "المنتج به عيب", "وصلني منتج خاطئ", "غيّرت رأيي"];
const RST: Record<string, string> = { pending: "قيد المراجعة", approved: "تمت الموافقة", rejected: "مرفوض", done: "مكتمل" };

export function ReturnForm({ orderId, number, delivered, items, existing }: { orderId: string; number: string; delivered: boolean; items: Item[]; existing: { number: string; status: string } | null }) {
  const t = useT();
  const [item, setItem] = useState<number | null>(items[0]?.id ?? null);
  const [kind, setKind] = useState<"return" | "exchange">("exchange");
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<string | null>(existing ? existing.number : null);

  if (done) {
    return (
      <main className="page tight no-nav" style={{ alignItems: "center", textAlign: "center", justifyContent: "center", gap: 16 }}>
        <span style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--magenta)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={36} stroke={2.6} /></span>
        <h1 className="h-title">{existing ? t("لديك طلب إرجاع لهذا الطلب") : t("تم إرسال طلبك")}</h1>
        <span className="muted ltr">#{done}</span>
        {existing && <span className="pill tone-info">{t(RST[existing.status])}</span>}
        <p className="muted" style={{ lineHeight: 1.8 }}>{t("سنتواصل معك خلال 24 ساعة لترتيب الاستلام.")}</p>
        <Link href="/account" className="btn secondary block" style={{ height: 56 }}>{t("العودة لحسابي")}</Link>
      </main>
    );
  }

  async function submit() {
    setBusy(true); setErr("");
    const sb = getBrowserClient();
    const { data: u } = await sb.auth.getUser();
    const { data, error } = await sb.from("return_requests").insert({ order_id: orderId, user_id: u.user?.id, order_item_id: item, kind, reason, note: note.trim() || null }).select("number").single();
    setBusy(false);
    if (error || !data) { setErr(t("تعذّر إرسال الطلب، حاولي مجدداً")); return; }
    setDone(data.number);
  }

  return (
    <main className="page tight no-nav">
      <PageHeaderClient title={t("طلب إرجاع أو استبدال")} back={`/orders/${orderId}`} />
      <div className="alert tone-info" style={{ lineHeight: 1.8 }}>{t("يمكنك الإرجاع أو الاستبدال خلال 7 أيام من الاستلام. اللانجري والعطور المفتوحة لا تُرجَع حفاظاً على الصحة.")}</div>
      {!delivered ? <div className="alert tone-warning">{t("يمكن طلب الإرجاع بعد توصيل الطلب.")}</div> : (
        <>
          <div className="field"><span>{t("اختاري المنتج · طلب")} <span className="ltr">#{number}</span></span>
            {items.map((it) => (
              <button key={it.id} type="button" onClick={() => setItem(it.id)} className="soft-card" style={{ textAlign: "right", border: item === it.id ? "2px solid var(--magenta)" : "2px solid transparent", font: "inherit", color: "inherit", cursor: "pointer" }}>
                <span style={{ fontWeight: 600, lineHeight: 1.5 }}>{it.product_name}</span>
                <span className="caption">{it.variant_label} {t("· الكمية")} {it.qty}</span>
              </button>
            ))}
          </div>
          <div className="field"><span>{t("نوع الطلب")}</span>
            <div style={{ display: "flex", gap: 10 }}>
              {([["exchange", t("استبدال")], ["return", t("إرجاع واسترداد")]] as const).map(([k, l]) => <button key={k} type="button" className={`size${kind === k ? " on" : ""}`} style={{ flex: 1 }} onClick={() => setKind(k)}>{l}</button>)}
            </div>
          </div>
          <label className="field">{t("سبب الطلب")}<select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((r) => <option key={r} value={r}>{t(r)}</option>)}</select></label>
          <label className="field">{t("ملاحظات")}<textarea className="input" rows={3} style={{ paddingTop: 14, height: "auto" }} value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === "exchange" ? t("المقاس أو اللون المطلوب بدلاً منه") : ""} /></label>
          {err && <div className="alert tone-danger">{err}</div>}
          <div className="action-bar"><button type="button" className="btn cta block" disabled={busy || !item} onClick={submit}>{busy ? t("جارٍ الإرسال…") : t("إرسال الطلب")}</button></div>
        </>
      )}
    </main>
  );
}
