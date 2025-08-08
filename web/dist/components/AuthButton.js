"use client";
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AuthButton;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_2 = require("next-auth/react");
const react_3 = require("next-auth/react");
function RolesPreview({ userRoles, discordRoleIds }) {
    const [nameMap, setNameMap] = (0, react_1.useState)({});
    (0, react_1.useEffect)(() => {
        let alive = true;
        (() => __awaiter(this, void 0, void 0, function* () {
            try {
                // Önce window cache
                const cached = (typeof window !== "undefined" && window.__ROLE_NAME_CACHE__) || null;
                if (cached === null || cached === void 0 ? void 0 : cached.roles) {
                    setNameMap(cached.roles);
                }
                // Sunucudan map çek
                const r = yield fetch("/api/resolve/roles", { cache: "no-store" });
                if (!alive)
                    return;
                const j = yield r.json().catch(() => ({}));
                const rolesObj = (j === null || j === void 0 ? void 0 : j.roles) ||
                    (Array.isArray(j)
                        ? Object.fromEntries(j.map((x) => { var _a, _b; return [String((_a = x === null || x === void 0 ? void 0 : x.id) !== null && _a !== void 0 ? _a : ""), String((_b = x === null || x === void 0 ? void 0 : x.name) !== null && _b !== void 0 ? _b : "")]; }))
                        : {});
                if (rolesObj && typeof rolesObj === "object") {
                    setNameMap(rolesObj);
                    if (typeof window !== "undefined") {
                        window.__ROLE_NAME_CACHE__ = { roles: rolesObj };
                    }
                }
            }
            catch (_a) { }
        }))();
        return () => {
            alive = false;
        };
    }, []);
    const hasUserRoles = Array.isArray(userRoles) && userRoles.length > 0;
    const hasIds = Array.isArray(discordRoleIds) && discordRoleIds.length > 0;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "mt-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[11px] text-zinc-400 mb-1", children: "Roller" }), hasUserRoles ? ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-1.5", children: userRoles.slice(0, 6).map((r) => {
                    var _a;
                    const hex = r.hex || `#${((_a = r.color) !== null && _a !== void 0 ? _a : 0).toString(16).padStart(6, "0")}`;
                    const label = r.name || nameMap[String(r.id)] || r.id;
                    return ((0, jsx_runtime_1.jsx)("span", { className: "text-[10px] px-2 py-0.5 rounded-full border", style: { borderColor: `${hex}55`, background: `${hex}22`, color: "#e5e7eb" }, title: label, children: label }, r.id));
                }) })) : hasIds ? ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-1.5", children: discordRoleIds.slice(0, 6).map((rid) => {
                    const label = nameMap[String(rid)] || `#${rid}`;
                    return ((0, jsx_runtime_1.jsx)("span", { className: "text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-zinc-200", title: String(rid), children: label }, rid));
                }) })) : ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "h-4 w-16 rounded-full bg-white/5 border border-white/10 animate-pulse" }), (0, jsx_runtime_1.jsx)("span", { className: "h-4 w-10 rounded-full bg-white/5 border border-white/10 animate-pulse" })] }))] }));
}
function AuthButton() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const { data, status } = (0, react_3.useSession)();
    const loading = status === "loading";
    const user = data === null || data === void 0 ? void 0 : data.user;
    // Officer rol kontrolü (ENV veya sabit ID)
    const SENIOR_OFFICER_ROLE_ID = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SENIOR_OFFICER_ROLE_ID) ||
        (typeof process !== "undefined" && process.env.SENIOR_OFFICER_ROLE_ID) ||
        "1249512318929342505";
    // Eldeki iki kaynak:
    // - session.user.guildMember.roles (detaylı obje listesi)
    // - session.user.discordRoles (sadece ID dizisi) -> auth.ts session callback'te hydrate edilir
    const discordRoleIds = ((_a = data === null || data === void 0 ? void 0 : data.user) === null || _a === void 0 ? void 0 : _a.discordRoles) && Array.isArray(data.user.discordRoles)
        ? data.user.discordRoles
        : [];
    const isOfficer = (Array.isArray((_b = user === null || user === void 0 ? void 0 : user.guildMember) === null || _b === void 0 ? void 0 : _b.roles) &&
        user.guildMember.roles.some((r) => String(r.id) === String(SENIOR_OFFICER_ROLE_ID))) ||
        (Array.isArray(discordRoleIds) && discordRoleIds.includes(String(SENIOR_OFFICER_ROLE_ID)));
    // outside-click controlled popover
    const [open, setOpen] = (0, react_1.useState)(false);
    const ref = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const onDoc = (e) => {
            if (!ref.current)
                return;
            if (!ref.current.contains(e.target))
                setOpen(false);
        };
        const onEsc = (e) => {
            if (e.key === "Escape")
                setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("keydown", onEsc);
        return () => {
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("keydown", onEsc);
        };
    }, [open]);
    if (loading) {
        return ((0, jsx_runtime_1.jsx)("button", { className: "rounded-full px-3 py-1.5 text-xs border border-white/10 text-zinc-300 opacity-70", "aria-busy": "true", disabled: true, children: "Y\u00FCkleniyor\u2026" }));
    }
    if (!user) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "inline-flex items-center gap-2", children: (0, jsx_runtime_1.jsx)("button", { onClick: () => (0, react_2.signIn)("discord", {
                    callbackUrl: typeof window !== "undefined" ? `${window.location.origin}` : "/",
                }), className: "rounded-full px-3 py-1.5 text-xs border border-white/10 text-zinc-300 hover:border-white/20", "aria-label": "Discord ile giri\u015F yap", children: "Giri\u015F Yap" }) }));
    }
    const displayName = user.global_name || user.username || "Discord User";
    const roleHex = ((_c = user.dominantRole) === null || _c === void 0 ? void 0 : _c.hex) ||
        (typeof ((_d = user.dominantRole) === null || _d === void 0 ? void 0 : _d.color) === "number"
            ? `#${user.dominantRole.color.toString(16).padStart(6, "0")}`
            : undefined);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "relative", ref: ref, children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => setOpen((o) => !o), className: "inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-2 py-1 hover:border-white/20", "aria-haspopup": "menu", "aria-expanded": open, title: "Profil", children: [(0, jsx_runtime_1.jsx)("img", { src: user.avatar || "/voitans-logo.svg", alt: displayName, className: "w-6 h-6 rounded-full object-cover", referrerPolicy: "no-referrer" }), (0, jsx_runtime_1.jsx)("span", { className: "text-xs text-zinc-300 max-w-[140px] truncate", children: displayName }), user.isVoitans ? ((0, jsx_runtime_1.jsx)("span", { className: "ml-1 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/30 text-emerald-300 bg-emerald-400/10", title: "Voitans \u00FCyesi", children: "VOITANS" })) : ((0, jsx_runtime_1.jsx)("span", { className: "ml-1 text-[10px] px-2 py-0.5 rounded-full border border-zinc-400/30 text-zinc-300 bg-zinc-400/10", title: "Guild \u00FCyesi de\u011Fil", children: "Misafir" }))] }), open && ((0, jsx_runtime_1.jsxs)("div", { role: "menu", className: "absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-[#0b0f19]/95 backdrop-blur shadow-xl z-50 overflow-hidden", children: [(0, jsx_runtime_1.jsxs)("div", { className: "h-16 relative", style: {
                            background: user.banner
                                ? `url(${user.banner}) center/cover no-repeat`
                                : `linear-gradient(90deg, ${user.accent_color || "#1f2937"}, #0b0f19)`,
                        }, children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 bg-black/30" }), (0, jsx_runtime_1.jsx)("div", { className: "absolute -bottom-5 left-3 w-10 h-10 rounded-full overflow-hidden border border-white/20 shadow", children: (0, jsx_runtime_1.jsx)("img", { src: user.avatar || "/voitans-logo.svg", alt: displayName, className: "w-full h-full object-cover" }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "pt-6 px-3 pb-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-sm text-zinc-100 leading-tight", children: displayName }), (0, jsx_runtime_1.jsxs)("div", { className: "text-[11px] text-zinc-400 leading-tight", children: ["#", (_e = user.discriminator) !== null && _e !== void 0 ? _e : "0000"] })] }), ((_f = user.dominantRole) === null || _f === void 0 ? void 0 : _f.name) && ((0, jsx_runtime_1.jsx)("span", { className: "text-[10px] px-2 py-0.5 rounded-full border text-white/90", style: {
                                            borderColor: `${roleHex || "#9ca3af"}55`,
                                            background: `${roleHex || "#9ca3af"}22`,
                                        }, title: "Bask\u0131n rol", children: user.dominantRole.name }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-3 grid grid-cols-2 gap-2", children: [(0, jsx_runtime_1.jsx)("a", { href: "https://discord.com/app", target: "_blank", rel: "noreferrer", className: "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:border-white/20 text-center", children: "Discord\u2019u A\u00E7" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => (0, react_2.signOut)(), className: "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:border-white/20", children: "\u00C7\u0131k\u0131\u015F Yap" })] }), (0, jsx_runtime_1.jsx)(RolesPreview, { userRoles: (_g = user === null || user === void 0 ? void 0 : user.guildMember) === null || _g === void 0 ? void 0 : _g.roles, discordRoleIds: discordRoleIds }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-3 grid grid-cols-2 gap-2 text-[11px] text-zinc-400", children: [((_h = user.guildMember) === null || _h === void 0 ? void 0 : _h.joined_at) && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-lg border border-white/10 bg-white/5 px-2 py-1.5", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] text-zinc-500", children: "Kat\u0131l\u0131m" }), (0, jsx_runtime_1.jsx)("div", { className: "text-zinc-300", children: new Date(user.guildMember.joined_at).toLocaleDateString("tr-TR") })] })), ((_j = user.guildMember) === null || _j === void 0 ? void 0 : _j.premium_since) && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-lg border border-white/10 bg-white/5 px-2 py-1.5", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] text-zinc-500", children: "Boost" }), (0, jsx_runtime_1.jsx)("div", { className: "text-zinc-300", children: new Date(user.guildMember.premium_since).toLocaleDateString("tr-TR") })] }))] })] })] }))] }));
}
