/**
 * رسائل الطلبات الجاهزة لكل مرحلة — واتساب (مفصّلة) و SMS (قصيرة).
 *
 * قواعد رسائل SMS لتمرّ من فلاتر MTN و Syriatel وتُقرأ صحيحة من اليمين لليسار:
 * - 70 حرفاً أو أقل: الرسالة العربية (ترميز UCS-2) تبقى رسالة واحدة لا تُقسَّم.
 * - بلا روابط وبلا كلمات ترويجية (خصم، عرض، مجاني، ربح...) — أكثر ما تحجبه الفلاتر.
 * - تبدأ بكلمة عربية ورقم الطلب أرقام فقط (بدون SB-) حتى لا ينقلب اتجاه السطر.
 */
export type Stage = "new" | "preparing" | "shipped" | "delivered";
export type MsgOrder = { number: string; total: number; name?: string | null; payment?: string | null };

const STORE = "شغلات بنات";
/** رقم الطلب بالأرقام فقط: SB-20031 ← 20031 */
export const orderNo = (n: string) => n.replace(/\D/g, "");
const amount = (v: number) => `${Math.round(Number(v) || 0).toLocaleString("en-US")} ل.س`;
const hello = (name?: string | null) => (name?.trim() ? `أهلاً ${name.trim().split(/\s+/)[0]}` : "أهلاً بكِ");

export function smsText(stage: Stage, o: MsgOrder): string {
  const n = orderNo(o.number);
  switch (stage) {
    case "new": return o.payment === "support"
      ? `${STORE}: استلمنا طلبك رقم ${n} وسنتواصل معك لإتمام الدفع`
      : `${STORE}: استلمنا طلبك رقم ${n} بانتظار تأكيد التحويل`;
    case "preparing": return `${STORE}: تم تأكيد الدفع وطلبك رقم ${n} قيد التجهيز`;
    case "shipped": return `${STORE}: طلبك رقم ${n} مع شركة الشحن وسيصلك قريباً`;
    case "delivered": return `${STORE}: تم تسليم طلبك رقم ${n}، شكراً لثقتك بنا`;
  }
}

/** تعريف الموظفة: «معك ريم من خدمة العملاء في متجر شغلات بنات» */
const intro = (agent?: string | null) => {
  const first = agent?.trim().split(/\s+/)[0];
  return first ? `معك ${first} من خدمة العملاء في متجر ${STORE}.` : `معك خدمة العملاء في متجر ${STORE}.`;
};

export const trackUrl = (token: string) => `https://www.shaghalat-banat.com/t/${token}`;

export function whatsappText(stage: Stage, o: MsgOrder & { token?: string }, agent?: string | null): string {
  const body = whatsappBody(stage, o, agent);
  return o.token && stage !== "delivered" ? `${body}\n\nتابعي طلبك من هنا:\n${trackUrl(o.token)}` : body;
}
function whatsappBody(stage: Stage, o: MsgOrder, agent?: string | null): string {
  const n = orderNo(o.number);
  const head = `${hello(o.name)} 🌸\n${intro(agent)}\n`;
  switch (stage) {
    case "new": return o.payment === "support"
      ? `${head}استلمنا طلبك رقم ${n} بقيمة ${amount(o.total)}.\nسأرشدك الآن لطريقة الدفع عبر شام كاش لنؤكد طلبك ونبدأ تجهيزه.`
      : `${head}استلمنا طلبك رقم ${n} بقيمة ${amount(o.total)}.\nبانتظار إشعار التحويل عبر شام كاش لتأكيد الطلب، وإن احتجتِ أي مساعدة أنا هنا.`;
    case "preparing": return `${head}تم تأكيد الدفع لطلبك رقم ${n} ✅\nطلبك الآن قيد التجهيز، وسأخبرك فور تسليمه لشركة الشحن.`;
    case "shipped": return `${head}طلبك رقم ${n} أصبح مع شركة الشحن وفي طريقه إليكِ 🚚\nسيتواصل معك المندوب عند الوصول.`;
    case "delivered": return `${head}تم تسليم طلبك رقم ${n} 💗\nشكراً لثقتك بنا، نتمنى أن تنال القطع إعجابك ويسعدنا سماع رأيك.`;
  }
}

/** رقم سوري بصيغة دولية: 0933... أو 933... أو 00963... ← 963933... (بدون +) */
export function intlPhone(raw?: string | null): string | null {
  let d = (raw ?? "").replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "963" + d.slice(1);
  else if (d.length === 9 && d.startsWith("9")) d = "963" + d;
  return d.length >= 11 ? d : null;
}
export const waLink = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
