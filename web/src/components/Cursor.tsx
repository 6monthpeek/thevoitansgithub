"use client";
import { useEffect, useRef, useState } from "react";

/**
 * DOM-tabanlı custom cursor
 * - Kırık beyaz (#EDEDED) ok + hafif cyan/gold glow ring
 * - Pointer-events:none; performans için requestAnimationFrame ile takip
 * - Hoverable öğelerde (a, button, [role=button], input, select, textarea) halka genişler
 * - Motion azaltımı için prefers-reduced-motion desteği
 */
export default function Cursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const [hovering, setHovering] = useState(false);
  const [handMode, setHandMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handle = () => setReducedMotion(mq.matches);
    handle();
    mq.addEventListener?.("change", handle);
    return () => mq.removeEventListener?.("change", handle);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dot = dotRef.current!;
    const ring = ringRef.current!;
    if (!dot || !ring) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let rx = x;
    let ry = y;

    let raf = 0;

    const hoverables = ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"];
    const isHoverable = (el: Element | null) =>
      !!el && (hoverables.includes(el.tagName) || (el as HTMLElement).role === "button");
    const isClickable = (el: Element | null) => {
      if (!el) return false;
      const he = el as HTMLElement;
      if (hoverables.includes(el.tagName) || he.role === "button") return true;
      const style = window.getComputedStyle(he);
      // Tailwind/utility ile cursor-pointer atanmış custom öğeleri de eldiven yap
      return style.cursor === "pointer";
    };

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;

      const el = document.elementFromPoint(x, y);
      setHovering(isHoverable(el));
      setHandMode(isClickable(el));
      if (reducedMotion) {
        rx = x; ry = y;
        dot.style.transform = `translate(${rx - 4}px, ${ry - 4}px)`;
        ring.style.transform = `translate(${rx - 12}px, ${ry - 12}px)`;
      }
    };

    const loop = () => {
      if (!reducedMotion) {
        // İnterpolasyon: ring geriden gelsin, dot doğrudan gider
        rx += (x - rx) * 0.18;
        ry += (y - ry) * 0.18;
        dot.style.transform = `translate(${x - 4}px, ${y - 4}px)`;
        ring.style.transform = `translate(${rx - 12}px, ${ry - 12}px)`;
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);

    document.body.style.cursor = "none";
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.body.style.cursor = "";
    };
  }, [reducedMotion]);

  return (
    <>
      <style jsx>{`
        .cursor-root {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 9999;
          mix-blend-mode: normal;
        }
        /* Ok (arrow) imleç: kırık beyaz iskelet + hafif gölge */
        .cursor-arrow {
          position: fixed;
          left: 0;
          top: 0;
          width: 24px;
          height: 24px;
          transform: translate(-9999px, -9999px);
          will-change: transform, opacity, filter;
          opacity: 0.95;
          filter: drop-shadow(0 0 2px rgba(0,0,0,.45));
        }
        .cursor-arrow svg {
          display: block;
        }
        .cursor-arrow .shaft {
          fill: #ededed; /* kırık beyaz gövde */
          transition: transform .12s ease;
          transform-origin: 4px 4px; /* ok ucu referansı */
        }
        .cursor-arrow .edge {
          fill: #dcdcdc; /* hafif koyu kenar */
          transition: opacity .12s ease;
        }
        /* Eldiven modu: ok çekilip el simgesine dönüşür (stilize glove) */
        .cursor-hand {
          position: fixed;
          left: 0; top: 0;
          width: 24px; height: 24px;
          transform: translate(-9999px, -9999px);
          will-change: transform, opacity, filter;
          opacity: 0.98;
          filter: drop-shadow(0 0 2px rgba(0,0,0,.45));
        }
        .cursor-hand svg { display:block; }
        .cursor-hand .hand-base { fill: #ededed; }
        .cursor-hand .hand-edge { fill: #dcdcdc; opacity: .9; }
        /* Hover aura – ok etrafında minimal mistik ışıma */
        .cursor-aura {
          position: fixed;
          left: 0;
          top: 0;
          width: 22px;
          height: 22px;
          transform: translate(-9999px, -9999px);
          will-change: transform, opacity, box-shadow, background;
          pointer-events: none;
          border-radius: 10px;
          opacity: 0.30;
          box-shadow:
            0 0 14px color-mix(in oklab, var(--accent-cyan) 22%, transparent),
            0 0 8px color-mix(in oklab, var(--accent-lime) 14%, transparent) inset;
          background:
            radial-gradient(40% 40% at 50% 50%, rgba(237,237,237,0.22), transparent 70%);
          transition: opacity .18s ease, width .15s ease, height .15s ease, border-radius .15s ease;
        }
        .hovering .cursor-aura {
          opacity: 0.45;
          width: 26px;
          height: 26px;
          border-radius: 12px;
        }
        @media (pointer: coarse) {
          .cursor-root { display: none; }
        }
      `}</style>
      <div className={`cursor-root${hovering ? " hovering" : ""}`}>
        {/* Aura */}
        <div ref={ringRef} className="cursor-aura" />
        {/* Arrow or Hand depending on context */}
        {!handMode ? (
          <div ref={dotRef} className="cursor-arrow" aria-hidden>
            {/* 24x24 viewBox, ok ucu (uç noktası sol üst) olacak şekilde yön verildi */}
            <svg width="24" height="24" viewBox="0 0 24 24">
              {/* Gövde (shaft) */}
              <path className="shaft" d="M3 3 L12 8 L9 9 L14.5 18 L12.5 19 L7 10 L4.5 12 Z" />
              {/* Kenar (edge/highlight) */}
              <path className="edge" d="M3 3 L4.5 12 L7 10 L3 3 Z" />
            </svg>
          </div>
        ) : (
          <div ref={dotRef} className="cursor-hand" aria-hidden>
            {/* Stilize eldiven/hand pointer (24x24) */}
            <svg width="24" height="24" viewBox="0 0 24 24">
              {/* Başparmak ve avuç şekli (basitleştirilmiş) */}
              <path className="hand-base" d="M7 8 C7 6.9 8.1 6 9.2 6 H10.2 V10 H11.8 V6.5 C11.8 5.67 12.47 5 13.3 5 14.13 5 14.8 5.67 14.8 6.5 V10 H16.3 V6.9 C16.3 6.07 16.97 5.4 17.8 5.4 18.63 5.4 19.3 6.07 19.3 6.9 V11.5 C19.3 12.3 19.08 13.07 18.67 13.73 L16.7 16.9 C15.9 18.2 14.47 19 12.95 19 H10.5 C8.57 19 7 17.43 7 15.5 V8 Z" />
              {/* Kenar vurguları */}
              <path className="hand-edge" d="M10.2 10 L11.8 10 L11.8 11.2 L10.2 11.2 Z M14.8 10 L16.3 10 L16.3 11.2 L14.8 11.2 Z" />
            </svg>
          </div>
        )}
      </div>
    </>
  );
}
