"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FlameTrailCursor;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
function FlameTrailCursor() {
    const canvasRef = (0, react_1.useRef)(null);
    const particlesRef = (0, react_1.useRef)([]);
    const rafRef = (0, react_1.useRef)(null);
    const [isClient, setIsClient] = (0, react_1.useState)(false); // SSR için
    const mousePosRef = (0, react_1.useRef)({ x: 0, y: 0, prevX: 0, prevY: 0 });
    (0, react_1.useEffect)(() => {
        setIsClient(true); // Sadece client-side'da çalış
        if (!isClient)
            return;
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx)
            return;
        // Canvas boyutunu ayarla
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        // Fare hareketi
        const handleMouseMove = (e) => {
            mousePosRef.current.prevX = mousePosRef.current.x;
            mousePosRef.current.prevY = mousePosRef.current.y;
            mousePosRef.current.x = e.clientX;
            mousePosRef.current.y = e.clientY;
        };
        // Dokunmatik hareket (mobil)
        const handleTouchMove = (e) => {
            if (e.touches.length > 0) {
                mousePosRef.current.prevX = mousePosRef.current.x;
                mousePosRef.current.prevY = mousePosRef.current.y;
                mousePosRef.current.x = e.touches[0].clientX;
                mousePosRef.current.y = e.touches[0].clientY;
            }
        };
        // Partikül oluştur (ok şeklinde)
        const createParticles = (x, y, prevX, prevY) => {
            const dx = x - prevX;
            const dy = y - prevY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            // Okun başı (kalın nokta)
            particlesRef.current.push({
                x,
                y,
                size: Math.random() * 4 + 6, // 6-10px
                speedY: -(Math.random() * 1 + 0.5), // Yukarı
                life: 1.0,
                decay: Math.random() * 0.02 + 0.015, // 0.015-0.035
                vx: Math.cos(angle + Math.PI / 2) * (Math.random() * 0.5 + 0.5), // Yana yayılma
            });
            // Okun gövdesi (ince çizgi)
            for (let i = 1; i < 8; i++) {
                const t = i / 8;
                const px = prevX + dx * t;
                const py = prevY + dy * t;
                particlesRef.current.push({
                    x: px,
                    y: py,
                    size: Math.random() * 2 + 1, // 1-3px
                    speedY: -(Math.random() * 1 + 0.5),
                    life: 1.0,
                    decay: Math.random() * 0.02 + 0.015,
                    vx: Math.cos(angle + Math.PI / 2) * (Math.random() * 0.3 + 0.2),
                });
            }
        };
        // Render döngüsü
        const render = () => {
            if (!ctx || !canvas)
                return;
            // Arka planı temizle (siyah, hafif şeffaflık ile fade efekti için)
            ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Blend modu ayarla (Glow için)
            ctx.globalCompositeOperation = "screen"; // Veya "lighter"
            const { x, y, prevX, prevY } = mousePosRef.current;
            if (x !== 0 || y !== 0) {
                createParticles(x, y, prevX, prevY);
            }
            const particles = particlesRef.current;
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                // Partikülü güncelle
                p.y += p.speedY;
                p.x += p.vx; // Yana hareket
                p.life -= p.decay;
                // Ölü partikülleri temizle
                if (p.life <= 0) {
                    particles.splice(i, 1);
                    continue;
                }
                // Partikülü çiz
                const alpha = p.life;
                // Renk: Turuncudan şeffafa, parlak bir merkez
                const red = 255;
                const green = 147;
                const blue = 41;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
                ctx.fill();
            }
            // Partikül sayısını sınırla (yaklaşık 150)
            if (particles.length > 150) {
                particles.splice(0, particles.length - 150);
            }
            rafRef.current = requestAnimationFrame(render);
        };
        // Olay dinleyicileri ekle
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("touchmove", handleTouchMove, { passive: true });
        // Render döngüsünü başlat
        rafRef.current = requestAnimationFrame(render);
        // Temizlik
        return () => {
            window.removeEventListener("resize", resizeCanvas);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("touchmove", handleTouchMove);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [isClient]); // Sadece client-side'da çalıştığı için bağımlılık listesi boş
    if (!isClient) {
        return null; // SSR sırasında hiçbir şey render etme
    }
    return ((0, jsx_runtime_1.jsx)("canvas", { ref: canvasRef, className: "fixed inset-0 pointer-events-none z-[9999]", style: { mixBlendMode: "screen" } }));
}
