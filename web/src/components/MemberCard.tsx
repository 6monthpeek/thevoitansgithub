"use client";

import React from "react";

type Props = {
  username: string;
  avatarUrl?: string;
  dominantRole?: string | null;
  dominantRoleColor?: string | null;
  dominantRoleName?: string | null;
};

export function MemberCard({ username, avatarUrl, dominantRole, dominantRoleColor, dominantRoleName }: Props) {
  const color = dominantRoleColor ?? "#374151"; // fallback gray-700

  // Hiyerarşi sıralaması
  const roleHierarchy: Record<string, number> = {
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

  return (
    <article className="card" data-rolecolor={color} aria-label={`${username} kartı`}>
      <div className="edge" aria-hidden />
      <div className="left">
        <div className="avatar" style={{ boxShadow: `0 0 0 2px ${color}30` }}>
          <img
            src={avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png"}
            alt={username}
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png";
            }}
          />
          <span className="ring" style={{ boxShadow: `0 0 0 2px ${color}` }} aria-hidden />
        </div>
      </div>
      <div className="right">
        <div className="top">
          <h3 className="name" title={username}>{username}</h3>
        </div>

        {/* Alt satırda tek rol adı */}
        <div className="subtitle" aria-hidden={!subtitle}>
          {dominantRoleName || "Voitans"}
        </div>
      </div>

      <style jsx>{`
        .card {
          position: relative;
          display: grid;
          grid-template-columns: 64px 1fr;
          gap: 14px;
          border: 1px solid rgba(255,255,255,0.06);
          /* Medieval/epic çerçeve & arkaplan */
          background:
            radial-gradient(120% 160% at 10% 0%, rgba(255,255,255,0.03), transparent 65%),
            linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          border-radius: 14px;
          padding: 12px 14px;
          transition: border-color .18s ease, background .18s ease, transform .18s ease, box-shadow .18s ease;
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.04),
            0 1px 0 rgba(0,0,0,0.25);
          overflow: hidden;
          will-change: transform, box-shadow;
        }
        .card:hover {
          border-color: rgba(255,255,255,0.12);
          background:
            radial-gradient(120% 160% at 10% 0%, rgba(255,255,255,0.05), transparent 65%),
            linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015));
          transform: translateY(-1px);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.06),
            0 6px 16px rgba(0,0,0,0.24);
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
      `}</style>
    </article>
  );
}
