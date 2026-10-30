import Link from "next/link";
import { Icon } from "@/components/Icon";

/** تبديل بين «البيع» و«المرتجعات» في رأس نقطة البيع — للمدير والموظفات */
export function PosTabs({ active }: { active: "sale" | "returns" }) {
  return (
    <nav className="pos-tabs" aria-label="نقطة البيع">
      <Link href="/admin/pos" className={`pos-tab${active === "sale" ? " on" : ""}`} aria-current={active === "sale" ? "page" : undefined}><Icon name="cart" size={18} stroke={2} />البيع</Link>
      <Link href="/admin/pos?tab=returns" className={`pos-tab${active === "returns" ? " on" : ""}`} aria-current={active === "returns" ? "page" : undefined}><Icon name="return" size={18} stroke={2} />المرتجعات</Link>
    </nav>
  );
}
