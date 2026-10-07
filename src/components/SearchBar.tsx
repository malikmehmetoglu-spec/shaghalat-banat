"use client";
import { Icon } from "./Icon";
import { useT } from "@/components/LangProvider";

/** شريط البحث — نموذج GET بسيط يفتح صفحة البحث */
export function SearchBar({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  const t = useT();
  return (
    <form action="/search" className="search" role="search">
      <label htmlFor="q" className="sr">{t("ابحثي عن منتج")}</label>
      <input id="q" name="q" defaultValue={defaultValue} autoFocus={autoFocus} placeholder={t("ابحثي عن عباية، عطر، لانجري…")} />
      <button type="submit" className="go" aria-label={t("بحث")}><Icon name="search" stroke={2} /></button>
    </form>
  );
}
