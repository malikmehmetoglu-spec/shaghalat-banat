export const PAGE = 24;
/** عدد المنتجات المعروضة من ?n= (مضاعفات 24) */
export const shownCount = (n?: string) => Math.max(PAGE, Math.min(1000, Math.ceil((Number(n) || PAGE) / PAGE) * PAGE));
