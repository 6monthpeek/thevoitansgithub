"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type GuardsConfig = {
  guards: Record<string, { enabled?: boolean } & Record<string, any>>;
  rateLimits?: Record<string, number>;
  [k: string]: any;
};

export default function OfficerProtectionPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [cfg, setCfg] = useState<GuardsConfig | null>(null);

  const seniorId = process.env.NEXT_PUBLIC_SENIOR_OFFICER_ROLE_ID || "1249512318929342505";
  const isSenior = useMemo(() => {
    const roles = (session?.user as any)?.discordRoles as string[] | undefined;
    return Array.isArray(roles) && roles.includes(seniorId);
  }, [session, seniorId]);

  async function fetchStatus() {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/officer/protection", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "status_failed");
      setCfg(j.config);
    } catch (e: any) {
      setErr(e?.message || "fetch_error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleGuard(guard: string, next: boolean) {
    setErr(null);
    try {
      const r = await fetch("/api/officer/protection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: next ? "enable" : "disable", guard })
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "toggle_failed");
      await fetchStatus();
    } catch (e: any) {
      setErr(e?.message || "toggle_error");
    }
  }

  async function setConfig(path: string, value: any) {
    setErr(null);
    try {
      const r = await fetch("/api/officer/protection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "config-set", path, value })
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "config_set_failed");
      await fetchStatus();
    } catch (e: any) {
      setErr(e?.message || "config_error");
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="p-6 text-zinc-300">
        <h1 className="text-xl font-semibold text-zinc-100 mb-2">Protection</h1>
        Yükleniyor…
      </div>
    );
  }

  if (!isSenior) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-white/10 bg-black/30 p-5">
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">403 — Yetkisiz</h2>
          <p className="text-zinc-400">Bu sayfaya sadece Senior Officer erişebilir.</p>
          <div className="mt-4">
            <Link href="/officer/logs" className="text-sm text-blue-300 hover:underline">
              Officer Logs’a dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const guards = Object.entries(cfg?.guards || {});
  const rateLimits = Object.entries(cfg?.rateLimits || {});

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-100">Protection Kontrol</h1>
        <button
          onClick={fetchStatus}
          className="text-sm rounded-full px-3 py-1.5 border border-white/10 text-zinc-200 hover:border-white/20 hover:bg-white/5"
        >
          Yenile
        </button>
      </header>

      {err && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 text-red-200 text-sm px-3 py-2">
          Hata: {err}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <h2 className="text-base font-semibold text-zinc-100 mb-3">Guard’lar</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {guards.length === 0 && <div className="text-zinc-400 text-sm">Guard bulunamadı.</div>}
          {guards.map(([key, val]) => {
            const enabled = !!(val as any)?.enabled;
            return (
              <div key={key} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-zinc-100">{key}</div>
                  <div className="text-xs text-zinc-400">{enabled ? "Açık" : "Kapalı"}</div>
                </div>
                <button
                  onClick={() => toggleGuard(key, !enabled)}
                  className={`text-xs rounded-full px-3 py-1.5 border transition ${
                    enabled
                      ? "border-green-500/30 text-green-300 hover:bg-green-500/10"
                      : "border-zinc-400/30 text-zinc-200 hover:bg-white/10"
                  }`}
                >
                  {enabled ? "Kapat" : "Aç"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <h2 className="text-base font-semibold text-zinc-100 mb-3">Rate Limits</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {rateLimits.length === 0 && <div className="text-zinc-400 text-sm">Rate limit alanı yok.</div>}
          {rateLimits.map(([k, v]) => (
            <RateLimitItem key={k} name={k} value={Number(v)} onSave={(val) => setConfig(`rateLimits.${k}`, val)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RateLimitItem({
  name,
  value,
  onSave
}: {
  name: string;
  value: number;
  onSave: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value ?? ""));
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="text-sm font-medium text-zinc-100">{name}</div>
      <div className="mt-2 flex items-center gap-2">
        <input
          className="w-24 rounded-md bg-black/40 border border-white/10 px-2 py-1 text-sm text-zinc-100"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          inputMode="numeric"
        />
        <button
          onClick={() => onSave(Number(local))}
          className="text-xs rounded-full px-3 py-1.5 border border-white/10 text-zinc-200 hover:border-white/20 hover:bg-white/5"
        >
          Kaydet
        </button>
      </div>
    </div>
  );
}
