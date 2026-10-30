import { redirect } from "next/navigation";

/** آراء الزبونات صارت قسماً داخل «إعدادات المتجر» */
export default function ReviewsRedirect() { redirect("/admin/settings?tab=reviews"); }
