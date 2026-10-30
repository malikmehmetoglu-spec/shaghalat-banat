import { FINANCE_ROLES, requireStaff } from "@/lib/admin";
import { monthBounds, moneySnapshot } from "@/lib/money";
import { SalariesView, type Salary } from "./SalariesView";

export const metadata = { title: "الرواتب" };

export default async function SalariesPage() {
  const { sb } = await requireStaff(FINANCE_ROLES);
  const mb = monthBounds();
  const [{ data: rows }, { data: pays }, snap, { data: fx }] = await Promise.all([
    sb.from("staff_salaries").select("id,name,amount,currency,pay_day,is_active").order("is_active", { ascending: false }).order("pay_day"),
    sb.from("salary_payments").select("salary_id,period,amount,paid_from,paid_at").order("paid_at", { ascending: false }).limit(200),
    moneySnapshot(sb),
    sb.from("fx_settings").select("usd_rate").eq("id", 1).maybeSingle(),
  ]);
  const today = Number(new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(8, 10));
  const salaries: Salary[] = (rows ?? []).map((s: any) => {
    const paid = (pays ?? []).find((p: any) => p.salary_id === s.id && p.period === mb.key);
    return { id: s.id, name: s.name, amount: Number(s.amount), currency: s.currency, payDay: s.pay_day, active: s.is_active,
      paidThisMonth: paid ? { amount: Number(paid.amount), at: paid.paid_at, from: paid.paid_from } : null,
      daysLeft: s.pay_day - today,
      history: (pays ?? []).filter((p: any) => p.salary_id === s.id).slice(0, 6).map((p: any) => ({ period: p.period, amount: Number(p.amount), from: p.paid_from })) };
  });
  return <SalariesView salaries={salaries} period={mb.key} sham={snap?.sham ?? 0} shop={snap?.shop ?? 0} rate={Number(fx?.usd_rate ?? 0)} />;
}
