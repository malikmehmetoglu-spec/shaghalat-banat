"use server";
import { requireStaff } from "@/lib/admin";
import { rolesFor } from "@/lib/access";
import { intlPhone, smsText, type Stage } from "@/lib/orderMessages";

type Result = { ok: boolean; message: string };

/**
 * إرسال SMS عبر sms-gate.app (هاتف أندرويد متصل بالخدمة السحابية يرسل من شريحته).
 * بيانات الدخول في متغيرات البيئة على Vercel: SMS_GATE_USER و SMS_GATE_PASS
 * (اختياري SMS_GATE_URL لخادم خاص، الافتراضي https://api.sms-gate.app/3rdparty/v1)
 */
export async function sendOrderSms(orderId: string, stage: Stage): Promise<Result> {
  const { sb } = await requireStaff(rolesFor("/admin/shop-orders"));
  const user = process.env.SMS_GATE_USER, pass = process.env.SMS_GATE_PASS;
  if (!user || !pass) return { ok: false, message: "خدمة SMS غير مربوطة بعد — أضف SMS_GATE_USER و SMS_GATE_PASS في إعدادات Vercel" };

  const { data: o } = await sb.from("orders")
    .select("number,total,payment_method,customer_phone,address_snapshot,user:profiles!orders_user_id_fkey(full_name,phone)")
    .eq("id", orderId).maybeSingle();
  if (!o) return { ok: false, message: "الطلب غير موجود" };
  const a = (o.address_snapshot ?? {}) as { recipient_phone?: string; phone?: string };
  const u = (o as any).user as { phone?: string } | null;
  const phone = intlPhone(a.recipient_phone || o.customer_phone || a.phone || u?.phone);
  if (!phone) return { ok: false, message: "لا يوجد رقم هاتف صحيح لهذه العميلة" };

  const base = (process.env.SMS_GATE_URL || "https://api.sms-gate.app/3rdparty/v1").replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + Buffer.from(`${user}:${pass}`).toString("base64") },
      body: JSON.stringify({ textMessage: { text: smsText(stage, { number: o.number, total: Number(o.total), payment: o.payment_method }) }, phoneNumbers: [`+${phone}`] }),
      cache: "no-store",
    });
    if (res.status === 401) return { ok: false, message: "بيانات دخول خدمة SMS غير صحيحة" };
    if (!res.ok) return { ok: false, message: `تعذّر الإرسال (${res.status}) — تأكد أن هاتف الإرسال متصل بالإنترنت` };
    return { ok: true, message: "أُرسلت الرسالة" };
  } catch {
    return { ok: false, message: "تعذّر الاتصال بخدمة SMS" };
  }
}
