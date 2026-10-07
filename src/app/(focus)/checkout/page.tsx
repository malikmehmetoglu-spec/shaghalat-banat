import { createClient } from "@/lib/supabase/server";
import { CheckoutFlow } from "./CheckoutFlow";

export const metadata = { title: "إتمام الطلب" };

export default async function CheckoutPage() {
  const sb = await createClient();
  const { data: u } = await sb.auth.getUser();
  const [{ data: addresses }, { data: shipping }] = await Promise.all([
    sb.from("addresses").select("id,label,city,street,recipient_phone,is_default").eq("user_id", u.user!.id).order("is_default", { ascending: false }),
    sb.from("shipping_methods").select("code,name,description,price").eq("is_active", true).order("sort_order"),
  ]);
  return <CheckoutFlow addresses={addresses ?? []} shipping={shipping ?? []} />;
}
