import { redirect } from "next/navigation";

/** دُمجت في «الإدارة المالية» المبسّطة */
export default function Moved() { redirect("/admin/finance/movements?type=expense"); }
