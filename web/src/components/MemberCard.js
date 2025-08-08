"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberCard = MemberCard;
const jsx_runtime_1 = require("react/jsx-runtime");
function MemberCard({ username, avatarUrl, dominantRole, dominantRoleColor, dominantRoleName }) {
    const color = dominantRoleColor ?? "#374151"; // fallback gray-700
    // Hiyerarşi sıralaması
    const roleHierarchy = {
        "Guild Master": 1,
        "Senior Officer": 2,
        "Marshal": 3,
        "Field Officer": 4,
        "Veteran": 5,
        "Voitans": 6,
    };
    // Emoji eşlemesi kaldırıldı (gereksiz)
    const rolePriority = dominantRoleName ? roleHierarchy[dominantRoleName] || 99 : 99;
    // Ek satır: nick/motto benzeri; şu an username dışında yoksa gizli kalır (placeholder yok)
    const subtitle = dominantRoleName ? `${dominantRoleName}` : "Voitans";
    return ((0, jsx_runtime_1.jsxs)("article", { className: "card", "data-rolecolor": color, "aria-label": `${username} kartı`, children: [(0, jsx_runtime_1.jsx)("div", { className: "edge", "aria-hidden": true }), (0, jsx_runtime_1.jsx)("div", { className: "left", children: (0, jsx_runtime_1.jsxs)("div", { className: "avatar", style: { boxShadow: `0 0 0 2px ${color}30` }, children: [(0, jsx_runtime_1.jsx)("img", { src: avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png", alt: username, loading: "lazy", onError: (e) => {
                                e.currentTarget.src = "https://cdn.discordapp.com/embed/avatars/0.png";
                            } }), (0, jsx_runtime_1.jsx)("span", { className: "ring", style: { boxShadow: `0 0 0 2px ${color}` }, "aria-hidden": true })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "right", children: [(0, jsx_runtime_1.jsx)("div", { className: "top", children: (0, jsx_runtime_1.jsx)("h3", { className: "name", title: username, children: username }) }), (0, jsx_runtime_1.jsx)("div", { className: "subtitle", "aria-hidden": !subtitle, children: dominantRoleName || "Voitans" })] }), (0, jsx_runtime_1.jsx)("style", { jsx: true, children: `
        .card {
          position: relative;
          display: grid;
          grid-template-columns: 64px 1fr;
          gap: 14px;
          border: 1px solid rgba(255,255,255,0.08); /* Daha ince ve belirgin kenar */
          /* Medieval/epic çerçeve & arkaplan */
          background:
            radial-gradient(120% 160% at 10% 0%, rgba(255,255,255,0.03), transparent 65%),
            linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          border-radius: 14px;
          padding: 12px 14px;
          transition: border-color .2s ease, background .2s ease, transform .2s ease, box-shadow .3s ease;
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.04),
            0 1px 0 rgba(0,0,0,0.15); /* Daha hafif başlangıç gölgesi */
          overflow: hidden;
          will-change: transform, box-shadow;
        }
        .card:hover {
          border-color: rgba(255,255,255,0.15); /* Daha belirgin hover kenarı */
          background:
            radial-gradient(120% 160% at 10% 0%, rgba(255,255,255,0.05), transparent 65%),
            linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015));
          transform: translateY(-2px); /* Hafif yukarı hareket */
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.06),
            0 8px 20px rgba(0,0,0,0.3), /* Daha belirgin ve yumuşak gölge */
            0 0 15px rgba(139, 92, 246, 0.08); /* Hafif mor/parlak vurgu gölgesi */
        }
        .edge {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(600px 120px at -10% 0%, var(--rc, ${color})06%, transparent 70%),
            radial-gradient(600px 120px at 110% 0%, var(--rc, ${color})05%, transparent 70%);
          opacity: .14;
          filter: saturate(0.65) brightness(0.95);
          pointer-events: none;
        }
        .left { display: flex; align-items: center; }
        .avatar {
          position: relative;
          width: 56px;
          height: 56px;
          border-radius: 12px; /* yuvarlatılmış köşe */
          overflow: hidden;
          background: radial-gradient(120px 120px at 30% 30%, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.08);
          flex: 0 0 auto;
        }
        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          opacity: 0;
          transition: opacity .25s ease;
        }
        .avatar img[loading="lazy"] {
          /* basit LQIP efekti (opacity üzerinden) */
          filter: saturate(0.9);
        }
        .avatar img[src] {
          opacity: 1;
        }
        .ring {
          position: absolute;
          inset: 0;
          border-radius: 12px;
          pointer-events: none;
          mix-blend-mode: screen;
          opacity: .6;
          box-shadow: inset 0 0 24px rgba(255,255,255,0.06);
        }
        .right { min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 6px; }
        .top { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .name {
          flex: 1;
          margin: 0;
          font-weight: 800;
          color: #E5E7EB;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: .2px;
          /* Başlıklarda Cinzel etkisi (layout’ta değişken tanımlı) */
          font-family: var(--font-cinzel), ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
        }
        .subtitle {
          color: #cbd5e1;
          font-size: 12px;
          opacity: .8;
          line-height: 1.35;
          font-family: var(--font-inter), ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial;
        }

        /* Rol göstergesi */
        .role-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid;
          color: #e5e7eb;
          opacity: .9;
          filter: saturate(0.7);
          box-shadow:
            0 0 0 0.5px rgba(0,0,0,0.45),
            inset 0 0 8px rgba(255,255,255,0.04);
        }
        .role-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          box-shadow: 0 0 0 2px rgba(0,0,0,0.25);
        }
        .role-name { font-size: 12px; font-weight: 600; }

        @media (prefers-reduced-motion: reduce) {
          .card, .card:hover { transform: none; transition: none; }
          .ring { opacity: .4; }
        }
      ` })] }));
}
