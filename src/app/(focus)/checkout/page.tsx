import { createClient } from "@/lib/supabase/server";
import { CheckoutFlow } from "./CheckoutFlow";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "إتمام الطلب" };

export default async function CheckoutPage() {
  const t = await getT();
  const sb = await createClient();
  const { data: u } = await sb.auth.getUser();
  const uid = u.user?.id;
  const [{ data: addresses }, { data: shipping }] = await Promise.all([
    uid ? sb.from("addresses").select("id,label,city,street,recipient_phone,is_default").eq("user_id", uid).order("is_default", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
    sb.from("shipping_methods").select("code,name,description,price").eq("is_active", true).order("sort_order"),
  ]);
  return <CheckoutFlow addresses={addresses ?? []} shipping={shipping ?? []} guest={!uid} />;
}
