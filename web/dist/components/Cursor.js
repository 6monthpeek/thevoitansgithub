"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Cursor;
const react_1 = require("react");
/**
 * Cursor effect – exact replica of advanced.team cursor-effect.html.
 * No trailing artifacts, cleans up on unmount, and reuses existing elements
 * if the component is hot‑reloaded.
 */
function Cursor() {
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
        if (!document.getElementById('advanced-cursor-style')) {
            const style = document.createElement('style');
            style.id = 'advanced-cursor-style';
            style.textContent = `
        .v-cursor {
          position: fixed;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 9999;
          mix-blend-mode: difference;
          transform: translate3d(0,0,0);
        }
        .v-cursor__inner {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: white;
          transform: translate(-50%, -50%);
          transition: width 0.2s, height 0.2s;
        }
        .v-cursor__link-315 {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .v-cursor__link-315 svg {
          width: 40px;
          height: 28px;
        }
        .v-cursor__link-315 svg path {
          stroke: white;
          stroke-width: 2;
          fill: none;
        }
        .v-scroll-line {
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 1px;
          height: 100px;
          background-color: rgba(255,255,255,0.2);
          transform: translateX(-50%);
        }
        .v-scroll-line__progress {
          width: 100%;
          height: 0;
          background-color: white;
          transform-origin: bottom;
        }
      `;
            document.head.appendChild(style);
        }
        // -----------------------------------------------------------------
        // Hide the default cursor (only once)
        // -----------------------------------------------------------------
        if (!document.getElementById('advanced-hide-cursor')) {
            const hide = document.createElement('style');
            hide.id = 'advanced-hide-cursor';
            hide.textContent = `
        * { cursor: none !important; }
        @media (pointer: coarse) { * { cursor: auto !important; } }
      `;
            document.head.appendChild(hide);
            document.body.style.cursor = 'none';
        }
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
        document.addEventListener('mousemove', onMouseMove);
        window.addEventListener('scroll', onScroll);
        animate();
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
        // Cleanup on component unmount
        // -----------------------------------------------------------------
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('scroll', onScroll);
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
        };
    }, []);
    // No JSX needed – cursor is injected directly into the DOM.
    return null;
}
