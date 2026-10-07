import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReturnForm } from "./ReturnForm";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "طلب إرجاع أو استبدال" };

export default async function ReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;
  const sb = await createClient();
  const { data: o } = await sb.from("orders").select("id,number,status,order_items(id,product_name,variant_label,qty)").eq("id", id).maybeSingle();
  if (!o) notFound();
  const { data: existing } = await sb.from("return_requests").select("number,status").eq("order_id", id).limit(1).maybeSingle();
  return <ReturnForm orderId={o.id} number={o.number} delivered={o.status === "delivered"} items={(o.order_items ?? []) as any} existing={existing} />;
}
