import { BottomNav } from "@/components/BottomNav";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      {children}
      <BottomNav />
    </div>
  );
}
