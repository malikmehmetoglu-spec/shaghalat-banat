import Link from "next/link";
import { FINANCE_ROLES, requireStaff } from "@/lib/admin";
import { Icon } from "@/components/Icon";
import { monthBounds, moneySnapshot, movements } from "@/lib/money";
import { accountTotals } from "@/lib/finance";
import { MoneyActions } from "./_ui/MoneyActions";
import { Wallets } from "./_ui/Wallets";
import { MovementList } from "./_ui/MovementRow";

export const metadata = { title: "الإدارة المالية" };
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const n = (v: number) => Math.round(v).toLocaleString("en-US");

export default async function FinanceHome() {
  const { sb, profile } = await requireStaff(FINANCE_ROLES);
  const owner = profile.role === "owner";
  const mb = monthBounds();
  const [snap, recent, { data: cats }, { data: fx }, { data: due }, { count: noCost }, history] = await Promise.all([
    moneySnapshot(sb),
    movements(sb, { limit: 8 }),
    sb.from("accounts").select("code,name").eq("type", "expense").eq("is_expense_category", true).neq("code", "5200").order("code"),
    sb.from("fx_settings").select("usd_rate").eq("id", 1).maybeSingle(),
    sb.rpc("salaries_due", { p_days: 3 }),
    sb.from("products").select("id", { count: "exact", head: true }).is("archived_at", null).is("consignor_id", null).or("cost.is.null,cost.eq.0"),
    Promise.all([5, 4, 3, 2, 1, 0].map(async (k) => {
      const d = new Date(Date.UTC(Number(mb.key.slice(0, 4)), Number(mb.key.slice(5)) - 1 - k, 15)).toISOString().slice(0, 10);
      const b = monthBounds(d);
      const t = await accountTotals(sb, b.from, b.to);
      const sum = (type: string) => (t ?? []).filter((r) => r.type === type).reduce((s, r) => s + (type === "revenue" ? r.credit - r.debit : r.debit - r.credit), 0);
      return { label: MONTHS[Number(b.key.slice(5)) - 1], profit: sum("revenue") - sum("expense") };
    })),
  ]);
  if (!snap) return <div className="acard">تعذّر قراءة الحسابات</div>;
  const rate = Number(fx?.usd_rate ?? 0);
  const monthName = MONTHS[Number(mb.key.slice(5)) - 1];
  const dueList = (due ?? []) as { id: string; name: string; amount: number; currency: string; days_left: number }[];

  return (
    <div className="fin">
      <header className="fin-head">
        <div className="title-block"><h1 className="adm-h1">الإدارة المالية</h1><span className="adm-sub">كل مال المتجر في مكان واحد · {monthName}</span></div>
      </header>

      {dueList.length > 0 && (
        <Link href="/admin/finance/salaries" className="fin-alert">
          <span className="fin-alert-ic"><Icon name="clock" size={20} stroke={2} /></span>
          <span className="fin-alert-t">
            <b>{dueList.length === 1 ? `راتب ${dueList[0].name}` : `${dueList.length} رواتب`} {dueList.some((d) => d.days_left < 0) ? "متأخر" : dueList[0].days_left === 0 ? "مستحق اليوم" : `مستحق خلال ${dueList[0].days_left} ${dueList[0].days_left === 1 ? "يوم" : "أيام"}`}</b>
            <span>اضغط لدفع الرواتب</span>
          </span>
          <Icon name="forward" size={18} stroke={2.2} />
        </Link>
      )}

      <Wallets snap={snap} history={history} monthName={monthName} owner={owner} />

      <section className="fin-block">
        <h2 className="fin-h2">تسجيل حركة</h2>
        <MoneyActions sham={snap.sham} shop={snap.shop} owner={owner} rate={rate} categories={(cats ?? []) as any} />
      </section>

      <div className="fin-grid">
        <section className="fin-block fin-panel">
          <div className="row-between"><h2 className="fin-h2">آخر الحركات</h2><Link href="/admin/finance/movements" className="fin-link">كل الحركات <Icon name="forward" size={14} stroke={2.4} /></Link></div>
          <MovementList items={recent} />
        </section>
        <aside className="fin-side">
          <Link href="/admin/finance/consign" className="fin-mini">
            <span className="fin-mini-ic fin-t-move"><Icon name="boxes" size={20} stroke={2} /></span>
            <span className="fin-mini-t"><span>مستحق لتجار الأمانة</span><b className="num">{n(snap.consignDue)} ل.س</b></span>
          </Link>
          <Link href="/admin/finance/reports" className="fin-mini">
            <span className="fin-mini-ic fin-t-in"><Icon name="bag" size={20} stroke={2} /></span>
            <span className="fin-mini-t"><span>مبيعات {monthName}</span><b className="num">{n(snap.revenue)} ل.س</b></span>
          </Link>
          <Link href="/admin/finance/movements?type=expense" className="fin-mini">
            <span className="fin-mini-ic fin-t-out"><Icon name="minus" size={20} stroke={2} /></span>
            <span className="fin-mini-t"><span>مصاريف {monthName}</span><b className="num">{n(snap.expenses)} ل.س</b></span>
          </Link>
          {(noCost ?? 0) > 0 && (
            <Link href="/admin/products?nocost=1" className="fin-mini fin-mini-warn">
              <span className="fin-mini-ic fin-t-warn"><Icon name="info" size={20} stroke={2} /></span>
              <span className="fin-mini-t"><span>منتجات بلا سعر تكلفة</span><b className="num">{noCost}</b><em>ربحها يُحسب كاملاً، فيظهر الربح أكبر من الحقيقي</em></span>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
