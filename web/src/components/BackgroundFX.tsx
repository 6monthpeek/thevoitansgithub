"use client";

/**
 * BackgroundFX
 * Advanced.team benzeri premium arka plan:
 * Katmanlar:
 * 1) Base gradient + vignette (globals.css üzerinden)
 * 2) Noise (çok düşük opaklık)
 * 3) Parallax glows (cyan/amber/violet) – mouse ile hafif hareket
 * 4) Mask'li grid (yavaş drift)
 * 5) Motion tercihlerine saygı (prefers-reduced-motion)
 *
 * Notlar:
 * - GPU dostu: transform/opacity animasyonları, büyük blur ve düşük opaklık
 * - Accessibility: prefers-reduced-motion ile animasyonlar kapatılır
 * - Modüler: main içine absolute olarak konumlandırılır; içerikten bağımsız
 */

import { useEffect, useRef } from "react";

export default function BackgroundFX() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      el.setAttribute("data-reduced", "1");
      return;
    }

    // Mouse parallax: ana kapsayıcıya göre offset hesapla
    function handleMove(e: MouseEvent) {
      // Narrowing: DOM mevcut değilse çık
      const targetEl = rootRef.current;
      if (!targetEl) return;
      const parent = targetEl.parentElement as HTMLElement | null; // main'in child'ı
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const mx = (e.clientX - rect.left) - rect.width / 2;
      const my = (e.clientY - rect.top) - rect.height / 2;
      targetEl.style.setProperty("--gx", `${mx}`);
      targetEl.style.setProperty("--gy", `${my}`);
    }

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMove);
    };
  }, []);

  return (
    <div ref={rootRef} className="tv-bgfx pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Noise */}
      <div className="tv-noise" />

      {/* Glows */}
      <div className="tv-glow tv-glow--cyan" />
      <div className="tv-glow tv-glow--amber" />
      <div className="tv-glow tv-glow--violet" />

      {/* Grid (mask'li, yavaş drift) */}
      <div className="tv-grid" />
      <style jsx>{`
        .tv-bgfx {
          /* Parallax referansı (mouse ile) */
          --gx: 0;
          --gy: 0;
          contain: layout style paint;
          will-change: transform, opacity;
        }

        /* Noise: çok düşük opaklıkta, karışımı yumuşatır */
        .tv-noise {
          position: absolute;
          inset: 0;
          opacity: 0.035; /* çok hafif */
          mix-blend-mode: soft-light;
          background-image: repeating-radial-gradient(
              circle at 0 0,
              rgba(255,255,255,0.07) 0,
              rgba(255,255,255,0.07) 0.5px,
              transparent 0.6px,
              transparent 6px
            ),
            repeating-linear-gradient(
              0deg,
              rgba(255,255,255,0.03),
              rgba(255,255,255,0.03) 1px,
              transparent 1px,
              transparent 2px
            );
          background-size: 800px 800px, 100% 2px;
          pointer-events: none;
        }

        /* Glows */
        .tv-glow {
          position: absolute;
          width: 60vw;
          height: 60vw;
          border-radius: 9999px;
          filter: blur(80px);
          opacity: 0.16;
          transform: translate3d(calc(var(--gx) * 0.015px), calc(var(--gy) * 0.015px), 0);
          transition: transform 250ms ease;
          will-change: transform;
        }

        .tv-glow--cyan {
          background: #35b4ff;
          left: -10vw;
          top: -12vw;
        }

        .tv-glow--amber {
          background: #ffd144;
          right: -12vw;
          bottom: -10vw;
          opacity: 0.14;
          transform: translate3d(calc(var(--gx) * -0.012px), calc(var(--gy) * -0.012px), 0);
        }

        .tv-glow--violet {
          background: #8bf0cb; /* mint-yeşili-ışık */
          left: 28vw;
          bottom: 8vw;
          opacity: 0.10;
          transform: translate3d(calc(var(--gx) * 0.008px), calc(var(--gy) * 0.008px), 0);
        }

        /* Grid layer: mask ile ortada yoğun, kenarlarda sönük */
        .tv-grid {
          position: absolute;
          inset: 0;
          opacity: 0.06;
          background-image:
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.16) 1px, transparent 1px);
          background-size: 26px 26px;
          mask-image: radial-gradient(130% 80% at 50% 42%, black 0%, transparent 70%);
          -webkit-mask-image: radial-gradient(130% 80% at 50% 42%, black 0%, transparent 70%);
          animation: tv-grid-drift 14s ease-in-out infinite;
          will-change: background-position, opacity;
        }

        @keyframes tv-grid-drift {
          0% { background-position: 0 0; }
          50% { background-position: 0 -8px; }
          100% { background-position: 0 0; }
        }

        /* Motion preference: animasyonları kapat */
        @media (prefers-reduced-motion: reduce) {
          :global(.tv-grid) { animation: none !important; }
          :global(.tv-glow) { transition: none !important; transform: none !important; }
        }

        /* Reduced flag (JS ile set ediliyor) */
        :global(.tv-bgfx[data-reduced="1"] .tv-grid) { animation: none !important; }
        :global(.tv-bgfx[data-reduced="1"] .tv-glow) { transition: none !important; transform: none !important; }
      `}</style>
    </div>
  );
}
