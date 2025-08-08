"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WebGLFluidCursor;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
function WebGLFluidCursor() {
    const iframeRef = (0, react_1.useRef)(null);
    const [isClient, setIsClient] = (0, react_1.useState)(false); // SSR için
    (0, react_1.useEffect)(() => {
        setIsClient(true); // Sadece client-side'da çalış
    }, []);
    if (!isClient) {
        return null; // SSR sırasında hiçbir şey render etme
    }
    return ((0, jsx_runtime_1.jsx)("iframe", { ref: iframeRef, src: "/flame-trail-demo/index.html", className: "fixed inset-0 w-full h-full pointer-events-none z-[9999]", title: "WebGL Fluid Cursor Effect", style: { border: "none" } }));
}
