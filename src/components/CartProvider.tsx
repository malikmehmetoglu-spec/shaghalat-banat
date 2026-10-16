"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartLine } from "@/lib/types";
import { getBrowserClient } from "@/lib/supabase/client";

/** السلة محفوظة في المتصفح حتى تعمل للضيفة قبل تسجيل الدخول. */
type Ctx = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (line: CartLine) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  ready: boolean;
  /** إعادة التحقق من الأسعار والمتوفر */
  sync: () => void;
};

const CartContext = createContext<Ctx | null>(null);
const KEY = "sb-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let saved: CartLine[] = [];
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(raw)) saved = raw.filter((l) => l && typeof l.variantId === "string" && Number(l.qty) > 0 && Number.isFinite(Number(l.unitPrice)));
    } catch {}
    setLines(saved);
    setReady(true);
    if (saved.length) refresh(saved).then((fresh) => fresh && setLines(fresh));
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {}
  }, [lines, ready]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.variantId === line.variantId);
      if (i === -1) return [...prev, { ...line, qty: clamp(line.qty, line.max) }];
      const next = [...prev];
      const max = line.max ?? next[i].max;
      next[i] = { ...next[i], ...line, max, qty: clamp(next[i].qty + line.qty, max) };
      return next;
    });
  }, []);
  const setQty = useCallback((variantId: string, qty: number) => {
    setLines((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, qty: clamp(qty, l.max) } : l)));
  }, []);
  const remove = useCallback((variantId: string) => setLines((p) => p.filter((l) => l.variantId !== variantId)), []);
  const clear = useCallback(() => setLines([]), []);
  const sync = useCallback(() => {
    setLines((cur) => { if (cur.length) refresh(cur).then((fresh) => fresh && setLines(fresh)); return cur; });
  }, []);

  const value = useMemo(() => ({
    lines, ready, add, setQty, remove, clear, sync,
    count: lines.reduce((s, l) => s + l.qty, 0),
    subtotal: lines.reduce((s, l) => s + l.qty * l.unitPrice, 0),
  }), [lines, ready, add, setQty, remove, clear, sync]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

const clamp = (q: number, max?: number) => Math.max(1, Math.min(Math.floor(q) || 1, max && max > 0 ? max : Infinity));

/** يتحقق من السلة المحفوظة: السعر الحالي، والمتوفر، وحذف ما لم يعد متاحاً */
async function refresh(lines: CartLine[]): Promise<CartLine[] | null> {
  try {
    const sb = getBrowserClient();
    const ids = lines.map((l) => l.variantId);
    const [{ data: vs, error }, { data: av }] = await Promise.all([
      sb.from("product_variants").select("id,price_override,product:products!inner(price,is_online,archived_at)").in("id", ids),
      sb.from("variant_availability").select("variant_id,online_available").in("variant_id", ids),
    ]);
    if (error || !vs) return null;
    const avail = new Map<string, number>((av ?? []).map((a: any) => [a.variant_id as string, Number(a.online_available) || 0]));
    const byId = new Map(vs.map((v: any) => [v.id, v]));
    return lines.flatMap((l) => {
      const v: any = byId.get(l.variantId);
      if (!v || !v.product?.is_online || v.product?.archived_at) return [];
      const max = avail.get(l.variantId) ?? 0;
      if (max <= 0) return [];
      return [{ ...l, unitPrice: Number(v.price_override ?? v.product.price), max, qty: Math.min(l.qty, max) }];
    });
  } catch { return null; }
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart خارج CartProvider");
  return c;
}
