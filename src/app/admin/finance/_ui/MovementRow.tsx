import { Icon } from "@/components/Icon";
import { KIND, PLACE_NAME, type Movement } from "@/lib/money";

const fmt = (v: number) => Math.round(Math.abs(v)).toLocaleString("en-US");
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Damascus" });

/** سطر حركة: أيقونة النوع · البيان · أي صندوق تأثّر · المبلغ بإشارته */
export function MovementRow({ m }: { m: Movement }) {
  const k = KIND[m.kind];
  const sign = m.places.length === 1 ? (m.places[0].delta > 0 ? "+" : "−") : "";
  const tone = m.kind === "transfer" || m.kind === "adjust" ? "move" : sign === "+" ? "in" : sign === "−" ? "out" : k.tone;
  const where = m.places.length === 2
    ? `${PLACE_NAME[m.places.find((p) => p.delta < 0)!.code]} ← ${PLACE_NAME[m.places.find((p) => p.delta > 0)!.code]}`
    : m.places.length === 1 ? PLACE_NAME[m.places[0].code] : m.personal ? "من المال الخاص" : "—";
  return (
    <div className="fin-mv">
      <span className={`fin-mv-ic fin-t-${k.tone}`}><Icon name={k.icon as any} size={18} stroke={2} /></span>
      <span className="fin-mv-t">
        <b>{m.memo}</b>
        <span><span className={`fin-tag fin-t-${k.tone}`}>{k.label}</span> {where} · <span className="num">{time(m.at)}</span></span>
      </span>
      <b className={`fin-mv-amt num fin-c-${tone}`}>{sign}{fmt(m.amount)}</b>
    </div>
  );
}

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const dayLabel = (d: string) => { const x = new Date(d + "T12:00:00Z"); return `${DAYS[x.getUTCDay()]} ${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`; };

/** تجميع الحركات حسب اليوم */
export function MovementList({ items, empty = "لا حركات بعد" }: { items: Movement[]; empty?: string }) {
  if (!items.length) return <div className="fin-empty">{empty}</div>;
  const days = new Map<string, Movement[]>();
  for (const m of items) days.set(m.date, [...(days.get(m.date) ?? []), m]);
  const today = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
  const yest = new Date(Date.now() + 3 * 3600 * 1000 - 864e5).toISOString().slice(0, 10);
  return (
    <div className="fin-days">
      {[...days.entries()].map(([d, list]) => (
        <section key={d} className="fin-day">
          <h3 className="fin-day-h">{d === today ? "اليوم" : d === yest ? "أمس" : dayLabel(d)}</h3>
          <div className="fin-mv-list">{list.map((m) => <MovementRow key={m.id} m={m} />)}</div>
        </section>
      ))}
    </div>
  );
}
