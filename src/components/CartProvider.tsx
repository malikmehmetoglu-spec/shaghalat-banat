"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartLine } from "@/lib/types";

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
};

const CartContext = createContext<Ctx | null>(null);
const KEY = "sb-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {}
  }, [lines, ready]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.variantId === line.variantId);
      if (i === -1) return [...prev, line];
      const next = [...prev];
      next[i] = { ...next[i], qty: next[i].qty + line.qty };
      return next;
    });
  }, []);
  const setQty = useCallback((variantId: string, qty: number) => {
    setLines((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, qty: Math.max(1, qty) } : l)));
  }, []);
  const remove = useCallback((variantId: string) => setLines((p) => p.filter((l) => l.variantId !== variantId)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(() => ({
    lines, ready, add, setQty, remove, clear,
    count: lines.reduce((s, l) => s + l.qty, 0),
    subtotal: lines.reduce((s, l) => s + l.qty * l.unitPrice, 0),
  }), [lines, ready, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart خارج CartProvider");
  return c;
}
