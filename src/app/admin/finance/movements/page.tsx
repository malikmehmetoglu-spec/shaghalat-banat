import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { monthBounds, movements, type Kind } from "@/lib/money";
import { MovementList } from "../_ui/MovementRow";

export const metadata = { title: "الحركات" };
const FILTERS: { key: string; label: string; kinds?: Kind[] }[] = [
  { key: "all", label: "الكل" },
  { key: "sale", label: "مبيعات ومرتجعات", kinds: ["sale", "refund"] },
  { key: "expense", label: "مصاريف", kinds: ["expense"] },
  { key: "salary", label: "رواتب", kinds: ["salary"] },
  { key: "purchase", label: "مشتريات", kinds: ["purchase"] },
  { key: "own", label: "المال الخاص", kinds: ["draw", "add"] },
  { key: "transfer", label: "نقل وضبط", kinds: ["transfer", "adjust"] },
  { key: "consign", label: "تجار الأمانة", kinds: ["consign"] },
];
const BOX = [{ key: "", label: "كل الأماكن" }, { key: "1120", label: "شام كاش" }, { key: "1110", label: "صندوق المحل" }];

export default async function Movements({ searchParams }: { searchParams: Promise<{ type?: string; box?: string; m?: string }> }) {
  const sp = await searchParams;
  const { sb } = await requireStaff("/admin/finance");
  const mb = monthBounds(sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? `${sp.m}-15` : undefined);
  const f = FILTERS.find((x) => x.key === sp.type) ?? FILTERS[0];
  let list = await movements(sb, { from: mb.from, to: mb.to, limit: 1000 });
  if (f.kinds) list = list.filter((m) => f.kinds!.includes(m.kind));
  if (sp.box) list = list.filter((m) => m.places.some((p) => p.code === sp.box));
  const sum = (sign: 1 | -1) => list.reduce((s, m) => s + m.places.filter((p) => !sp.box || p.code === sp.box).reduce((a, p) => a + (Math.sign(p.delta) === sign && !(m.kind === "transfer" && !sp.box) ? Math.abs(p.delta) : 0), 0), 0);
  const q = (o: Record<string, string>) => "?" + new URLSearchParams(Object.entries({ type: f.key, box: sp.box ?? "", m: mb.key, ...o }).filter(([, v]) => v && v !== "all")).toString();
  const prev = (() => { const [y, m] = mb.key.split("-").map(Number); const d = new Date(Date.UTC(y, m - 2, 1)); return d.toISOString().slice(0, 7); })();
  const next = (() => { const [y, m] = mb.key.split("-").map(Number); const d = new Date(Date.UTC(y, m, 1)); return d.toISOString().slice(0, 7); })();
  const thisMonth = monthBounds().key;
  const label = `${["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"][Number(mb.key.slice(5)) - 1]} ${mb.key.slice(0, 4)}`;

  return (
    <div className="fin">
      <header className="fin-head">
        <div className="title-block"><h1 className="adm-h1">الحركات</h1><span className="adm-sub">كل ما دخل وخرج من شام كاش وصندوق المحل والمال الخاص</span></div>
        <div className="fin-month">
          <Link href={q({ m: prev })} className="fin-month-btn" aria-label="الشهر السابق">›</Link>
          <b>{label}</b>
          {mb.key < thisMonth ? <Link href={q({ m: next })} className="fin-month-btn" aria-label="الشهر التالي">‹</Link> : <span className="fin-month-btn off">‹</span>}
        </div>
      </header>
      <nav className="fin-filters" aria-label="نوع الحركة">
        {FILTERS.map((x) => <Link key={x.key} href={q({ type: x.key })} className={`fin-chip${f.key === x.key ? " on" : ""}`}>{x.label}</Link>)}
      </nav>
      <nav className="fin-filters" aria-label="المكان">
        {BOX.map((b) => <Link key={b.key} href={q({ box: b.key })} className={`fin-chip sm${(sp.box ?? "") === b.key ? " on" : ""}`}>{b.label}</Link>)}
      </nav>
      <div className="fin-totals">
        <div><span>دخل</span><b className="num fin-c-in">+{Math.round(sum(1)).toLocaleString("en-US")}</b></div>
        <div><span>خرج</span><b className="num fin-c-out">−{Math.round(sum(-1)).toLocaleString("en-US")}</b></div>
        <div><span>عدد الحركات</span><b className="num">{list.length}</b></div>
      </div>
      <section className="fin-block fin-panel"><MovementList items={list} empty={`لا حركات ${f.key === "all" ? "" : `من نوع «${f.label}» `}في هذا الشهر`} /></section>
    </div>
  );
}
