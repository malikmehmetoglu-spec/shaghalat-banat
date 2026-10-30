"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoneySheet } from "./MoneyActions";

/** زر صغير «ضبط» على بطاقة الصندوق — للمالك فقط */
export function BoxAdjust({ box, name, sham, shop, owner }: { box: string; name: string; sham: number; shop: number; owner: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!owner) return null;
  return (
    <>
      <button type="button" className="fin-w-adj" onClick={() => setOpen(true)} aria-label={`ضبط رصيد ${name}`}>ضبط</button>
      {open && <MoneySheet kind="adjust" presetTo={box} sham={sham} shop={shop} rate={0} categories={[]}
        onClose={() => setOpen(false)} onDone={() => { setOpen(false); router.refresh(); }} />}
    </>
  );
}
