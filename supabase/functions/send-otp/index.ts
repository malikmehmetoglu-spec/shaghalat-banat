// Supabase Auth "Send SMS Hook": يستقبل رمز التحقق من Supabase ويرسله للعميلة عبر واتساب.
// المزوّد الحالي: WhatsApp Cloud API (Meta). يمكن استبداله بأي مزوّد واتساب محلي لاحقاً.
// المتغيرات (Edge Function Secrets):
//   SEND_SMS_HOOK_SECRET   سر التوقيع من إعدادات الـ Hook (بصيغة v1,whsec_...)
//   WHATSAPP_TOKEN         رمز الوصول الدائم من Meta
//   WHATSAPP_PHONE_ID      معرّف رقم واتساب الأعمال
//   WHATSAPP_TEMPLATE      اسم قالب المصادقة المعتمد (افتراضي: otp_code)
//   WHATSAPP_LANG          لغة القالب (افتراضي: ar)
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

Deno.serve(async (req) => {
  const raw = await req.text();
  // عند تفعيل واتساب يصبح التوقيع إلزامياً حتى لا يُستخدم الرابط لإرسال رسائل من خارج Supabase
  if (Deno.env.get("WHATSAPP_TOKEN") && !Deno.env.get("SEND_SMS_HOOK_SECRET")) {
    return json({ error: { http_code: 500, message: "SEND_SMS_HOOK_SECRET غير مضبوط" } }, 500);
  }
  const secret = (Deno.env.get("SEND_SMS_HOOK_SECRET") ?? "").replace("v1,whsec_", "");
  let payload: { user: { phone: string }; sms: { otp: string } };
  try {
    payload = secret
      ? (new Webhook(secret).verify(raw, Object.fromEntries(req.headers)) as typeof payload)
      : JSON.parse(raw);
  } catch {
    return json({ error: { http_code: 401, message: "توقيع غير صالح" } }, 401);
  }

  const phone = payload.user.phone.replace(/\D/g, "");
  const otp = payload.sms.otp;
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_ID");

  // قبل ربط واتساب: لا إرسال فعلي (الدخول متاح بأرقام الاختبار المعرّفة في إعدادات Auth)
  if (!token || !phoneId) {
    console.log(`WhatsApp not configured — OTP for ${phone.slice(0, 5)}*** not sent`);
    return json({});
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: Deno.env.get("WHATSAPP_TEMPLATE") ?? "otp_code",
        language: { code: Deno.env.get("WHATSAPP_LANG") ?? "ar" },
        components: [
          { type: "body", parameters: [{ type: "text", text: otp }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: otp }] },
        ],
      },
    }),
  });
  if (!res.ok) {
    console.error("WhatsApp send failed", res.status, await res.text());
    return json({ error: { http_code: 502, message: "تعذّر إرسال رمز التحقق عبر واتساب" } }, 502);
  }
  return json({});
});

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });
