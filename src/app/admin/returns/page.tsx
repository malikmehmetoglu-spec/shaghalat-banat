import { redirect } from "next/navigation";

/** المرتجعات صارت تبويباً داخل نقطة البيع */
export default function ReturnsRedirect() { redirect("/admin/pos?tab=returns"); }
