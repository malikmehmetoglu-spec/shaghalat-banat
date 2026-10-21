import { ScrollTop } from "@/components/ScrollTop";
import { NotifyPrompt } from "@/components/NotifyPrompt";
import { InstallPrompt } from "@/components/InstallPrompt";
import { BottomNav } from "@/components/BottomNav";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <ScrollTop />
      <SiteHeader />
      {children}
      <SiteFooter />
      <InstallPrompt />
      <NotifyPrompt />
      <BottomNav />
    </div>
  );
}
