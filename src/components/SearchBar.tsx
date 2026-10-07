import { Icon } from "./Icon";

/** شريط البحث — نموذج GET بسيط يفتح صفحة البحث */
export function SearchBar({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <form action="/search" className="search" role="search">
      <label htmlFor="q" className="sr">ابحثي عن منتج</label>
      <input id="q" name="q" defaultValue={defaultValue} autoFocus={autoFocus} placeholder="ابحثي عن عباية، عطر، لانجري…" />
      <button type="submit" className="go" aria-label="بحث"><Icon name="search" stroke={2} /></button>
    </form>
  );
}
