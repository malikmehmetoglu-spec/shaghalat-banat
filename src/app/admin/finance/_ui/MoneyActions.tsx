"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { moneyAction } from "../actions";
import { AmountField } from "./AmountField";
import { PlacePicker, type Place } from "./PlacePicker";
import { Sheet } from "./Sheet";

type Kind = "expense" | "draw" | "add" | "transfer" | "adjust";
const META: Record<Kind, { title: string; sub: string; tone: string; icon: Parameters<typeof Icon>[0]["name"]; cta: string }> = {
  expense: { title: "تسجيل مصروف", sub: "إيجار، كهرباء، تسويق، توصيل…", tone: "out", icon: "minus", cta: "تسجيل المصروف" },
  draw: { title: "سحب إلى المال الخاص", sub: "مال يخرج من المتجر إلى جيبك", tone: "own", icon: "logout", cta: "سحب المبلغ" },
  add: { title: "إضافة من المال الخاص", sub: "مال تضعه في المتجر من جيبك", tone: "own", icon: "plus", cta: "إضافة المبلغ" },
  transfer: { title: "نقل بين الصندوقين", sub: "مثلاً إيداع نقود المحل في شام كاش", tone: "move", icon: "sort", cta: "نقل المبلغ" },
  adjust: { title: "ضبط رصيد صندوق", sub: "اكتب المبلغ الموجود فعلاً الآن", tone: "move", icon: "edit", cta: "ضبط الرصيد" },
};

export function MoneyActions({ sham, shop, owner, rate, categories, open: initial }: { sham: number; shop: number; owner: boolean; rate: number; categories: { code: string; name: string }[]; open?: Kind }) {
  const router = useRouter();
  const [open, setOpen] = useState<Kind | null>(initial ?? null);
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);
  const tiles: { kind?: Kind; href?: string; label: string; sub: string; icon: Parameters<typeof Icon>[0]["name"]; tone: string; ownerOnly?: boolean }[] = [
    { kind: "expense", label: "مصروف", sub: "ما يُصرف على المتجر", icon: "minus", tone: "out" },
    { href: "/admin/finance/salaries", label: "راتب", sub: "دفع رواتب الموظفات", icon: "user", tone: "out" },
    { href: "/admin/products", label: "شراء بضاعة", sub: "عند إدخال البضاعة للمستودع", icon: "boxes", tone: "out" },
    { kind: "draw", label: "سحب لي", sub: "إلى المال الخاص", icon: "logout", tone: "own", ownerOnly: true },
    { kind: "add", label: "إضافة من جيبي", sub: "من المال الخاص", icon: "plus", tone: "own" },
    { kind: "transfer", label: "نقل", sub: "بين شام كاش والمحل", icon: "sort", tone: "move" },
  ];
  return (
    <>
      <div className="fin-actions">
        {tiles.filter((t) => !t.ownerOnly || owner).map((t) => {
          const body = (<><span className={`fin-act-ic fin-t-${t.tone}`}><Icon name={t.icon} size={22} stroke={2} /></span><b>{t.label}</b><span>{t.sub}</span></>);
          return t.href
            ? <Link key={t.label} href={t.href} className="fin-act">{body}</Link>
            : <button key={t.label} type="button" className="fin-act" onClick={() => setOpen(t.kind!)}>{body}</button>;
        })}
      </div>
      {open && <MoneySheet kind={open} sham={sham} shop={shop} rate={rate} categories={categories} onClose={() => setOpen(null)}
        onDone={(r) => { setToast(r); if (r.ok) { setOpen(null); router.refresh(); } setTimeout(() => setToast(null), 3500); }} />}
      {toast && <div className={`ob-toast ${toast.ok ? "ok" : "bad"}`} role="status">{toast.message}</div>}
    </>
  );
}

export function MoneySheet({ kind, sham, shop, rate, categories, onClose, onDone, presetTo }: {
  kind: Kind; sham: number; shop: number; rate: number; categories: { code: string; name: string }[];
  onClose: () => void; onDone: (r: { ok: boolean; message: string }) => void; presetTo?: string;
}) {
  const m = META[kind];
  const boxes: Place[] = [{ code: "1120", name: "شام كاش", balance: sham }, { code: "1110", name: "صندوق المحل", balance: shop }];
  const withPrivate: Place[] = [...boxes, { code: "3100", name: "المال الخاص", balance: null }];
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"SYP" | "USD">("SYP");
  const [from, setFrom] = useState(kind === "expense" ? "1110" : "1110");
  const [to, setTo] = useState(presetTo ?? (kind === "transfer" ? "1120" : "1110"));
  const [category, setCategory] = useState(categories[0]?.code ?? "");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (kind !== "adjust" && !(Number(amount) > 0)) { setErr("اكتب المبلغ"); return; }
    if (kind === "adjust" && amount === "") { setErr("اكتب المبلغ الموجود فعلاً"); return; }
    if (kind === "expense" && !note.trim()) { setErr("اكتب على ماذا صُرف المبلغ"); return; }
    start(async () => {
      const r = await moneyAction({ kind, amount: Number(amount), currency, from, to, category, note, date });
      if (!r.ok) setErr(r.message); else onDone(r);
    });
  };
  const src = from === "1120" ? sham : from === "1110" ? shop : null;
  const over = (kind === "draw" || kind === "transfer") && src != null && currency === "SYP" && Number(amount) > src;
  return (
    <Sheet title={m.title} sub={m.sub} tone={m.tone} onClose={onClose}>
      <form onSubmit={submit} className="fin-form">
        {kind === "expense" && (
          <div className="fin-field">
            <span className="fin-label">نوع المصروف</span>
            <div className="fin-chips">{categories.map((c) => <button key={c.code} type="button" className={`fin-chip${category === c.code ? " on" : ""}`} onClick={() => setCategory(c.code)}>{c.name}</button>)}</div>
          </div>
        )}
        <AmountField value={amount} onChange={setAmount} currency={currency} onCurrency={setCurrency} rate={rate} allowUsd={kind !== "adjust"} autoFocus
          label={kind === "adjust" ? "المبلغ الموجود فعلاً" : "المبلغ"} />
        {kind === "expense" && <PlacePicker label="دُفع من" places={withPrivate} value={from} onChange={setFrom} />}
        {(kind === "draw" || kind === "transfer") && <PlacePicker label="من" places={boxes} value={from} onChange={(c) => { setFrom(c); if (kind === "transfer" && c === to) setTo(c === "1120" ? "1110" : "1120"); }} />}
        {(kind === "add" || kind === "transfer" || kind === "adjust") && <PlacePicker label={kind === "adjust" ? "الصندوق" : "إلى"} places={boxes} value={to} onChange={setTo} disabled={kind === "transfer" ? from : undefined} />}
        {over && <span className="a-flash tone-warning">المبلغ أكبر من الرصيد المسجّل في هذا الصندوق</span>}
        {kind === "expense" && from === "3100" && <span className="fin-hint">يُحسب مصروفاً على المتجر، ولا يُنقص شام كاش أو صندوق المحل.</span>}
        {kind === "adjust" && <span className="fin-hint">الفرق بين الرصيد المسجّل والمبلغ الفعلي يُسجَّل على المال الخاص، فلا يظهر ربحاً ولا خسارة.</span>}
        <label className="fin-field"><span className="fin-label">{kind === "expense" ? "على ماذا؟" : "ملاحظة (اختياري)"}</span>
          <input className="fin-in" value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === "expense" ? "إيجار المحل لشهر نوفمبر" : ""} /></label>
        {kind === "expense" && <label className="fin-field"><span className="fin-label">التاريخ (اختياري، الافتراضي اليوم)</span><input className="fin-in" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>}
        {err && <span className="a-flash tone-danger">{err}</span>}
        <button className={`fin-submit fin-t-${m.tone}`} disabled={pending}>{pending ? "جارٍ التسجيل…" : m.cta}</button>
      </form>
    </Sheet>
  );
}
