"use client";

import React from "react";

type Props = {
  username: string;
  avatarUrl?: string;
  dominantRoleColor?: string | null;
  dominantRoleName?: string | null;
};

export function MemberMiniCard({ username, avatarUrl, dominantRoleColor, dominantRoleName }: Props) {
  const color = (dominantRoleColor || "#8b5cf6").trim();
  const roleName = dominantRoleName || "Voitans";

  return (
    <div className="mini-card" title={username} aria-label={`${username} (${roleName})`}>
      <div className="avatar" style={{ boxShadow: `0 0 0 1px ${color}55` }}>
        <img
          src={avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png"}
          alt={username}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png";
          }}
        />
      </div>
      <div className="info">
        <div className="name" title={username}>{username}</div>
        <div className="role" style={{ borderColor: `${color}55`, background: `linear-gradient(180deg, ${color}22, transparent)` }}>
          <span className="dot" style={{ backgroundColor: color }} />
          <span className="label">{roleName}</span>
        </div>
      </div>
      <style jsx>{`
        .mini-card {
          display: grid;
          grid-template-columns: 40px 1fr;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
        }
        .mini-card:hover {
          border-color: rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.03);
        }
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          overflow: hidden;
          background: rgba(255,255,255,0.04);
        }
        .avatar img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }
        .info { min-width: 0; }
        .name {
          font-size: 14px;
          font-weight: 700;
          color: #e5e7eb;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.1;
        }
        .role {
          margin-top: 4px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          color: #d1d5db;
          font-size: 11px;
          line-height: 1.2;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          box-shadow: 0 0 0 2px rgba(0,0,0,0.35);
        }
        .label { font-weight: 600; }
      `}</style>
    </div>
  );
}
