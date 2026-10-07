import { EN } from "./en";

export type Lang = "ar" | "en";
export type T = (s: string, vars?: Record<string, string | number>) => string;

/** المفاتيح هي النصوص العربية نفسها؛ إن لم توجد ترجمة يظهر النص العربي */
export function makeT(lang: Lang): T {
  return (s, vars) => {
    let out = lang === "en" ? EN[s] ?? s : s;
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
    return out;
  };
}
export const LANG_COOKIE = "sb-lang";
