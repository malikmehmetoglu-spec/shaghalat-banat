import { cookies } from "next/headers";
import { LANG_COOKIE, makeT, type Lang } from "./core";

export async function getLang(): Promise<Lang> {
  return (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "ar";
}
export async function getT() {
  return makeT(await getLang());
}
