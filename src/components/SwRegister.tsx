"use client";
import { useEffect } from "react";

/** تسجيل الـ Service Worker ليصبح الموقع قابلاً للتثبيت كتطبيق (PWA). */
export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
