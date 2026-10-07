import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { SwRegister } from "@/components/SwRegister";

export const metadata: Metadata = {
  title: { default: "شغلات بنات", template: "%s · شغلات بنات" },
  description: "كل ما تحبّه البنات في مكان واحد: لانجري، عبايات، عطور، بيجامات وإكسسوارات.",
  applicationName: "شغلات بنات",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/logo-mark.svg", apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "شغلات بنات", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#D6037F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <CartProvider>
          <div className="app">{children}</div>
        </CartProvider>
        <SwRegister />
      </body>
    </html>
  );
}
