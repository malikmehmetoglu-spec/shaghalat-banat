"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireStaff } from "@/lib/admin";

export async function setColorImage(productId: string, colorName: string, imageUrl: string | null) {
  const { sb } = await requireStaff("/admin/products");
  const { error } = await sb.from("product_variants").update({ image_url: imageUrl }).eq("product_id", productId).eq("color_name", colorName);
  if (error) return { ok: false as const, message: error.message };
  revalidatePath(`/admin/products/${productId}`);
  revalidateTag("catalog");
  return { ok: true as const, message: "تم ربط الصورة باللون" };
}
