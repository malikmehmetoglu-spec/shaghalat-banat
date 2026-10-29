"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { useT } from "@/components/LangProvider";

/** صف أفقي يُسحب على الهاتف، ومع أسهم تنقّل على الكمبيوتر */
export function ScrollRow({ title, className, children }: { title: string; className: string; children: React.ReactNode }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });
  const update = useCallback(() => {
    const el = ref.current; if (!el) return;
    const x = Math.abs(el.scrollLeft); // في الاتجاه العربي scrollLeft سالب
    setEdge({ start: x <= 2, end: x + el.clientWidth >= el.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    update();
    const el = ref.current; if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update); ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [update]);
  const go = (dir: 1 | -1) => {
    const el = ref.current; if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <>
      <div className="row-between">
        <h2 className="sec-title">{title}</h2>
        {!(edge.start && edge.end) && (
          <div className="row-arrows d-only">
            <button type="button" className="row-arrow" aria-label={t("السابق")} disabled={edge.start} onClick={() => go(-1)}><Icon name="back" size={18} stroke={2.2} /></button>
            <button type="button" className="row-arrow" aria-label={t("التالي")} disabled={edge.end} onClick={() => go(1)}><Icon name="forward" size={18} stroke={2.2} /></button>
          </div>
        )}
      </div>
      <div ref={ref} className={`${className} scr`}>{children}</div>
    </>
  );
}
