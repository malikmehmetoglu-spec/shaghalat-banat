import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
