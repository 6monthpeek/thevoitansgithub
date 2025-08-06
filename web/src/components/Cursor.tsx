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
  // Spike mod: tıklanabilir öğe üzerinde hafif agresif ok ucu
  const [spikeMode, setSpikeMode] = useState(false);
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
    let inside = true; // pencere içinde mi?

    const hoverables = ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"];
    const isHoverable = (el: Element | null) =>
      !!el && (hoverables.includes(el.tagName) || (el as HTMLElement).role === "button");
    const isClickable = (el: Element | null) => {
      if (!el) return false;
      const he = el as HTMLElement;
      if (hoverables.includes(el.tagName) || he.role === "button") return true;
      const style = window.getComputedStyle(he);
      // Tailwind/utility ile cursor-pointer atanmış custom öğeleri de clickable say
      return style.cursor === "pointer";
    };

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;

      // Pencere sınırı içinde mi?
      inside = x >= 0 && y >= 0 && x <= window.innerWidth && y <= window.innerHeight;

      const el = inside ? document.elementFromPoint(x, y) : null;
      const hov = isHoverable(el);
      const clk = isClickable(el);
      setHovering(inside && (hov || clk));
      setSpikeMode(inside && clk);
      if (reducedMotion) {
        rx = x; ry = y;
        dot.style.transform = `translate(${rx - 4}px, ${ry - 4}px)`;
        ring.style.transform = `translate(${rx - 12}px, ${ry - 12}px)`;
      }
    };

    const loop = () => {
      // Pencere dışına çıkıldığında tamamen sakla
      if (!inside) {
        dot.style.transform = `translate(-9999px, -9999px)`;
        ring.style.transform = `translate(-9999px, -9999px)`;
      } else if (!reducedMotion) {
        // İnterpolasyon: ring geriden gelsin, dot doğrudan gider
        rx += (x - rx) * 0.18;
        ry += (y - ry) * 0.18;
        dot.style.transform = `translate(${x - 4}px, ${y - 4}px)`;
        ring.style.transform = `translate(${rx - 12}px, ${ry - 12}px)`;
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", () => { inside = false; }, { passive: true });
    window.addEventListener("mouseenter", () => { inside = true; }, { passive: true });
    raf = requestAnimationFrame(loop);

    // Sistem imlecini gizle: tüm tıklanabilir öğelerde de gizle
    const styleEl = document.createElement("style");
    styleEl.setAttribute("data-custom-cursor", "1");
    styleEl.textContent = `
      :root, body, * { cursor: none !important; }
      @media (pointer: coarse) {
        :root, body, * { cursor: auto !important; }
      }
    `;
    document.head.appendChild(styleEl);

    document.body.style.cursor = "none";
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", () => { inside = false; });
      window.removeEventListener("mouseenter", () => { inside = true; });
      document.body.style.cursor = "";
      styleEl.remove();
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
          opacity: 0.96;
          filter: drop-shadow(0 0 2px rgba(0,0,0,.45));
        }
        .cursor-arrow svg {
          display: block;
        }
        .cursor-arrow .shaft {
          fill: #ededed; /* kırık beyaz gövde */
          transition: transform .12s ease, d .12s ease;
          transform-origin: 4px 4px; /* ok ucu referansı */
        }
        .cursor-arrow .edge {
          fill: #dcdcdc; /* hafif koyu kenar */
          transition: opacity .12s ease;
        }
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
          transition: opacity .18s ease, width .15s ease, height .15s ease, border-radius .15s ease, box-shadow .18s ease, background .18s ease;
        }
        .hovering .cursor-aura {
          opacity: 0.48;
          width: 26px;
          height: 26px;
          border-radius: 12px;
          box-shadow:
            0 0 18px color-mix(in oklab, var(--accent-cyan) 28%, transparent),
            0 0 10px color-mix(in oklab, var(--accent-lime) 18%, transparent) inset;
          background:
            radial-gradient(35% 35% at 50% 50%, rgba(255,255,255,0.22), transparent 70%),
            radial-gradient(80% 80% at 50% 50%, rgba(53,180,255,0.10), transparent 80%);
        }
        .spike .cursor-arrow .shaft {
          /* Spike hissi için hafif uzama/gerginlik */
          transform: scale(1.06) translate(0.3px, -0.2px);
        }
        @media (pointer: coarse) {
          .cursor-root { display: none; }
        }
      `}</style>
      <div className={`cursor-root${hovering ? " hovering" : ""}${spikeMode ? " spike" : ""}`}>
        {/* Aura */}
        <div ref={ringRef} className="cursor-aura" />
        {/* Arrow always (spike mode anim ile) */}
        <div ref={dotRef} className="cursor-arrow" aria-hidden>
          {/* 24x24 viewBox, ok ucu (uç noktası sol üst) olacak şekilde yön verildi */}
          <svg width="24" height="24" viewBox="0 0 24 24">
            {/* Gövde (shaft) */}
            <path className="shaft" d="M3 3 L12 8 L9 9 L14.5 18 L12.5 19 L7 10 L4.5 12 Z" />
            {/* Kenar (edge/highlight) */}
            <path className="edge" d="M3 3 L4.5 12 L7 10 L3 3 Z" />
          </svg>
        </div>
      </div>
    </>
  );
}
