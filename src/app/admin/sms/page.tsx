import { requireStaff } from "@/lib/admin";
import { SectionTabs } from "../SectionTabs";
import { MKT_TABS } from "@/lib/marketingNav";
import { BulkSms, type Cust, type Camp } from "./BulkSms";

export const metadata = { title: "رسالة جماعية SMS" };
export const dynamic = "force-dynamic";

export default async function SmsPage() {
  const { sb } = await requireStaff("/admin/sms");
  const [{ data }, { count: noConsent }, { data: camps }] = await Promise.all([
    sb.from("customer_stats").select("phone,name,first_source,created_at,orders_count,spent,last_order,bought_store,bought_online").eq("marketing_opt_in", true).limit(5000),
    sb.from("customers").select("phone", { count: "exact", head: true }).eq("marketing_opt_in", false),
    sb.from("sms_campaigns").select("id,body,filters,recipients,sent,failed,created_at,by:profiles!sms_campaigns_created_by_fkey(full_name)").order("created_at", { ascending: false }).limit(15),
  ]);
  const rows: Cust[] = (data ?? []).map((c: any) => ({
    phone: c.phone, name: c.name, created: c.created_at, n: Number(c.orders_count), spent: Number(c.spent), last: c.last_order,
    store: !!c.bought_store, online: !!c.bought_online,
  }));
  const history: Camp[] = (camps ?? []).map((c: any) => ({ id: c.id, body: c.body, filters: c.filters, recipients: c.recipients, sent: c.sent, failed: c.failed, at: c.created_at, by: c.by?.full_name ?? "" }));
  return (
    <>
      <SectionTabs tabs={MKT_TABS} label="إدارة التسويق" />
      <BulkSms rows={rows} noConsent={noConsent ?? 0} history={history} ready={!!(process.env.SMS_GATE_USER && process.env.SMS_GATE_PASS)} />
    </>
  );
}
