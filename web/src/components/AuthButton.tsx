"use client";

import React, { useEffect, useRef, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useSession } from "next-auth/react";

type RoleBadge = { id: string; name: string; color: number; position: number; hex?: string | null };

type RolesPreviewProps = {
  userRoles?: RoleBadge[] | undefined;
  discordRoleIds?: string[] | undefined;
};

function RolesPreview({ userRoles, discordRoleIds }: RolesPreviewProps) {
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Önce window cache
        const cached = (typeof window !== "undefined" && (window as any).__ROLE_NAME_CACHE__) || null;
        if (cached?.roles) {
          setNameMap(cached.roles as Record<string, string>);
        }
        // Sunucudan map çek
        const r = await fetch("/api/resolve/roles", { cache: "no-store" });
        if (!alive) return;
        const j = await r.json().catch(() => ({}));
        const rolesObj: Record<string, string> =
          (j?.roles as Record<string, string>) ||
          (Array.isArray(j)
            ? Object.fromEntries(j.map((x: any) => [String(x?.id ?? ""), String(x?.name ?? "")]))
            : {});
        if (rolesObj && typeof rolesObj === "object") {
          setNameMap(rolesObj);
          if (typeof window !== "undefined") {
            (window as any).__ROLE_NAME_CACHE__ = { roles: rolesObj };
          }
        }
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  const hasUserRoles = Array.isArray(userRoles) && userRoles.length > 0;
  const hasIds = Array.isArray(discordRoleIds) && discordRoleIds.length > 0;

  return (
    <div className="mt-3">
      <div className="text-[11px] text-zinc-400 mb-1">Roller</div>
      {hasUserRoles ? (
        <div className="flex flex-wrap gap-1.5">
          {userRoles!.slice(0, 6).map((r) => {
            const hex = r.hex || `#${(r.color ?? 0).toString(16).padStart(6, "0")}`;
            const label = r.name || nameMap[String(r.id)] || r.id;
            return (
              <span
                key={r.id}
                className="text-[10px] px-2 py-0.5 rounded-full border"
                style={{ borderColor: `${hex}55`, background: `${hex}22`, color: "#e5e7eb" }}
                title={label}
              >
                {label}
              </span>
            );
          })}
        </div>
      ) : hasIds ? (
        <div className="flex flex-wrap gap-1.5">
          {discordRoleIds!.slice(0, 6).map((rid) => {
            const label = nameMap[String(rid)] || `#${rid}`;
            return (
              <span
                key={rid}
                className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-zinc-200"
                title={String(rid)}
              >
                {label}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="h-4 w-16 rounded-full bg-white/5 border border-white/10 animate-pulse" />
          <span className="h-4 w-10 rounded-full bg-white/5 border border-white/10 animate-pulse" />
        </div>
      )}
    </div>
  );
}

export default function AuthButton() {
  const { data, status } = useSession();
  const loading = status === "loading";
  const user = (data as any)?.user as
    | {
        id: string;
        username?: string;
        global_name?: string | null;
        discriminator?: string | null;
        avatar?: string | null;
        banner?: string | null;
        accent_color?: string | null;
        banner_color?: string | null;
        isVoitans?: boolean;
        dominantRole?: { id: string; name: string; color: number; hex?: string | null } | null;
        guildMember?: { nick?: string | null; roles: RoleBadge[]; joined_at?: string | null; premium_since?: string | null };
      }
    | undefined;

  // Officer rol kontrolü (ENV veya sabit ID)
  const SENIOR_OFFICER_ROLE_ID =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SENIOR_OFFICER_ROLE_ID) ||
    (typeof process !== "undefined" && process.env.SENIOR_OFFICER_ROLE_ID) ||
    "1249512318929342505";

  // Eldeki iki kaynak:
  // - session.user.guildMember.roles (detaylı obje listesi)
  // - session.user.discordRoles (sadece ID dizisi) -> auth.ts session callback'te hydrate edilir
  const discordRoleIds: string[] =
    (data as any)?.user?.discordRoles && Array.isArray((data as any).user.discordRoles)
      ? ((data as any).user.discordRoles as string[])
      : [];

  const isOfficer =
    (Array.isArray(user?.guildMember?.roles) &&
      user.guildMember.roles.some((r) => String(r.id) === String(SENIOR_OFFICER_ROLE_ID))) ||
    (Array.isArray(discordRoleIds) && discordRoleIds.includes(String(SENIOR_OFFICER_ROLE_ID)));

  // outside-click controlled popover
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (loading) {
    return (
      <button
        className="rounded-full px-3 py-1.5 text-xs border border-white/10 text-zinc-300 opacity-70"
        aria-busy="true"
        disabled
      >
        Yükleniyor…
      </button>
    );
  }

  if (!user) {
    return (
      <div className="inline-flex items-center gap-2">
        <button
          onClick={() =>
            signIn("discord", {
              callbackUrl:
                typeof window !== "undefined" ? `${window.location.origin}` : "/",
            })
          }
          className="rounded-full px-3 py-1.5 text-xs border border-white/10 text-zinc-300 hover:border-white/20"
          aria-label="Discord ile giriş yap"
        >
          Giriş Yap
        </button>
      </div>
    );
  }

  const displayName = user.global_name || user.username || "Discord User";
  const roleHex =
    user.dominantRole?.hex ||
    (typeof user.dominantRole?.color === "number"
      ? `#${user.dominantRole.color.toString(16).padStart(6, "0")}`
      : undefined);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-2 py-1 hover:border-white/20"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Profil"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={user.avatar || "/voitans-logo.svg"}
          alt={displayName}
          className="w-6 h-6 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
        <span className="text-xs text-zinc-300 max-w-[140px] truncate">{displayName}</span>
        {user.isVoitans ? (
          <span
            className="ml-1 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/30 text-emerald-300 bg-emerald-400/10"
            title="Voitans üyesi"
          >
            VOITANS
          </span>
        ) : (
          <span
            className="ml-1 text-[10px] px-2 py-0.5 rounded-full border border-zinc-400/30 text-zinc-300 bg-zinc-400/10"
            title="Guild üyesi değil"
          >
            Misafir
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-[#0b0f19]/95 backdrop-blur shadow-xl z-50 overflow-hidden"
        >
          {/* Banner / header */}
          <div
            className="h-16 relative"
            style={{
              background:
                user.banner
                  ? `url(${user.banner}) center/cover no-repeat`
                  : `linear-gradient(90deg, ${user.accent_color || "#1f2937"}, #0b0f19)`,
            }}
          >
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute -bottom-5 left-3 w-10 h-10 rounded-full overflow-hidden border border-white/20 shadow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.avatar || "/voitans-logo.svg"}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="pt-6 px-3 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-zinc-100 leading-tight">{displayName}</div>
                <div className="text-[11px] text-zinc-400 leading-tight">
                  #{user.discriminator ?? "0000"}
                </div>
              </div>
              {user.dominantRole?.name && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full border text-white/90"
                  style={{
                    borderColor: `${roleHex || "#9ca3af"}55`,
                    background: `${roleHex || "#9ca3af"}22`,
                  }}
                  title="Baskın rol"
                >
                  {user.dominantRole.name}
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href="https://discord.com/app"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:border-white/20 text-center"
              >
                Discord’u Aç
              </a>
              <button
                onClick={() => signOut()}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:border-white/20"
              >
                Çıkış Yap
              </button>
            </div>

            {/* Officer kısayolu kaldırıldı — Officer erişimi yalnız sekmeler üzerinden */}

            {/* Roles preview: guildMember.roles varsa isim; yoksa discordRoles ID’lerini isim map’i ile göster */}
            <RolesPreview userRoles={user?.guildMember?.roles} discordRoleIds={discordRoleIds} />

            {/* Meta */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
              {user.guildMember?.joined_at && (
                <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                  <div className="text-[10px] text-zinc-500">Katılım</div>
                  <div className="text-zinc-300">
                    {new Date(user.guildMember.joined_at).toLocaleDateString("tr-TR")}
                  </div>
                </div>
              )}
              {user.guildMember?.premium_since && (
                <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                  <div className="text-[10px] text-zinc-500">Boost</div>
                  <div className="text-zinc-300">
                    {new Date(user.guildMember.premium_since).toLocaleDateString("tr-TR")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
