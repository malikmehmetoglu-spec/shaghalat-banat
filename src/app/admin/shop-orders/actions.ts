"use server";
import { requireStaff } from "@/lib/admin";
import { intlPhone, smsText, type Stage } from "@/lib/orderMessages";
import { smsGateSend, smsReady, SMS_NOT_READY } from "@/lib/smsGate";

type Result = { ok: boolean; message: string };

/**
 * إرسال SMS عبر sms-gate.app (هاتف أندرويد متصل بالخدمة السحابية يرسل من شريحته).
 * بيانات الدخول في متغيرات البيئة على Vercel: SMS_GATE_USER و SMS_GATE_PASS
 * (اختياري SMS_GATE_URL لخادم خاص، الافتراضي https://api.sms-gate.app/3rdparty/v1)
 */
export async function sendOrderSms(orderId: string, stage: Stage): Promise<Result> {
  const { sb } = await requireStaff("/admin/shop-orders");
  if (!smsReady()) return SMS_NOT_READY;

  const { data: o } = await sb.from("orders")
    .select("number,total,payment_method,customer_phone,address_snapshot,user:profiles!orders_user_id_fkey(full_name,phone)")
    .eq("id", orderId).maybeSingle();
  if (!o) return { ok: false, message: "الطلب غير موجود" };
  const a = (o.address_snapshot ?? {}) as { recipient_phone?: string; phone?: string };
  const u = (o as any).user as { phone?: string } | null;
  const phone = intlPhone(a.recipient_phone || o.customer_phone || a.phone || u?.phone);
  if (!phone) return { ok: false, message: "لا يوجد رقم هاتف صحيح لهذه العميلة" };

  return smsGateSend(phone, smsText(stage, { number: o.number, total: Number(o.total), payment: o.payment_method }));
}

/** رسالة SMS حرّة لعميلة من قائمة العملاء */
export async function sendCustomerSms(rawPhone: string, text: string): Promise<Result> {
  const { sb } = await requireStaff("/admin/customers");
  if (!smsReady()) return SMS_NOT_READY;
  const msg = (text ?? "").trim();
  if (!msg) return { ok: false, message: "اكتب نص الرسالة" };
  if (msg.length > 600) return { ok: false, message: "الرسالة طويلة جداً (600 حرف كحد أقصى)" };
  const { data: c } = await sb.from("customers").select("phone").eq("phone", rawPhone).maybeSingle();
  if (!c) return { ok: false, message: "العميلة غير موجودة" };
  const phone = intlPhone(c.phone);
  if (!phone) return { ok: false, message: "رقم الهاتف غير صحيح" };
  return smsGateSend(phone, msg);
}
