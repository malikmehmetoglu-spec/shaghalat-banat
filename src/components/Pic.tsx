"use client";
import { useState } from "react";
import { thumbUrl } from "@/lib/format";

/** صورة بنسخة مصغّرة أولاً؛ إن لم توجد نسخة مصغّرة تعود تلقائياً للأصل */
export function Pic({ src, alt = "", full = false, className }: { src: string; alt?: string; full?: boolean; className?: string }) {
  const [s, setS] = useState(full ? src : thumbUrl(src));
  return <img className={className ?? "pic-fill"} src={s} alt={alt} loading="lazy" decoding="async" onError={() => s !== src && setS(src)} />;
}
