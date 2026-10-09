"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errMsg, requireStaff } from "@/lib/admin";
import { audienceSubs, sendToSubs } from "@/lib/push";

export type ActionResult = { ok: boolean; message: string };
const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numOrNull = (v: string) => (v === "" ? null : Number(v));

// ───────── الطلبات ─────────
export async function setOrderStatus(orderId: string, status: string, note?: string): Promise<ActionResult> {
  const { sb } = await requireStaff();
  const { error } = await sb.rpc("admin_set_order_status", { order_id: orderId, new_status: status, note: note || null });
  if (error) return fail(errMsg(error));
  await notifyOrderStatus(sb, orderId, status).catch(() => {});
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return ok("تم تحديث حالة الطلب");
}

const STATUS_MSG: Record<string, [string, string, string, string]> = {
  confirmed: ["تم تأكيد طلبك 💗", "طلبك #{n} مؤكَّد ونجهّزه الآن", "Order confirmed 💗", "Your order #{n} is confirmed"],
  shipped: ["طلبك في الطريق 🚚", "طلبك #{n} خرج للتوصيل", "Your order is on the way 🚚", "Order #{n} is out for delivery"],
  delivered: ["تم توصيل طلبك ✨", "نتمنى أن يعجبك طلبك #{n}", "Delivered ✨", "We hope you love order #{n}"],
  cancelled: ["تم إلغاء الطلب", "تم إلغاء طلبك #{n}", "Order cancelled", "Your order #{n} was cancelled"],
};
/** إشعار داخل التطبيق + إشعار Push للعميلة عند تغيّر حالة طلبها */
async function notifyOrderStatus(sb: Awaited<ReturnType<typeof requireStaff>>["sb"], orderId: string, status: string) {
  const m = STATUS_MSG[status];
  if (!m) return;
  const { data: o } = await sb.from("orders").select("user_id,number").eq("id", orderId).maybeSingle();
  if (!o?.user_id) return;
  await sb.from("notifications").insert({ user_id: o.user_id, kind: "order", title: m[0], body: m[1].replace("{n}", o.number) });
  const { data: subs } = await sb.from("push_subscriptions").select("id,kind,endpoint,keys,lang").eq("user_id", o.user_id);
  for (const lang of ["ar", "en"]) {
    const group = (subs ?? []).filter((s: any) => (s.lang === "en") === (lang === "en"));
    if (group.length) await sendToSubs(sb, group as any, { title: lang === "en" ? m[2] : m[0], body: (lang === "en" ? m[3] : m[1]).replace("{n}", o.number), link: `/orders/${orderId}` });
  }
}

// ───────── الإشعارات (حملات) ─────────
export async function sendCampaign(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb, profile } = await requireStaff();
  const title = str(fd, "title"), body = str(fd, "body");
  if (!title || !body) return fail("العنوان والنص مطلوبان");
  const isTest = str(fd, "test") === "1";
  const audience = isTest ? "test" : ["all", "buyers", "no_orders", "staff"].includes(str(fd, "audience")) ? str(fd, "audience") : "all";
  const link = str(fd, "link") || "/";
  const when = !isTest && str(fd, "when") === "later" ? str(fd, "scheduled_at") : "";
  if (when) {
    const { error } = await sb.from("push_campaigns").insert({ title, body, link, audience, scheduled_at: new Date(when).toISOString(), created_by: profile.id });
    if (error) return fail(errMsg(error, "تعذّر الحفظ — تأكدي من تنفيذ ملف 0006_push.sql"));
    revalidatePath("/admin/push");
    return ok("تمت جدولة الإشعار");
  }
  const subs = await audienceSubs(sb, audience, profile.id);
  const r = await sendToSubs(sb, subs, { title, body, link });
  if (audience !== "test") {
    await sb.from("push_campaigns").insert({ title, body, link, audience, sent_at: new Date().toISOString(), sent_count: r.sent, failed_count: r.failed, created_by: profile.id });
    if (audience === "all" || audience === "buyers" || audience === "no_orders") {
      // يظهر أيضاً في صفحة الإشعارات داخل التطبيق للمسجّلات
      const ids = [...new Set(subs.map((s: any) => s.user_id).filter(Boolean))];
      if (ids.length) await sb.from("notifications").insert(ids.map((user_id) => ({ user_id, kind: "offer", title, body })));
    }
  }
  revalidatePath("/admin/push");
  if (!subs.length) return fail(audience === "test" ? "لا يوجد اشتراك لجهازك — فعّلي الإشعارات من صفحة حسابي في التطبيق أولاً" : "لا يوجد مشتركون في هذا الجمهور بعد");
  return ok(`تم الإرسال إلى ${r.sent} جهاز${r.failed ? ` · فشل ${r.failed}` : ""}`);
}

// ───────── المنتجات ─────────
function slugify(s: string) {
  const base = s.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-|-$/g, "");
  return `${base || "p"}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function saveProduct(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb } = await requireStaff();
  const id = str(fd, "id");
  const name = str(fd, "name");
  const priceV = Number(str(fd, "price"));
  if (!name) return fail("اسم المنتج مطلوب");
  if (!(priceV >= 0)) return fail("السعر غير صحيح");
  const images = str(fd, "images").split(/\s*\n\s*/).filter(Boolean);
  const row = {
    name,
    name_en: str(fd, "name_en") || null,
    subtitle: str(fd, "subtitle") || null,
    description: str(fd, "description") || null,
    price: priceV,
    compare_at_price: numOrNull(str(fd, "compare_at_price")),
    cost: numOrNull(str(fd, "cost")),
    tag: str(fd, "tag") || null,
    category_id: str(fd, "category_id") || null,
    images,
    is_online: fd.get("is_online") === "on",
    is_in_store: fd.get("is_in_store") === "on",
  };
  if (id) {
    const { error } = await sb.from("products").update(row).eq("id", id);
    if (error) return fail(errMsg(error));
    await applyVariantsBulk(sb, id, str(fd, "variants_json"), str(fd, "stock_location"));
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/admin/products");
    return ok("تم حفظ المنتج");
  }
  const { data, error } = await sb.from("products").insert({ ...row, slug: slugify(str(fd, "name_en") || name) }).select("id").single();
  if (error || !data) return fail(errMsg(error));
  await applyVariantsBulk(sb, data.id, str(fd, "variants_json"), str(fd, "stock_location"));
  revalidatePath("/admin/products");
  redirect(`/admin/products/${data.id}?created=1`);
}

export async function toggleProductOnline(id: string, value: boolean) {
  const { sb } = await requireStaff();
  await sb.from("products").update({ is_online: value }).eq("id", id);
  revalidatePath("/admin/products");
}

export async function addVariant(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb } = await requireStaff();
  const productId = str(fd, "product_id");
  const sku = str(fd, "sku");
  if (!sku) return fail("رمز SKU مطلوب");
  const { error } = await sb.from("product_variants").insert({
    product_id: productId,
    sku,
    barcode: str(fd, "barcode") || null,
    size: str(fd, "size") || null,
    color_name: str(fd, "color_name") || null,
    color_hex: str(fd, "color_hex") || null,
  });
  if (error) return fail(error.code === "23505" ? "رمز SKU أو الباركود مستخدم مسبقاً" : errMsg(error));
  revalidatePath(`/admin/products/${productId}`);
  return ok("تمت إضافة المتغير");
}

export async function deleteVariant(variantId: string, productId: string): Promise<ActionResult> {
  const { sb } = await requireStaff();
  const { error } = await sb.from("product_variants").delete().eq("id", variantId);
  if (error) return fail("لا يمكن حذف متغير له طلبات أو حركات مخزون؛ يمكنك تصفير كميته بدلاً من ذلك");
  revalidatePath(`/admin/products/${productId}`);
  return ok("تم حذف المتغير");
}

/** تحديث كمية متغير في موقع (إدخال أو تسوية) */
export async function setStock(variantId: string, locationId: string, qty: number, reason: "in" | "adjust" = "adjust", note?: string): Promise<ActionResult> {
  const { sb } = await requireStaff();
  const { error } = await sb.rpc("stock_set", { variant: variantId, loc: locationId, new_qty: qty, reason, note: note || null });
  if (error) return fail(errMsg(error));
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products", "layout");
  return ok("تم تحديث الكمية");
}

// ───────── المخزون ─────────
export async function transferStock(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb } = await requireStaff();
  const { error } = await sb.rpc("stock_transfer", {
    variant: str(fd, "variant_id"),
    from_loc: str(fd, "from"),
    to_loc: str(fd, "to"),
    qty: Number(str(fd, "qty")),
    note: str(fd, "note") || null,
  });
  if (error) return fail(errMsg(error));
  revalidatePath("/admin/inventory/moves");
  revalidatePath("/admin/inventory");
  return ok("تم التحويل بنجاح");
}

export async function applyCount(locationId: string, counts: { variantId: string; qty: number }[], note: string): Promise<ActionResult> {
  const { sb } = await requireStaff();
  let changed = 0;
  for (const c of counts) {
    const { data, error } = await sb.rpc("stock_set", { variant: c.variantId, loc: locationId, new_qty: c.qty, reason: "adjust", note });
    if (error) return fail(errMsg(error));
    if (data) changed++;
  }
  revalidatePath("/admin/inventory");
  return ok(changed ? `تم اعتماد الجرد وتسجيل ${changed} تسويات` : "الجرد مطابق، لا توجد فروقات");
}

// ───────── الموردون وأوامر الشراء ─────────
export async function addSupplier(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb } = await requireStaff();
  const name = str(fd, "name");
  if (!name) return fail("اسم المورد مطلوب");
  const { error } = await sb.from("suppliers").insert({ name, category: str(fd, "category") || null, phone: str(fd, "phone") || null, lead_days: numOrNull(str(fd, "lead_days")) });
  if (error) return fail(errMsg(error));
  revalidatePath("/admin/inventory/suppliers");
  return ok("تمت إضافة المورد");
}

export async function createPurchaseOrder(supplierId: string, locationId: string, items: { variantId: string; qty: number; cost: number }[], note: string): Promise<ActionResult & { id?: string }> {
  const { sb, profile } = await requireStaff();
  if (!items.length) return fail("أضيفي منتجاً واحداً على الأقل");
  const { data: po, error } = await sb.from("purchase_orders").insert({ supplier_id: supplierId, location_id: locationId, status: "sent", note: note || null, created_by: profile.id }).select("id,number").single();
  if (error || !po) return fail(errMsg(error));
  const { error: e2 } = await sb.from("po_items").insert(items.map((i) => ({ po_id: po.id, variant_id: i.variantId, qty: i.qty, unit_cost: i.cost })));
  if (e2) return fail(errMsg(e2));
  revalidatePath("/admin/inventory/suppliers");
  return { ...ok(`تم إنشاء أمر الشراء ${po.number}`), id: po.id };
}

export async function receivePurchaseOrder(id: string): Promise<ActionResult> {
  const { sb } = await requireStaff();
  const { error } = await sb.rpc("receive_purchase_order", { po: id });
  if (error) return fail(errMsg(error));
  revalidatePath("/admin/inventory/suppliers");
  revalidatePath("/admin/inventory");
  return ok("تم استلام البضاعة وإضافتها للمخزون");
}

// ───────── نقطة البيع ─────────
export async function posSale(items: { variant_id: string; qty: number }[], payment: string, discount: number, phone: string, name = "", marketing = false): Promise<ActionResult & { number?: string; total?: number }> {
  const { sb } = await requireStaff();
  const digits = phone.replace(/\D/g, "");
  if (digits && digits.length < 9) return fail("رقم الهاتف غير مكتمل");
  const { data, error } = await sb.rpc("pos_sale_v2", { items, payment, discount_amount: discount, customer_phone_in: digits ? phone : null, customer_name_in: digits ? name : null, marketing_in: digits ? marketing : false });
  if (error || !data) return fail(errMsg(error));
  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  return { ...ok("تمت عملية البيع"), number: (data as { number: string }).number, total: Number((data as { total: number }).total) };
}

// ───────── الأقسام والبانرات والكوبونات ─────────
export async function saveCategory(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb } = await requireStaff();
  const name = str(fd, "name");
  if (!name) return fail("اسم القسم مطلوب");
  const slug = str(fd, "slug") || slugify(str(fd, "name_en") || name);
  const { error } = await sb.from("categories").insert({ name, name_en: str(fd, "name_en") || null, slug, image_url: str(fd, "image_url") || null, sort_order: Number(str(fd, "sort_order") || 99) });
  if (error) return fail(error.code === "23505" ? "الرابط المختصر مستخدم مسبقاً" : errMsg(error));
  revalidatePath("/admin/catalog");
  return ok("تمت إضافة القسم");
}

export async function toggleCategory(id: string, visible: boolean) {
  const { sb } = await requireStaff();
  await sb.from("categories").update({ is_visible: visible }).eq("id", id);
  revalidatePath("/admin/catalog");
}

export async function saveBanner(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb } = await requireStaff();
  const title = str(fd, "title");
  if (!title) return fail("عنوان البانر مطلوب");
  const { error } = await sb.from("banners").insert({ title, kicker: str(fd, "kicker") || null, link: str(fd, "link") || null, image_url: str(fd, "image_url") || null, sort_order: Number(str(fd, "sort_order") || 0) });
  if (error) return fail(errMsg(error));
  revalidatePath("/admin/catalog");
  return ok("تمت إضافة البانر");
}

export async function toggleBanner(id: string, active: boolean) {
  const { sb } = await requireStaff();
  await sb.from("banners").update({ is_active: active }).eq("id", id);
  revalidatePath("/admin/catalog");
}

export async function deleteBanner(id: string) {
  const { sb } = await requireStaff();
  await sb.from("banners").delete().eq("id", id);
  revalidatePath("/admin/catalog");
}

export async function saveCoupon(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb } = await requireStaff();
  const code = str(fd, "code").toUpperCase().replace(/\s+/g, "");
  if (!code) return fail("الكود مطلوب");
  const { error } = await sb.from("coupons").insert({
    code,
    description: str(fd, "description") || null,
    kind: str(fd, "kind") || "percent",
    value: Number(str(fd, "value") || 0),
    min_order: Number(str(fd, "min_order") || 0),
    max_uses: numOrNull(str(fd, "max_uses")),
    starts_at: str(fd, "starts_at") || null,
    ends_at: str(fd, "ends_at") || null,
    channel: str(fd, "channel") || "all",
  });
  if (error) return fail(error.code === "23505" ? "هذا الكود موجود مسبقاً" : errMsg(error));
  revalidatePath("/admin/coupons");
  return ok(`تم إنشاء الكوبون ${code}`);
}

export async function toggleCoupon(code: string, active: boolean) {
  const { sb } = await requireStaff();
  await sb.from("coupons").update({ is_active: active }).eq("code", code);
  revalidatePath("/admin/coupons");
}

// ───────── الموظفون ─────────
export async function setRole(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb, profile } = await requireStaff();
  if (profile.role !== "owner") return fail("تغيير الأدوار للمديرة فقط");
  const role = str(fd, "role");
  // الحسابات مرتبطة برقم الهاتف: نوحّد الصيغة إلى 963XXXXXXXXX (كما يخزّنها نظام الدخول)
  let digits = str(fd, "who").replace(/\D/g, "").replace(/^00/, "");
  if (digits.startsWith("0")) digits = "963" + digits.slice(1);
  else if (!digits.startsWith("963")) digits = "963" + digits;
  if (digits.length < 11) return fail("أدخلي رقم هاتف صحيحاً");
  const { data, error } = await sb.from("profiles").update({ role }).in("phone", [digits, "+" + digits]).select("id");
  if (error) return fail(errMsg(error));
  if (!data?.length) return fail("لم نجد حساباً بهذا الرقم — يجب أن تسجّل الموظفة دخولها برقم هاتفها مرة أولاً");
  revalidatePath("/admin/staff");
  return ok("تم تحديث الدور");
}

// ───────── المرتجعات والمواقع ─────────
export async function setReturnStatus(id: string, status: string) {
  const { sb } = await requireStaff();
  await sb.from("return_requests").update({ status }).eq("id", id);
  revalidatePath("/admin/returns");
}

export async function saveLocation(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb } = await requireStaff();
  const name = str(fd, "name");
  if (!name) return fail("اسم الموقع مطلوب");
  const { error } = await sb.from("locations").insert({ name, kind: str(fd, "kind") || "warehouse", address: str(fd, "address") || null, sells_online: fd.get("sells_online") === "on" });
  if (error) return fail(errMsg(error));
  revalidatePath("/admin/inventory/locations");
  return ok("تمت إضافة الموقع");
}

export async function toggleLocationOnline(id: string, value: boolean) {
  const { sb } = await requireStaff();
  await sb.from("locations").update({ sells_online: value }).eq("id", id);
  revalidatePath("/admin/inventory/locations");
}

// ───────── حسابات الموظفين (اسم مستخدم + كلمة مرور) ─────────
export async function createStaff(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb, profile } = await requireStaff();
  if (profile.role !== "owner") return fail("إنشاء الحسابات متاح للمدير العام فقط");
  const login = str(fd, "login").toLowerCase();
  if (!/^[a-z0-9._@-]{3,}$/.test(login)) return fail("اسم المستخدم بأحرف إنجليزية أو أرقام (3 أحرف على الأقل)");
  const { error } = await sb.rpc("admin_create_staff", { p_login: login, p_password: str(fd, "password"), p_name: str(fd, "name"), p_role: str(fd, "role") });
  if (error) return fail(errMsg(error));
  revalidatePath("/admin/staff");
  return ok(`تم إنشاء الحساب — يدخل بـ ${login.includes("@") ? login : login + "@shaghalat-banat.com"} أو باسم المستخدم فقط`);
}

export async function updateStaffRole(id: string, role: string): Promise<ActionResult> {
  const { sb, profile } = await requireStaff();
  if (profile.role !== "owner") return fail("متاح للمدير العام فقط");
  if (id === profile.id) return fail("لا يمكنك تغيير دورك بنفسك");
  const { error } = await sb.from("profiles").update({ role }).eq("id", id);
  if (error) return fail(errMsg(error));
  revalidatePath("/admin/staff");
  return ok("تم تحديث الدور");
}

export async function setStaffActive(id: string, active: boolean): Promise<ActionResult> {
  const { sb } = await requireStaff();
  const { error } = await sb.rpc("admin_set_staff_active", { p_user: id, p_active: active });
  if (error) return fail(errMsg(error));
  revalidatePath("/admin/staff");
  return ok(active ? "تم تفعيل الحساب" : "تم إيقاف الحساب");
}

export async function setStaffPassword(id: string, password: string): Promise<ActionResult> {
  const { sb, profile } = await requireStaff();
  const { error } = await sb.rpc("admin_set_password", { p_user: id || profile.id, p_password: password });
  if (error) return fail(errMsg(error));
  return ok("تم تغيير كلمة المرور");
}

// ───────── صور الأقسام والبانرات ─────────
export async function setCategoryImage(id: string, url: string) {
  const { sb } = await requireStaff();
  await sb.from("categories").update({ image_url: url }).eq("id", id);
  revalidatePath("/admin/catalog"); revalidatePath("/", "layout");
}
export async function setBannerImage(id: string, url: string) {
  const { sb } = await requireStaff();
  await sb.from("banners").update({ image_url: url }).eq("id", id);
  revalidatePath("/admin/catalog"); revalidatePath("/", "layout");
}

// ───────── إضافة ألوان ومقاسات وكميات دفعة واحدة ─────────
type BulkColor = { color: string; hex: string; sizes: { size: string; qty: number }[] };
async function applyVariantsBulk(sb: Awaited<ReturnType<typeof requireStaff>>["sb"], productId: string, raw: string, locId: string) {
  let list: BulkColor[] = [];
  try { list = JSON.parse(raw || "[]"); } catch { return 0; }
  if (!list.length) return 0;
  const { data: prod } = await sb.from("products").select("slug").eq("id", productId).single();
  const prefix = ((prod?.slug ?? "sb").replace(/[^a-z0-9]/gi, "").slice(0, 6) || "SB").toUpperCase();
  const { data: existing } = await sb.from("product_variants").select("id,size,color_name,stock_levels(location_id,on_hand)").eq("product_id", productId);
  let made = 0;
  for (const [ci, c] of list.entries()) {
    for (const s of c.sizes) {
      const size = !s.size || s.size === "مقاس واحد" ? null : s.size;
      const colorName = c.color?.trim() ? c.color.trim() : null;
      let v = (existing ?? []).find((e: any) => (e.color_name ?? null) === colorName && (e.size ?? null) === size) as any;
      if (!v) {
        const sku = `${prefix}-${ci + 1}${(size ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase() || "1"}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const { data: nv } = await sb.from("product_variants").insert({ product_id: productId, sku, size, color_name: colorName, color_hex: colorName ? c.hex || null : null }).select("id").single();
        if (!nv) continue;
        v = { id: nv.id, stock_levels: [] };
        made++;
      } else if (colorName && c.hex) {
        await sb.from("product_variants").update({ color_hex: c.hex }).eq("id", v.id);
      }
      if (s.qty > 0 && locId) {
        const cur = (v.stock_levels ?? []).find((l: any) => l.location_id === locId)?.on_hand ?? 0;
        await sb.rpc("stock_set", { variant: v.id, loc: locId, new_qty: cur + s.qty, reason: "in", note: "إدخال بضاعة" });
      }
    }
  }
  return made;
}

/** إضافة قطع لكمية موجودة — تُقرأ الكمية الحالية من قاعدة البيانات لحظة الحفظ (لا تُمسح أي كمية) */
export async function addStock(variantId: string, locationId: string, delta: number): Promise<ActionResult & { qty?: number }> {
  const { sb } = await requireStaff();
  if (!(delta > 0)) return fail("اكتب عدداً أكبر من صفر");
  const { data } = await sb.from("stock_levels").select("on_hand").eq("variant_id", variantId).eq("location_id", locationId).maybeSingle();
  const next = (data?.on_hand ?? 0) + Math.floor(delta);
  const { error } = await sb.rpc("stock_set", { variant: variantId, loc: locationId, new_qty: next, reason: "in", note: "إضافة بضاعة" });
  if (error) return fail(errMsg(error));
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products", "layout");
  return { ...ok(`تمت إضافة ${Math.floor(delta)} قطعة — المجموع الآن ${next}`), qty: next };
}

/** حذف منتج: يُؤرشف فيختفي من المتجر واللوحة والمخزون، وتبقى الطلبات والفواتير السابقة سليمة */
export async function archiveProduct(id: string): Promise<ActionResult> {
  const { sb, profile } = await requireStaff();
  if (profile.role !== "owner") return fail("حذف المنتجات متاح للمدير العام فقط");
  const { error } = await sb.from("products").update({ archived_at: new Date().toISOString(), is_online: false, is_in_store: false }).eq("id", id);
  if (error) return fail(errMsg(error));
  revalidatePath("/admin/products", "layout");
  revalidatePath("/", "layout");
  return ok("تم حذف المنتج");
}

// ───────── روابط التواصل (صفحة /qr) ─────────
export async function saveStoreProfile(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { sb } = await requireStaff();
  const url = (v: string) => (v && !/^https?:\/\//.test(v) ? `https://${v}` : v) || null;
  const { error } = await sb.from("store_profile").update({
    whatsapp: str(fd, "whatsapp").replace(/[^\d+]/g, "") || null,
    facebook_url: url(str(fd, "facebook_url")),
    instagram_url: url(str(fd, "instagram_url")),
    tagline: str(fd, "tagline") || null,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) return fail(errMsg(error));
  revalidatePath("/qr");
  return ok("تم حفظ روابط التواصل");
}

/** مرتجع في المحل / تراجع عن الشراء: تعود القطع للمخزون ويُسجّل المبلغ المُعاد */
export async function recordStoreReturn(input: { items: { variant: string; qty: number }[]; kind: "return" | "cancel"; refund: number; refundFrom: "1110" | "1120" | "none"; reason: string; phone: string }): Promise<ActionResult> {
  const { sb } = await requireStaff();
  const items = input.items.filter((i) => i.qty > 0);
  if (!items.length) return fail("اختاري منتجاً واحداً على الأقل");
  const { data, error } = await sb.rpc("record_store_return", {
    p_items: items, p_kind: input.kind, p_refund: Math.max(0, Number(input.refund) || 0),
    p_refund_from: input.refundFrom, p_reason: input.reason, p_phone: input.phone || null,
  });
  if (error) return fail(errMsg(error));
  revalidatePath("/admin/returns"); revalidatePath("/admin/products"); revalidatePath("/admin/inventory"); revalidatePath("/admin/pos");
  return ok(`تم تسجيل المرتجع ${data} وأُعيدت القطع إلى المخزون`);
}

/** البحث عن عميلة برقمها (لتعبئة الاسم تلقائياً في نقطة البيع) */
export async function lookupCustomer(phone: string): Promise<{ name: string | null; marketing: boolean } | null> {
  const { sb } = await requireStaff();
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("09")) d = "963" + d.slice(1);
  if (d.length === 9 && d.startsWith("9")) d = "963" + d;
  if (d.length < 9) return null;
  const { data } = await sb.from("customers").select("name,marketing_opt_in").eq("phone", d).maybeSingle();
  return data ? { name: data.name, marketing: data.marketing_opt_in } : null;
}

export async function setCustomerMarketing(phone: string, on: boolean) {
  const { sb } = await requireStaff();
  await sb.from("customers").update({ marketing_opt_in: on, opt_in_at: on ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("phone", phone);
  revalidatePath("/admin/customers");
}
