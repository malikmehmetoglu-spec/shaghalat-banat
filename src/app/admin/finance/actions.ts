"use server";
import { price } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { errMsg, FINANCE_ROLES, requireStaff } from "@/lib/admin";
import type { ActionResult } from "../actions";

const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const fin = () => requireStaff(FINANCE_ROLES);
const touch = () => revalidatePath("/admin/finance", "layout");

export async function recordExpense(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb } = await fin();
  const desc = str(fd, "description");
  if (!desc) return fail("اكتبي بيان المصروف");
  let receipt: string | null = null;
  const file = fd.get("receipt");
  if (file instanceof File && file.size > 0) {
    const ext = (file.name.match(/\.[a-z0-9]{2,5}$/i)?.[0] ?? "").toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const up = await sb.storage.from("receipts").upload(path, file);
    if (up.error) return fail("تعذّر رفع صورة الإيصال — لم يُحفظ المصروف، حاولي مجدداً أو احفظيه بدون إيصال");
    receipt = path;
  }
  const { error } = await sb.rpc("record_expense", {
    p_date: str(fd, "date") || null, p_category: str(fd, "category"), p_description: desc,
    p_amount: Number(str(fd, "amount")), p_paid_from: str(fd, "paid_from"), p_recurring: fd.get("recurring") === "on", p_receipt: receipt,
  });
  if (error) return fail(errMsg(error));
  touch();
  return ok("تم حفظ المصروف");
}

export async function cashMove(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb } = await fin();
  const { error } = await sb.rpc("cash_move", { p_kind: str(fd, "kind"), p_amount: Number(str(fd, "amount")), p_from: str(fd, "from") || null, p_to: str(fd, "to") || null, p_note: str(fd, "note") });
  if (error) return fail(errMsg(error));
  touch();
  return ok("تم تسجيل الحركة");
}

export async function ownerDraw(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb, profile } = await fin();
  if (profile.role !== "owner") return fail("السحب إلى الخزنة الشخصية مخصّص لصاحب المتجر فقط");
  const amount = Number(str(fd, "amount"));
  if (!(amount > 0)) return fail("أدخل مبلغاً أكبر من صفر");
  const { error } = await sb.rpc("cash_move", { p_kind: "withdraw", p_amount: amount, p_from: str(fd, "from"), p_to: null, p_note: str(fd, "note") });
  if (error) return fail(errMsg(error));
  touch();
  return ok(`تم سحب ${price(amount)} إلى خزنتك`);
}

/** التراجع عن فاتورة مبيعات: القطع تعود للمخزون، والفاتورة تبقى في السجل بحالة مسترجعة/ملغاة */
export async function reverseInvoice(orderId: string, reason: string): Promise<ActionResult> {
  const { sb } = await fin();
  const { data, error } = await sb.rpc("reverse_invoice", { p_order: orderId, p_reason: reason || null });
  if (error) return fail(errMsg(error));
  touch();
  for (const p of ["/admin", "/admin/orders", "/admin/shop-orders", "/admin/products", "/admin/pos", "/admin/customers"]) revalidatePath(p);
  revalidatePath("/admin/inventory", "layout");
  return ok(`تم التراجع عن الفاتورة #${data}`);
}

export async function recordPayment(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb } = await fin();
  const { error } = await sb.rpc("record_payment", { p_party_type: str(fd, "party_type"), p_party_id: str(fd, "party_id") || "courier", p_amount: Number(str(fd, "amount")), p_account: str(fd, "account"), p_note: str(fd, "note") });
  if (error) return fail(errMsg(error));
  touch();
  return ok("تم تسجيل الدفعة");
}

export async function postManualEntry(date: string, memo: string, lines: { account: string; debit: number; credit: number }[]): Promise<ActionResult> {
  const { sb } = await fin();
  const { error } = await sb.rpc("post_manual_entry", { p_date: date || null, p_memo: memo, p_lines: lines.filter((l) => l.account && (l.debit > 0 || l.credit > 0)) });
  if (error) return fail(errMsg(error));
  touch();
  return ok("تم حفظ القيد");
}

export async function addAccount(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb } = await fin();
  const code = str(fd, "code"), name = str(fd, "name"), type = str(fd, "type");
  if (!/^\d{3,6}$/.test(code)) return fail("رقم الحساب أرقام فقط (3 إلى 6 خانات)");
  if (!name) return fail("اسم الحساب مطلوب");
  const { error } = await sb.from("accounts").insert({ code, name, type, is_cash: fd.get("is_cash") === "on", is_expense_category: type === "expense" });
  if (error) return fail(error.code === "23505" ? "رقم الحساب مستخدم" : errMsg(error));
  touch();
  return ok("تمت إضافة الحساب");
}

export async function openShift(opening: number): Promise<ActionResult> {
  const { sb } = await requireStaff();
  const { error } = await sb.rpc("open_shift", { p_opening: opening });
  if (error) return fail(errMsg(error));
  touch();
  return ok("تم فتح الوردية");
}

export async function closeShift(counted: number, note: string): Promise<ActionResult & { diff?: number }> {
  const { sb } = await requireStaff();
  const { data, error } = await sb.rpc("close_shift", { p_counted: counted, p_note: note });
  if (error) return fail(errMsg(error));
  touch();
  const d = Number(data);
  return { ...ok(d === 0 ? "تم إغلاق الوردية — الصندوق مطابق" : d > 0 ? `تم الإغلاق — فائض ${price(d)}` : `تم الإغلاق — عجز ${price(-d)}`), diff: d };
}

export async function saveSettings(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb } = await fin();
  const { error } = await sb.from("finance_settings").update({
    currency: str(fd, "currency") || "SYP",
    fiscal_start_month: Number(str(fd, "fiscal_start_month") || 1),
    inventory_method: str(fd, "inventory_method") || "avg",
    close_period: str(fd, "close_period") || "monthly",
    tax_rate: Number(str(fd, "tax_rate") || 0),
    tax_number: str(fd, "tax_number") || null,
    prices_include_tax: str(fd, "prices_include_tax") !== "exclusive",
    store_address: str(fd, "store_address") || null,
    store_phone: str(fd, "store_phone") || null,
    invoice_footer: str(fd, "invoice_footer") || null,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) return fail(errMsg(error));
  touch();
  return ok("تم حفظ الإعدادات");
}

/** تصنيف مصاريف جديد بالاسم فقط (الرقم الداخلي يُولَّد تلقائياً) */
export async function addExpenseCategory(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb } = await fin();
  const name = str(fd, "name");
  if (!name) return fail("اكتب اسم التصنيف");
  const { data } = await sb.from("accounts").select("code").like("code", "5%");
  const used = new Set((data ?? []).map((r) => r.code));
  let code = 5210;
  while (used.has(String(code))) code += 10;
  const { error } = await sb.from("accounts").insert({ code: String(code), name, type: "expense", is_expense_category: true });
  if (error) return fail(errMsg(error));
  touch();
  return ok(`تمت إضافة تصنيف «${name}»`);
}

// ═════════ المالية المبسّطة ═════════
type MoneyKind = "expense" | "draw" | "add" | "transfer" | "adjust";
const PLACES = ["1110", "1120", "3100"];
const BOXES = ["1110", "1120"];
const fmtN = (v: number) => Math.round(v).toLocaleString("en-US");

/** تحويل المبلغ لليرة: إن أُدخل بالدولار يُضرب بسعر الصرف الحالي ويُذكر ذلك في البيان */
async function toSyp(sb: Awaited<ReturnType<typeof fin>>["sb"], amount: number, currency: string): Promise<{ syp: number; note: string } | { error: string }> {
  if (!(amount > 0)) return { error: "اكتب مبلغاً أكبر من صفر" };
  if (currency !== "USD") return { syp: Math.round(amount), note: "" };
  const { data } = await sb.from("fx_settings").select("usd_rate").eq("id", 1).maybeSingle();
  const rate = Number(data?.usd_rate ?? 0);
  if (!(rate > 0)) return { error: "سعر الدولار غير محدد — حدّده من تبويب الإعدادات" };
  return { syp: Math.round(amount * rate), note: ` (${amount}$ × ${fmtN(rate)})` };
}

/** زر واحد لكل حركات المال اليدوية */
export async function moneyAction(input: { kind: MoneyKind; amount: number; currency?: string; from?: string; to?: string; category?: string; note?: string; date?: string }): Promise<ActionResult> {
  const { sb, profile } = await fin();
  const owner = profile.role === "owner";
  const note = (input.note ?? "").trim().slice(0, 200);

  if (input.kind === "adjust") {
    if (!owner) return fail("ضبط الرصيد متاح لصاحب المتجر فقط");
    if (!BOXES.includes(input.to ?? "")) return fail("اختر الصندوق");
    const { data, error } = await sb.rpc("box_adjust", { p_box: input.to, p_actual: Math.round(Number(input.amount) || 0), p_note: note || null });
    if (error) return fail(errMsg(error));
    touch();
    const d = Number(data);
    return ok(d === 0 ? "الرصيد مطابق، لا حاجة للضبط" : `تم ضبط الرصيد (${d > 0 ? "+" : "−"}${fmtN(Math.abs(d))} ل.س)`);
  }

  const conv = await toSyp(sb, Number(input.amount), input.currency ?? "SYP");
  if ("error" in conv) return fail(conv.error);
  const amt = conv.syp;
  let error: any = null;
  switch (input.kind) {
    case "expense": {
      if (!PLACES.includes(input.from ?? "")) return fail("اختر من أين دُفع المصروف");
      if (!input.category) return fail("اختر نوع المصروف");
      const r = await sb.rpc("record_expense", { p_date: input.date || null, p_category: input.category, p_description: (note || "مصروف") + conv.note, p_amount: amt, p_paid_from: input.from, p_recurring: false, p_receipt: null });
      error = r.error; break;
    }
    case "draw": {
      if (!owner) return fail("السحب إلى المال الخاص متاح لصاحب المتجر فقط");
      if (!BOXES.includes(input.from ?? "")) return fail("اختر الصندوق الذي تسحب منه");
      const r = await sb.rpc("cash_move", { p_kind: "withdraw", p_amount: amt, p_from: input.from, p_to: null, p_note: (note || "سحب إلى المال الخاص") + conv.note });
      error = r.error; break;
    }
    case "add": {
      if (!BOXES.includes(input.to ?? "")) return fail("اختر الصندوق الذي تضيف إليه");
      const r = await sb.rpc("cash_move", { p_kind: "deposit", p_amount: amt, p_from: null, p_to: input.to, p_note: (note || "إضافة من المال الخاص") + conv.note });
      error = r.error; break;
    }
    case "transfer": {
      if (!BOXES.includes(input.from ?? "") || !BOXES.includes(input.to ?? "") || input.from === input.to) return fail("اختر صندوقين مختلفين");
      const r = await sb.rpc("cash_move", { p_kind: "transfer", p_amount: amt, p_from: input.from, p_to: input.to, p_note: (note || "نقل بين الصندوقين") + conv.note });
      error = r.error; break;
    }
  }
  if (error) return fail(errMsg(error));
  touch();
  return ok(`تم التسجيل · ${fmtN(amt)} ل.س`);
}

// ── الرواتب ──
export async function saveSalary(input: { id?: string; name: string; amount: number; currency: string; payDay: number; active?: boolean }): Promise<ActionResult> {
  const { sb } = await fin();
  const name = input.name.trim();
  if (!name) return fail("اكتب اسم الموظفة");
  if (!(input.amount > 0)) return fail("اكتب مبلغ الراتب");
  const day = Math.floor(input.payDay);
  if (!(day >= 1 && day <= 28)) return fail("يوم الدفع بين 1 و 28");
  const row = { name, amount: input.amount, currency: input.currency === "USD" ? "USD" : "SYP", pay_day: day, is_active: input.active ?? true };
  const { error } = input.id ? await sb.from("staff_salaries").update(row).eq("id", input.id) : await sb.from("staff_salaries").insert(row);
  if (error) return fail(errMsg(error));
  touch();
  return ok(input.id ? "تم حفظ التعديل" : "تمت إضافة الموظفة");
}

export async function paySalary(input: { id: string; period: string; from: string; amount?: number; note?: string }): Promise<ActionResult> {
  const { sb } = await fin();
  const { data: s } = await sb.from("staff_salaries").select("amount,currency,name").eq("id", input.id).maybeSingle();
  if (!s) return fail("الموظفة غير موجودة");
  const conv = await toSyp(sb, Number(input.amount ?? s.amount), s.currency);
  if ("error" in conv) return fail(conv.error);
  const { error } = await sb.rpc("pay_salary", { p_salary: input.id, p_period: input.period, p_amount: conv.syp, p_paid_from: input.from, p_note: ((input.note ?? "").trim() + conv.note).trim() || null });
  if (error) return fail(errMsg(error));
  touch();
  return ok(`تم دفع راتب ${s.name} · ${fmtN(conv.syp)} ل.س`);
}

// ── تجار الأمانة ──
export async function saveConsignor(input: { id?: string; name: string; phone?: string; mode: string; pct: number; note?: string; active?: boolean }): Promise<ActionResult> {
  const { sb } = await fin();
  const name = input.name.trim();
  if (!name) return fail("اكتب اسم التاجر");
  const mode = input.mode === "net" ? "net" : "percent";
  const pct = Number(input.pct);
  if (mode === "percent" && !(pct >= 0 && pct <= 100)) return fail("نسبة المتجر بين 0 و 100");
  const row = { name, phone: input.phone?.trim() || null, mode, commission_pct: mode === "percent" ? pct : 0, note: input.note?.trim() || null, is_active: input.active ?? true };
  const { error } = input.id ? await sb.from("consignors").update(row).eq("id", input.id) : await sb.from("consignors").insert(row);
  if (error) return fail(errMsg(error));
  touch(); revalidatePath("/admin/products", "layout");
  return ok(input.id ? "تم حفظ التعديل" : "تمت إضافة التاجر");
}

export async function payConsignor(input: { id: string; amount: number; currency?: string; from: string; note?: string }): Promise<ActionResult> {
  const { sb } = await fin();
  const conv = await toSyp(sb, Number(input.amount), input.currency ?? "SYP");
  if ("error" in conv) return fail(conv.error);
  const { error } = await sb.rpc("consignor_payout", { p_consignor: input.id, p_amount: conv.syp, p_paid_from: input.from, p_note: ((input.note ?? "").trim() + conv.note).trim() || null });
  if (error) return fail(errMsg(error));
  touch();
  return ok(`تم تسجيل الدفعة · ${fmtN(conv.syp)} ل.س`);
}
