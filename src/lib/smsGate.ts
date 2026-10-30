import "server-only";

/**
 * إرسال SMS عبر sms-gate.app (هاتف أندرويد متصل بالخدمة السحابية يرسل من شريحته).
 * بيانات الدخول في متغيرات البيئة على Vercel: SMS_GATE_USER و SMS_GATE_PASS
 * (اختياري SMS_GATE_URL لخادم خاص، الافتراضي https://api.sms-gate.app/3rdparty/v1)
 */
export const smsReady = () => !!(process.env.SMS_GATE_USER && process.env.SMS_GATE_PASS);
export const SMS_NOT_READY = { ok: false, message: "خدمة SMS غير مربوطة بعد — أضف SMS_GATE_USER و SMS_GATE_PASS في إعدادات Vercel" };

export async function smsGateSend(phone: string, text: string): Promise<{ ok: boolean; message: string }> {
  const user = process.env.SMS_GATE_USER, pass = process.env.SMS_GATE_PASS;
  if (!user || !pass) return SMS_NOT_READY;
  const base = (process.env.SMS_GATE_URL || "https://api.sms-gate.app/3rdparty/v1").replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + Buffer.from(`${user}:${pass}`).toString("base64") },
      body: JSON.stringify({ textMessage: { text }, phoneNumbers: [`+${phone.replace(/^\+/, "")}`] }),
      cache: "no-store",
    });
    if (res.status === 401) return { ok: false, message: "بيانات دخول خدمة SMS غير صحيحة" };
    if (!res.ok) return { ok: false, message: `تعذّر الإرسال (${res.status}) — تأكد أن هاتف الإرسال متصل بالإنترنت` };
    return { ok: true, message: "أُرسلت الرسالة" };
  } catch {
    return { ok: false, message: "تعذّر الاتصال بخدمة SMS" };
  }
}
