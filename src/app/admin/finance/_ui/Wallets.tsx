import { Icon } from "@/components/Icon";
import type { Snapshot } from "@/lib/money";
import { BoxAdjust } from "./BoxAdjust";

const n = (v: number) => Math.round(v).toLocaleString("en-US");

/** البطاقات الأربع: شام كاش · صندوق المحل · المال الخاص · ربح الشهر */
export function Wallets({ snap, history, monthName, owner }: { snap: Snapshot; history: { label: string; profit: number }[]; monthName: string; owner: boolean }) {
  const maxP = Math.max(1, ...history.map((h) => Math.abs(h.profit)));
  return (
    <section className="fin-wallets" aria-label="الأرصدة">
      <article className="fin-wallet fin-w-sham">
        <div className="fin-w-top"><span className="fin-w-name"><Icon name="card" size={18} stroke={2} /> شام كاش</span><BoxAdjust box="1120" name="شام كاش" sham={snap.sham} shop={snap.shop} owner={owner} /></div>
        <b className="fin-w-bal num">{n(snap.sham)}<small>ل.س</small></b>
        <span className="fin-w-sub">مبيعات المتجر الإلكتروني تصل هنا</span>
      </article>
      <article className="fin-wallet fin-w-shop">
        <div className="fin-w-top"><span className="fin-w-name"><Icon name="boxes" size={18} stroke={2} /> صندوق المحل</span><BoxAdjust box="1110" name="صندوق المحل" sham={snap.sham} shop={snap.shop} owner={owner} /></div>
        <b className="fin-w-bal num">{n(snap.shop)}<small>ل.س</small></b>
        <span className="fin-w-sub">نقود الدرج في المحل</span>
      </article>
      <article className="fin-wallet fin-w-private">
        <div className="fin-w-top"><span className="fin-w-name"><Icon name="shield" size={18} stroke={2} /> المال الخاص</span><span className="fin-w-badge">{monthName}</span></div>
        <b className="fin-w-bal num">{snap.privateNet < 0 ? "−" : ""}{n(Math.abs(snap.privateNet))}<small>ل.س</small></b>
        <span className="fin-w-sub">صافي ما أخذته من المتجر هذا الشهر</span>
        <div className="fin-w-split num"><span>سحبت {n(snap.drawn)}</span><span>أضفت {n(snap.added)}</span></div>
      </article>
      <article className="fin-wallet fin-w-profit">
        <div className="fin-w-top"><span className="fin-w-name"><Icon name="star" size={18} stroke={2} /> ربح {monthName}</span></div>
        <b className={`fin-w-bal num ${snap.profit < 0 ? "neg" : ""}`}>{snap.profit < 0 ? "−" : ""}{n(Math.abs(snap.profit))}<small>ل.س</small></b>
        <div className="fin-spark" aria-label="الربح في آخر 6 أشهر">
          {history.map((h, i) => (
            <span key={i} className="fin-spark-col" title={`${h.label}: ${n(h.profit)} ل.س`}>
              <i className={h.profit < 0 ? "neg" : i === history.length - 1 ? "now" : ""} style={{ height: `${Math.max(6, (Math.abs(h.profit) / maxP) * 100)}%` }} />
              <em>{h.label.slice(0, 3)}</em>
            </span>
          ))}
        </div>
      </article>
    </section>
  );
}
