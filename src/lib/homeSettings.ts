/** إعدادات أقسام الصفحة الرئيسية القابلة للإدارة */
export type HomeSettings = {
  deals_show: boolean; deals_title: string; deals_sub: string; deals_ends_at: string; deals_limit: number;
  collect_show: boolean; collect_category: string; collect_kicker: string; collect_title: string; collect_sub: string;
  collect_cta: string; collect_image: string; collect_tone: "magenta" | "berry" | "plum" | "blush";
};
export const HOME_DEFAULTS: HomeSettings = {
  deals_show: true, deals_title: "", deals_sub: "", deals_ends_at: "", deals_limit: 10,
  collect_show: true, collect_category: "", collect_kicker: "", collect_title: "", collect_sub: "", collect_cta: "", collect_image: "", collect_tone: "magenta",
};
export const homeSettings = (raw: unknown): HomeSettings => ({ ...HOME_DEFAULTS, ...((raw && typeof raw === "object" ? raw : {}) as Partial<HomeSettings>) });
