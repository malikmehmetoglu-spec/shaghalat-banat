import { ScrollTop } from "@/components/ScrollTop";
import { NotifyPrompt } from "@/components/NotifyPrompt";
import { InstallPrompt } from "@/components/InstallPrompt";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <ScrollTop />
      <SiteHeader />
      {children}
      <SiteFooter />
      <InstallPrompt />
      <NotifyPrompt />
    </div>
  );
}
