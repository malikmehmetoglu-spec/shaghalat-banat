import { LoginFlow } from "./LoginFlow";

export const metadata = { title: "تسجيل الدخول" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/", error } = await searchParams;
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return <LoginFlow next={safeNext} initialError={error ? "انتهت صلاحية الرابط أو أنه غير صالح، اطلبي رابطاً جديداً" : ""} />;
}
