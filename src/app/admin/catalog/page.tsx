import { redirect } from "next/navigation";

/** الأقسام والبانرات صارت تبويباً داخل «إعدادات المتجر» */
export default function CatalogRedirect() { redirect("/admin/settings?tab=catalog"); }
