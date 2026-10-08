"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/components/LangProvider";

type Banner = { id: string; kicker: string | null; title: string; link: string | null; image_url: string | null };
const FALLBACK_BG = "linear-gradient(170deg,var(--banat-pink),var(--magenta) 55%,var(--deep-berry))";
const INTERVAL = 6000;

/** بانرات الواجهة: تتقلّب تلقائياً كل 6 ثوانٍ، مع نقاط تنقّل وسحب باللمس، وتتوقف عند مرور الفأرة */
export function HeroCarousel({ banners, fallbackTitle }: { banners: Banner[]; fallbackTitle: string }) {
  const t = useT();
  const slides = banners.length ? banners : [{ id: "f", kicker: null, title: fallbackTitle, link: "/search", image_url: null }];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const go = useCallback((n: number) => setI((n + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((x) => (x + 1) % slides.length), INTERVAL);
    return () => clearInterval(id);
  }, [slides.length, paused, i]);

  return (
    <section className="hero" aria-roledescription="carousel" aria-label={t("العروض")}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={(e) => {
        const start = touchX.current; touchX.current = null; setPaused(false);
        if (start === null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 40) go(i + (dx > 0 ? 1 : -1) * (document.dir === "rtl" ? 1 : -1));
      }}>
      <img src="/icons/logo-mark.svg" alt="" aria-hidden="true" className="hero-mark" />
      <div className="hero-stage">
        {slides.map((b, n) => (
          <div key={b.id} className={`hero-slide${n === i ? " on" : ""}`} aria-hidden={n !== i} role="group" aria-roledescription="slide" aria-label={`${n + 1} / ${slides.length}`}>
            <div className="hero-text">
              {b.kicker && <span className="hero-kicker">{b.kicker}</span>}
              {n === 0 ? <h1 className="hero-title">{b.title}</h1> : <h2 className="hero-title">{b.title}</h2>}
              <Link href={b.link || "/search"} className="btn cta hero-cta" tabIndex={n === i ? 0 : -1}>{t("تسوّقي الآن")}</Link>
            </div>
            <div className="arch hero-arch" style={{ background: b.image_url ? `url(${b.image_url}) center/cover` : FALLBACK_BG }} />
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="hero-dots">
          {slides.map((b, n) => (
            <button key={b.id} type="button" className={n === i ? "on" : ""} aria-label={`${t("العرض")} ${n + 1}`} aria-current={n === i} onClick={() => go(n)} />
          ))}
        </div>
      )}
    </section>
  );
}
