'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocaleSwitcher = LocaleSwitcher;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const react_1 = require("react");
function LocaleSwitcher({ to }) {
    const pathname = (0, navigation_1.usePathname)() || '/';
    const [mounted, setMounted] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => { setMounted(true); }, []);
    // Mevcut /tr veya /en önekini tek sefer sil
    const base = (0, react_1.useMemo)(() => pathname.replace(/^\/(tr|en)(?=\/|$)/, ''), [pathname]);
    const target = (0, react_1.useMemo)(() => {
        const rest = base === '/' ? '' : base;
        return `/${to}${rest}`;
    }, [base, to]);
    // Hydration farkını engellemek için mount öncesi stabil href
    const safeHref = mounted ? target : `/${to}`;
    return ((0, jsx_runtime_1.jsx)(link_1.default, { href: safeHref, prefetch: false, className: 'rounded-full px-3 py-1.5 text-xs border border-white/10 hover:border-white/25 bg-black/20 hover:bg-black/30 transition-colors', children: to.toUpperCase() }));
}
