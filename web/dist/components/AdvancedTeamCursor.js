"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdvancedTeamCursor;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
function AdvancedTeamCursor() {
    const canvasRef = (0, react_1.useRef)(null);
    const mousePosRef = (0, react_1.useRef)({ x: 0, y: 0 });
    const particlesRef = (0, react_1.useRef)([]);
    const rafRef = (0, react_1.useRef)(0);
    const mouseSpeedRef = (0, react_1.useRef)(0);
    (0, react_1.useEffect)(() => {
        // -----------------------------------------------------------------
        // Ensure a single cursor element exists (prevents duplicates on hot reload)
        // -----------------------------------------------------------------
        let cursor = document.querySelector('.v-cursor');
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.className = 'v-cursor';
            const inner = document.createElement('div');
            inner.className = 'v-cursor__inner';
            cursor.appendChild(inner);
            const link = document.createElement('div');
            link.className = 'v-cursor__link-315';
            link.innerHTML = `
      <svg viewBox="0 0 41 29" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0.0415039 14.2427C0.0415039 14.2427 21.0732 14.2427 40.0415 14.2427M40.0415 14.2427C26.3389 14.2427 23.8096 28.2427 23.8096 28.2427M40.0415 14.2427C26.3389 14.2427 23.8096 0.242677 23.8096 0.242677" stroke="white" stroke-width="2"/>
      </svg>
    `;
            cursor.appendChild(link);
            const scroll = document.createElement('div');
            scroll.className = 'v-scroll-line';
            const progress = document.createElement('div');
            progress.className = 'v-scroll-line__progress';
            scroll.appendChild(progress);
            cursor.appendChild(scroll);
            document.body.appendChild(cursor);
        }
        // -----------------------------------------------------------------
        // Inject CSS (only once)
        // -----------------------------------------------------------------
        // -----------------------------------------------------------------
        // Hide the default cursor (only once)
        // -----------------------------------------------------------------
        // -----------------------------------------------------------------
        // State & animation
        // -----------------------------------------------------------------
        let mouseX = 0, mouseY = 0, cursorX = 0, cursorY = 0;
        const lerp = (a, b, t) => a * (1 - t) + b * t;
        const onMouseMove = (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };
        const onScroll = () => {
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const ratio = scrollHeight ? window.scrollY / scrollHeight : 0;
            const progress = document.querySelector('.v-scroll-line__progress');
            if (progress)
                progress.style.transform = `scaleY(${ratio})`;
        };
        const animate = () => {
            cursorX = lerp(cursorX, mouseX, 0.1);
            cursorY = lerp(cursorY, mouseY, 0.1);
            if (cursor) {
                cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
            }
            requestAnimationFrame(animate);
        };
        // -----------------------------------------------------------------
        // Link hover handling (elements with class .link-hover)
        // -----------------------------------------------------------------
        const hoverIn = () => {
            const inner = cursor === null || cursor === void 0 ? void 0 : cursor.querySelector('.v-cursor__inner');
            const link = cursor === null || cursor === void 0 ? void 0 : cursor.querySelector('.v-cursor__link-315');
            if (inner) {
                inner.style.width = '0';
                inner.style.height = '0';
            }
            if (link)
                link.style.opacity = '1';
        };
        const hoverOut = () => {
            const inner = cursor === null || cursor === void 0 ? void 0 : cursor.querySelector('.v-cursor__inner');
            const link = cursor === null || cursor === void 0 ? void 0 : cursor.querySelector('.v-cursor__link-315');
            if (inner) {
                inner.style.width = '8px';
                inner.style.height = '8px';
            }
            if (link)
                link.style.opacity = '0';
        };
        const linkElements = document.querySelectorAll('.link-hover');
        linkElements.forEach(el => {
            el.addEventListener('mouseenter', hoverIn);
            el.addEventListener('mouseleave', hoverOut);
        });
        // -----------------------------------------------------------------
        // Particle system
        // -----------------------------------------------------------------
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return;
        // Canvas boyutunu ayarla
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        // Mouse hareketi
        const handleMouseMove = (e) => {
            const newX = e.clientX;
            const newY = e.clientY;
            // Hızı hesapla
            const dx = newX - mousePosRef.current.x;
            const dy = newY - mousePosRef.current.y;
            mouseSpeedRef.current = Math.sqrt(dx * dx + dy * dy) * 0.0003;
            mousePosRef.current = { x: newX, y: newY };
        };
        window.addEventListener("mousemove", handleMouseMove);
        // Render döngüsü
        const render = () => {
            if (!ctx)
                return;
            // Canvas'ı çok yavaş temizle (advanced.team'deki gibi)
            ctx.fillStyle = "rgba(0, 0, 0, 0.0005)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Blend mode ayarla
            ctx.globalCompositeOperation = "screen";
            // Mouse pozisyonunda particle oluştur
            const { x, y } = mousePosRef.current;
            const speed = mouseSpeedRef.current;
            // Hızına göre particle sayısı (çok minimal)
            const count = speed > 0.001 ? 1 : 0;
            if (count > 0 && particlesRef.current.length < 8) {
                const size = Math.random() * 55 + 45;
                particlesRef.current.push({
                    x: x,
                    y: y,
                    size: size,
                    speedX: (Math.random() - 0.5) * 0.8,
                    speedY: (Math.random() - 0.5) * 0.8 - Math.random() * 0.4,
                    life: 1,
                    decay: Math.random() * 0.0005 + 0.00002,
                });
            }
            // Particle'ları güncelle ve çiz
            for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                const particle = particlesRef.current[i];
                // Particle'ı güncelle
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                particle.life -= particle.decay;
                particle.size *= 0.78;
                // Fiziksel etkiler
                particle.speedY += 0.008; // Çok hafif yerçekimi
                particle.speedX *= 0.8; // Çok hafif sürtünme
                particle.speedY *= 0.8;
                // Ölü particle'ları kaldır
                if (particle.life <= 0 || particle.size <= 1) {
                    particlesRef.current.splice(i, 1);
                    continue;
                }
                // Particle'ı çiz (gradient ile - advanced.team'deki gibi)
                const alpha = Math.min(particle.life * 0.9995, 0.999);
                const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 0.12);
                gradient.addColorStop(0, `rgba(53, 180, 255, ${alpha})`); // Merkez - parlak
                gradient.addColorStop(0.01, `rgba(53, 180, 255, ${alpha * 0.99})`); // Çok çok iç
                gradient.addColorStop(0.03, `rgba(53, 180, 255, ${alpha * 0.95})`); // Çok iç
                gradient.addColorStop(0.07, `rgba(53, 180, 255, ${alpha * 0.85})`); // İç
                gradient.addColorStop(0.15, `rgba(53, 180, 255, ${alpha * 0.6})`); // Orta iç
                gradient.addColorStop(0.3, `rgba(53, 180, 255, ${alpha * 0.3})`); // Orta
                gradient.addColorStop(0.5, `rgba(53, 180, 255, ${alpha * 0.1})`); // Dış
                gradient.addColorStop(0.7, `rgba(53, 180, 255, ${alpha * 0.04})`); // Çok dış
                gradient.addColorStop(0.85, `rgba(53, 180, 255, ${alpha * 0.01})`); // Neredeyse şeffaf
                gradient.addColorStop(0.95, `rgba(53, 180, 255, ${alpha * 0.005})`); // Çok neredeyse şeffaf
                gradient.addColorStop(0.99, `rgba(53, 180, 255, ${alpha * 0.001})`); // Nerdeyse görünmez
                gradient.addColorStop(1, `rgba(53, 180, 255, 0)`); // Şeffaf
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
            }
            rafRef.current = requestAnimationFrame(render);
        };
        rafRef.current = requestAnimationFrame(render);
        // -----------------------------------------------------------------
        // Cleanup on component unmount
        // -----------------------------------------------------------------
        return () => {
            linkElements.forEach(el => {
                el.removeEventListener('mouseenter', hoverIn);
                el.removeEventListener('mouseleave', hoverOut);
            });
            if (cursor && cursor.parentNode) {
                cursor.parentNode.removeChild(cursor);
            }
            const style = document.getElementById('advanced-cursor-style');
            if (style && style.parentNode)
                style.parentNode.removeChild(style);
            const hide = document.getElementById('advanced-hide-cursor');
            if (hide && hide.parentNode)
                hide.parentNode.removeChild(hide);
            document.body.style.cursor = '';
            window.removeEventListener("resize", resizeCanvas);
            window.removeEventListener("mousemove", handleMouseMove);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);
    return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)("canvas", { ref: canvasRef, style: { position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 9998 } }) }));
}
