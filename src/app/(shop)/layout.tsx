import { BottomNav } from "@/components/BottomNav";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <SiteHeader />
      {children}
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
