"use client";
"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = cn;
exports.Panel = Panel;
exports.NeonButton = NeonButton;
exports.Badge = Badge;
exports.SectionHeader = SectionHeader;
exports.PaginationCapsule = PaginationCapsule;
exports.RoleDot = RoleDot;
exports.Parallax = Parallax;
exports.ParallaxLayer = ParallaxLayer;
exports.LiquidLoader = LiquidLoader;
const jsx_runtime_1 = require("react/jsx-runtime");
// framer-motion'u dinamik ve koşullu (reduced-motion uyumlu) yükle
const dynamic_1 = __importDefault(require("next/dynamic"));
const MotionDiv = (0, dynamic_1.default)(() => import("framer-motion").then((m) => m.motion.div), { ssr: false, loading: () => (0, jsx_runtime_1.jsx)("div", {}) });
/* Utility */
function cn(...inputs) {
    return inputs.filter(Boolean).join(" ");
}
/* Panel - glassmorphism + hairline */
function Panel({ className, children, }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: cn(
        // Sade panel: tek hairline, hafif blur ve düşük gölge
        "rounded-2xl border border-white/10", "bg-black/30 backdrop-blur-[2px]", "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]", className), children: children }));
}
/* NeonButton - primary/outline */
function NeonButton(_a) {
    var { children, size = "md", variant = "primary", className } = _a, props = __rest(_a, ["children", "size", "variant", "className"]);
    // Ölçek: md h-11 (44px), lg h-12 (48px)
    const sizes = size === "lg"
        ? "h-12 px-5 text-[17px]"
        : "h-11 px-4 text-base";
    const base = "inline-flex items-center justify-center gap-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 " +
        sizes;
    if (variant === "outline") {
        return ((0, jsx_runtime_1.jsx)("button", Object.assign({}, props, { className: cn(base, "border border-white/10 text-zinc-200 hover:border-white/20 hover:bg-white/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)]", className), children: children })));
    }
    return ((0, jsx_runtime_1.jsx)("button", Object.assign({}, props, { className: cn(base, "font-semibold text-black bg-[color:var(--accent-cyan)] hover:bg-[#57dbff] shadow-[0_5px_14px_rgba(57,208,255,.15)]", className), children: children })));
}
/* Badge - small capsule */
function Badge({ children, className, }) {
    return ((0, jsx_runtime_1.jsx)("span", { className: cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] leading-4 tracking-tight", "bg-white/5 border border-white/10 text-zinc-300", "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]", className), children: children }));
}
/* Section header */
function SectionHeader({ title, subtitle, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "mb-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "display text-2xl font-semibold tracking-tight", children: title }), subtitle ? ((0, jsx_runtime_1.jsx)("p", { className: "text-zinc-400 mt-1 max-w-2xl", children: subtitle })) : null] }));
}
/* PaginationCapsule - previous/next with page indicator */
function PaginationCapsule({ page, totalPages, onPrev, onNext, size = "md", }) {
    const btnSize = size === "lg" ? "h-12 px-5 text-[17px]" : "h-11 px-4 text-base";
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-center gap-3 mt-6 text-sm text-zinc-300", children: [(0, jsx_runtime_1.jsx)("button", { onClick: onPrev, disabled: page <= 1, className: cn("rounded-full border border-white/10 disabled:opacity-40 hover:border-white/20 hover:bg-white/5 transition-colors", btnSize), children: "\u00D6nceki" }), (0, jsx_runtime_1.jsxs)("span", { className: "px-2 text-zinc-400", children: ["Sayfa ", page, " / ", totalPages] }), (0, jsx_runtime_1.jsx)("button", { onClick: onNext, disabled: page >= totalPages, className: cn("rounded-full border border-white/10 disabled:opacity-40 hover:border-white/20 hover:bg-white/5 transition-colors", btnSize), children: "Sonraki" })] }));
}
/* RoleDot - tiny colored dot */
function RoleDot({ role }) {
    const color = role === "Tank" ? "bg-cyan-400" : role === "Healer" ? "bg-lime-400" : "bg-pink-500";
    return (0, jsx_runtime_1.jsx)("span", { className: cn("size-2 rounded-full", color) });
}
/* Motion preference hook (prefers-reduced-motion) */
function usePrefersReducedMotion() {
    if (typeof window === "undefined")
        return false;
    try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    catch (_a) {
        return false;
    }
}
/* Parallax container + layer */
function Parallax({ className, children, }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: cn("relative overflow-hidden will-change-transform", className), children: children }));
}
function ParallaxLayer({ depth = 10, children, className, }) {
    // Reduced motion tercihinde parallax devre dışı (erişilebilirlik)
    const reduced = usePrefersReducedMotion();
    // Lightweight mouse parallax with throttling for 60fps
    let raf = 0;
    const handleMove = (e) => {
        if (reduced)
            return;
        if (raf)
            return;
        raf = requestAnimationFrame(() => {
            const t = e.currentTarget.getBoundingClientRect();
            const cx = t.left + t.width / 2;
            const cy = t.top + t.height / 2;
            const dx = (e.clientX - cx) / t.width;
            const dy = (e.clientY - cy) / t.height;
            const tx = -(dx * depth);
            const ty = -(dy * depth);
            e.currentTarget.style.setProperty("transform", `translate3d(${tx}px, ${ty}px, 0)`);
            raf = 0;
        });
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: cn("absolute inset-0", className), onMouseMove: handleMove, onMouseLeave: (e) => {
            e.currentTarget.style.setProperty("transform", "translate3d(0,0,0)");
        }, style: {
            transition: reduced ? "none" : "transform .3s ease",
            willChange: reduced ? "auto" : "transform",
        }, "aria-hidden": reduced ? true : undefined, children: children }));
}
/* Liquid Loader */
function LiquidLoader({ show, }) {
    if (!show)
        return null;
    const reduced = usePrefersReducedMotion();
    // Reduced motion: statik ve düşük görsel gürültü ile degrade
    if (reduced) {
        return ((0, jsx_runtime_1.jsxs)("div", { role: "status", "aria-live": "polite", className: "fixed inset-0 z-[9999] grid place-items-center bg-[radial-gradient(600px_400px_at_50%_40%,rgba(57,208,255,.06),transparent_60%)]", children: [(0, jsx_runtime_1.jsx)("div", { className: "size-16 rounded-full", style: {
                        boxShadow: "inset 0 0 28px rgba(57,208,255,.35), 0 0 40px rgba(57,208,255,.18)",
                        background: "radial-gradient(closest-side, rgba(57,208,255,.45), rgba(255,77,157,.35))",
                        filter: "blur(1.5px)",
                    } }), (0, jsx_runtime_1.jsx)("span", { className: "sr-only", children: "Y\u00FCkleniyor\u2026" })] }));
    }
    // Normal durumda framer-motion bileşenini dinamik (client-only) kullan
    return ((0, jsx_runtime_1.jsx)(MotionDiv, { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-[9999] grid place-items-center bg-[radial-gradient(600px_400px_at_50%_40%,rgba(57,208,255,.08),transparent_60%)]", children: (0, jsx_runtime_1.jsx)(MotionDiv, { className: "size-24 rounded-full", style: {
                boxShadow: "inset 0 0 40px rgba(57,208,255,.4), 0 0 80px rgba(57,208,255,.25)",
                background: "radial-gradient(closest-side, rgba(57,208,255,.6), rgba(255,77,157,.5))",
                filter: "blur(2px)",
            }, animate: {
                borderRadius: [
                    "30% 70% 65% 35% / 30% 30% 70% 70%",
                    "50% 50% 50% 50%",
                    "70% 30% 35% 65% / 60% 60% 40% 40%",
                ],
            }, transition: {
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
                repeatType: "mirror",
            } }) }));
}
