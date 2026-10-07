import { LoginFlow } from "./LoginFlow";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "تسجيل الدخول" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const t = await getT();
  const { next = "/", error } = await searchParams;
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return <LoginFlow next={safeNext} initialError={error ? t("انتهت صلاحية الرابط أو أنه غير صالح، اطلبي رابطاً جديداً") : ""} />;
}
