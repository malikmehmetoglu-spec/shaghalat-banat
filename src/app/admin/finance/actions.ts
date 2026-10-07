"use server";
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
    const path = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const up = await sb.storage.from("receipts").upload(path, file);
    if (!up.error) receipt = path;
  }
  const { error } = await sb.rpc("record_expense", {
    p_date: str(fd, "date") || null, p_category: str(fd, "category"), p_description: desc,
    p_amount: Number(str(fd, "amount")), p_paid_from: str(fd, "paid_from"), p_recurring: fd.get("recurring") === "on", p_receipt: receipt,
  });
  if (error) return fail(errMsg(error));
  touch();
  return ok("تم حفظ المصروف وترحيل القيد");
}

export async function cashMove(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb } = await fin();
  const { error } = await sb.rpc("cash_move", { p_kind: str(fd, "kind"), p_amount: Number(str(fd, "amount")), p_from: str(fd, "from") || null, p_to: str(fd, "to") || null, p_note: str(fd, "note") });
  if (error) return fail(errMsg(error));
  touch();
  return ok("تم تسجيل الحركة");
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
  return { ...ok(d === 0 ? "تم إغلاق الوردية — الصندوق مطابق" : d > 0 ? `تم الإغلاق — فائض ${d}` : `تم الإغلاق — عجز ${-d}`), diff: d };
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
