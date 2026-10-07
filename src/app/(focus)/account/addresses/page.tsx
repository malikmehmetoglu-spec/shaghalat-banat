import { createClient } from "@/lib/supabase/server";
import { AddressesManager } from "./AddressesManager";

export const metadata = { title: "عناويني" };

export default async function AddressesPage() {
  const sb = await createClient();
  const { data: u } = await sb.auth.getUser();
  const { data } = await sb.from("addresses").select("id,label,city,street,recipient_phone,is_default").eq("user_id", u.user!.id).order("created_at");
  return <AddressesManager initial={data ?? []} />;
}
