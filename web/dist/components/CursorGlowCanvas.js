"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CursorGlowCanvas;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * CursorGlowCanvas
 * advanced.team benzeri canvas 2D tabanlı kursor halo trail efekti.
 * - Daha belirgin, dinamik ve renkli halo trail
 * - Additive blend (lighter) ile birden fazla radial ışık katmanı
 * - Yumuşak fade ile iz efekti (afterimage)
 * - DPR ölçekleme ve resize guard
 * - prefers-reduced-motion desteği
 *
 * Kullanım:
 *   <CursorGlowCanvas />
 * position: absolute/fixed katman olarak, içerik altında/üstünde kullanılabilir.
 */
const react_1 = require("react");
function CursorGlowCanvas({ zIndex = 1, opacity = 0.85, fadeSpeed = 0.04, // Daha yavaş fade için daha düşük değer
baseRadius = 180, // Biraz daha büyük bir taban yarıçap
coreColor = "rgba(147, 51, 234, 0.7)", // Mor-ekşi (zincir)
midColor = "rgba(59, 130, 246, 0.5)", // Mavi (ana)
outerColor = "rgba(16, 185, 129, 0.3)", // Yeşil-çam (dış)
trailIntensity = 1.0, followSharpness = 0.12, // Orta-yüksek keskinlik
pointerLock = false, }) {
    const canvasRef = (0, react_1.useRef)(null);
    const rafRef = (0, react_1.useRef)(null);
    const stateRef = (0, react_1.useRef)({
        dpr: 1,
        w: 0,
        h: 0,
        // target ve current pointer pozisyonları (lerp için)
        tx: 0,
        ty: 0,
        x: 0,
        y: 0,
        reduced: false,
        running: false,
        // Trail için önceki pozisyonlar
        trail: [],
    });
    (0, react_1.useEffect)(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const prefersReduced = typeof window !== "undefined" &&
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const s = stateRef.current;
        s.reduced = prefersReduced;
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx)
            return;
        // Ölçüleri ayarla
        function resize() {
            if (!canvas || !ctx)
                return;
            const { innerWidth, innerHeight, devicePixelRatio } = window;
            s.dpr = Math.max(1, Math.min(2, devicePixelRatio || 1));
            s.w = innerWidth;
            s.h = innerHeight;
            canvas.style.width = innerWidth + "px";
            canvas.style.height = innerHeight + "px";
            canvas.width = Math.floor(innerWidth * s.dpr);
            canvas.height = Math.floor(innerHeight * s.dpr);
            ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
        }
        resize();
        window.addEventListener("resize", resize);
        // Başlangıç pozisyonu ekran merkezi
        s.tx = s.x = s.w / 2;
        s.ty = s.y = s.h / 2;
        s.trail = []; // Trail'i sıfırla
        // Fare hareketi
        function onMove(e) {
            s.tx = e.clientX;
            s.ty = e.clientY;
        }
        window.addEventListener("mousemove", onMove, { passive: true });
        // Pointer lock opsiyonel
        function onPointer(e) {
            if (!pointerLock || !canvas)
                return;
            if (document.pointerLockElement === canvas) {
                s.tx = Math.max(0, Math.min(s.w, s.tx + e.movementX));
                s.ty = Math.max(0, Math.min(s.h, s.ty + e.movementY));
            }
        }
        window.addEventListener("pointermove", onPointer, { passive: true });
        function drawFrame() {
            // ctx/ölçü guard
            if (!ctx)
                return;
            // Fade ile önceki frame'i yumuşat (afterimage)
            ctx.save();
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = `rgba(10, 10, 20, ${fadeSpeed})`; // Daha koyu bir arka plan rengi için fade
            ctx.fillRect(0, 0, s.w, s.h);
            ctx.restore();
            // Reduced motion ise sadece basit bir halo
            if (s.reduced) {
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                radialGradient(ctx, s.x, s.y, baseRadius * 0.7, coreColor, midColor, outerColor);
                ctx.restore();
                rafRef.current = requestAnimationFrame(drawFrame);
                return;
            }
            // Pointer pozisyonunu takip (lerp)
            s.x += (s.tx - s.x) * followSharpness;
            s.y += (s.ty - s.y) * followSharpness;
            // Trail güncelleme ve çizimi
            if (trailIntensity > 0) {
                s.trail.push({ x: s.x, y: s.y, life: 1.0 });
                if (s.trail.length > 15) { // Maksimum trail uzunluğu
                    s.trail.shift();
                }
                s.trail.forEach((point, index) => {
                    point.life -= 0.05 * trailIntensity; // Hızlı yaşlanma
                    if (point.life <= 0) {
                        s.trail.splice(index, 1);
                        return;
                    }
                    const trailRadius = baseRadius * (0.2 + 0.6 * point.life);
                    const trailCoreColor = adjustColorAlpha(coreColor, point.life * 0.6);
                    const trailMidColor = adjustColorAlpha(midColor, point.life * 0.4);
                    const trailOuterColor = adjustColorAlpha(outerColor, point.life * 0.2);
                    ctx.save();
                    ctx.globalCompositeOperation = "lighter";
                    radialGradient(ctx, point.x, point.y, trailRadius, trailCoreColor, trailMidColor, trailOuterColor);
                    ctx.restore();
                });
            }
            // Ana halo ve ekstra ışık noktaları
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            // Ana halo (daha belirgin)
            radialGradient(ctx, s.x, s.y, baseRadius, coreColor, midColor, outerColor);
            // Ekstra parlaklık noktası (sağ üst)
            const extraRadius1 = baseRadius * 0.4;
            const offset1X = s.x + baseRadius * 0.4;
            const offset1Y = s.y - baseRadius * 0.4;
            radialGradient(ctx, offset1X, offset1Y, extraRadius1, adjustColorAlpha(coreColor, 0.9), adjustColorAlpha(midColor, 0.7), adjustColorAlpha(outerColor, 0.5));
            // İkinci ekstra parlaklık noktası (sol alt)
            const extraRadius2 = baseRadius * 0.25;
            const offset2X = s.x - baseRadius * 0.5;
            const offset2Y = s.y + baseRadius * 0.3;
            radialGradient(ctx, offset2X, offset2Y, extraRadius2, adjustColorAlpha(coreColor, 0.8), adjustColorAlpha(midColor, 0.6), adjustColorAlpha(outerColor, 0.4));
            ctx.restore();
            rafRef.current = requestAnimationFrame(drawFrame);
        }
        function start() {
            if (s.running)
                return;
            s.running = true;
            rafRef.current = requestAnimationFrame(drawFrame);
        }
        function stop() {
            if (!s.running)
                return;
            s.running = false;
            if (rafRef.current)
                cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        start();
        return () => {
            stop();
            window.removeEventListener("resize", resize);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("pointermove", onPointer);
        };
    }, [fadeSpeed, baseRadius, coreColor, midColor, outerColor, trailIntensity, followSharpness, pointerLock]);
    return ((0, jsx_runtime_1.jsx)("canvas", { ref: canvasRef, "aria-hidden": true, className: "tv-cursor-glow pointer-events-none fixed inset-0", style: { zIndex, opacity } }));
}
// Daha esnek radial gradient fonksiyonu
function radialGradient(ctx, x, y, r, innerColor, midColor, outerColor) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0.0, innerColor);
    g.addColorStop(0.4, midColor); // Orta noktayı biraz içe al
    g.addColorStop(1.0, outerColor);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}
// Sadece alfa kanalını ayarlayan yardımcı fonksiyon
function adjustColorAlpha(rgba, alpha) {
    try {
        const m = rgba.match(/rgba?\(([^)]+)\)/i);
        if (!m)
            return rgba;
        const parts = m[1].split(",").map((s) => s.trim());
        const [rs, gs, bs] = parts;
        // Mevcut alfa'yı yok say ve yeni alfa'yı uygula
        return `rgba(${rs}, ${gs}, ${bs}, ${clamp(alpha, 0, 1)})`;
    }
    catch (_a) {
        return rgba;
    }
}
function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}
