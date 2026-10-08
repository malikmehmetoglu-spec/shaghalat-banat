import type { Metadata, Viewport } from "next";
import "@fontsource/rubik/arabic-400.css";
import "@fontsource/rubik/arabic-500.css";
import "@fontsource/rubik/arabic-600.css";
import "@fontsource/rubik/arabic-700.css";
import "@fontsource/rubik/arabic-800.css";
import "@fontsource/rubik/latin-400.css";
import "@fontsource/rubik/latin-500.css";
import "@fontsource/rubik/latin-600.css";
import "@fontsource/rubik/latin-700.css";
import "@fontsource/rubik/latin-800.css";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { SwRegister } from "@/components/SwRegister";
import { LangProvider } from "@/components/LangProvider";
import { getLang } from "@/lib/i18n/server";

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} dir={lang === "en" ? "ltr" : "rtl"}>

      <body>
        <LangProvider lang={lang}>
          <CartProvider>
            {children}
          </CartProvider>
        </LangProvider>
        <SwRegister />
      </body>
    </html>
  );
}
