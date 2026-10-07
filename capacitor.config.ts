import type { CapacitorConfig } from "@capacitor/cli";

/**
 * تطبيق Android/iOS يغلّف الموقع المنشور (نفس الكود، تحديث فوري بدون إعادة نشر في المتاجر).
 * غيّري CAP_SERVER_URL إلى رابط موقعك النهائي قبل البناء.
 */
const config: CapacitorConfig = {
  appId: "com.shaghalatbanat.app",
  appName: "شغلات بنات",
  webDir: "cap-shell",
  server: {
    url: process.env.CAP_SERVER_URL || "https://shaghalat-banat.vercel.app",
    cleartext: false,
  },
  backgroundColor: "#FBE6E7",
  plugins: {
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
