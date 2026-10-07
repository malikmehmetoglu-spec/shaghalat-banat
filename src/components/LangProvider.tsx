"use client";
import { createContext, useContext, useMemo } from "react";
import { LANG_COOKIE, makeT, type Lang, type T } from "@/lib/i18n/core";

const Ctx = createContext<{ lang: Lang; t: T }>({ lang: "ar", t: makeT("ar") });

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, t: makeT(lang) }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useT = () => useContext(Ctx).t;
export const useLang = () => useContext(Ctx).lang;
export function setLang(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  location.reload();
}
