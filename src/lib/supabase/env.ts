export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // تنبيه واضح أثناء التطوير بدل أخطاء غامضة
  console.warn("⚠️ متغيرات Supabase غير مضبوطة. انسخي .env.example إلى .env.local");
}
