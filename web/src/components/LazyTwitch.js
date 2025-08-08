"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
function buildTwitchSrc(opts) {
    const channel = opts.channel || process.env.NEXT_PUBLIC_TWITCH_CHANNEL || "thevoitans";
    const envParents = (process.env.NEXT_PUBLIC_TWITCH_PARENTS || "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
    const baseParents = (opts.parents && opts.parents.length ? opts.parents : envParents);
    const parents = (baseParents && baseParents.length ? baseParents : ["localhost"]);
    const parentParams = parents.map((p) => `parent=${encodeURIComponent(p)}`).join("&");
    const type = opts.type || "player";
    if (type === "chat") {
        return `https://www.twitch.tv/embed/${encodeURIComponent(channel)}/chat?${parentParams}`;
    }
    return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&${parentParams}`;
}
function LazyTwitch({ channel, type = "player", className, title, parents }) {
    const ref = (0, react_1.useRef)(null);
    const [visible, setVisible] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const el = ref.current;
        if (!el)
            return;
        if (typeof IntersectionObserver === "undefined") {
            setVisible(true);
            return;
        }
        const io = new IntersectionObserver((entries) => {
            const e = entries[0];
            if (e?.isIntersecting) {
                setVisible(true);
                io.disconnect();
            }
        }, { rootMargin: "120px" });
        io.observe(el);
        return () => io.disconnect();
    }, []);
    const src = buildTwitchSrc({ channel, type, parents });
    return ((0, jsx_runtime_1.jsx)("div", { ref: ref, className: className, children: !visible ? ((0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 rounded-xl border border-white/10 bg-white/[0.03] grid place-items-center text-zinc-400", children: "\u0130\u00E7erik y\u00FCkleniyor\u2026" })) : ((0, jsx_runtime_1.jsx)("iframe", { title: title || (type === "chat" ? "Twitch Chat" : "Twitch Player"), className: "absolute inset-0 w-full h-full rounded-xl border border-white/10 bg-black", src: src, allowFullScreen: true, loading: "lazy" })) }));
}
exports.default = LazyTwitch;
