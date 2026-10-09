import { requireStaff } from "@/lib/admin";

/** بطاقة اتصال تُعرض مباشرة (inline) — على آيفون تفتح شاشة «إنشاء جهة اتصال جديدة» */
export async function GET(req: Request) {
  await requireStaff();
  const u = new URL(req.url);
  const phone = (u.searchParams.get("phone") || "").replace(/\D/g, "");
  const name = (u.searchParams.get("name") || "عميلة شغلات بنات").replace(/[\r\n;]/g, " ");
  const vcf = ["BEGIN:VCARD", "VERSION:3.0", `FN:${name}`, `N:;${name};;;`, `TEL;TYPE=CELL:+${phone}`, "ORG:شغلات بنات", "END:VCARD", ""].join("\r\n");
  return new Response(vcf, { headers: { "Content-Type": "text/vcard; charset=utf-8", "Content-Disposition": "inline", "Cache-Control": "no-store" } });
}
