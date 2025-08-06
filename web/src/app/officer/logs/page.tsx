"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";

/**
 * Yeni Officer Logs UI
 * - Sade, işlev odaklı: güçlü filtre paneli + sonuç listesi + raw toggle
 * - Debounce (300ms), sayfalama, mobile-first
 * - TS + Tailwind
 */

type LogEntry = {
  timestamp: string;
  event: string;
  guildId?: string;
  userId?: string;
  userIdShort?: string;
  channelId?: string;
  data?: any;
};

type ApiPayload = {
  ok: boolean;
  data?: {
    total: number;
    page: number;
    limit: number;
    offset: number;
    items: LogEntry[];
  };
  error?: string;
  code?: string;
};

type Filters = {
  types: string[]; // çoklu event seçimi
  user: string;
  channel: string;
  q: string;
};

const DEFAULT_LIMIT = 50;

// Basit util: 300ms debounce
function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// SSE auto-reconnect with exponential backoff
function useSSE(urlBuilder: () => string, onMessage: (data: any) => void) {
  const backoffRef = useRef(1000);
  const esRef = useRef<EventSource | null>(null);
  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      try {
        const url = urlBuilder();
        const es = new EventSource(url, { withCredentials: true });
        esRef.current = es;

        es.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            onMessage(payload);
          } catch {
            // ignore
          }
        };
        es.onerror = () => {
          // close and schedule reconnect
          try { es.close(); } catch {}
          esRef.current = null;
          const delay = backoffRef.current;
          backoffRef.current = Math.min(delay * 2, 30000);
          setTimeout(connect, delay);
        };
        es.onopen = () => {
          backoffRef.current = 1000; // reset backoff on open
        };
      } catch {
        const delay = backoffRef.current;
        backoffRef.current = Math.min(delay * 2, 30000);
        setTimeout(connect, delay);
      }
    };

    connect();
    return () => {
      cancelled = true;
      if (esRef.current) {
        try { esRef.current.close(); } catch {}
        esRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlBuilder]);
}

// Event seçenekleri: pratikte botta üretilen başlıca eventler (presenceUpdate kaldırıldı)
const KNOWN_EVENTS: Array<{ key: string; label: string }> = [
  { key: "messageCreate", label: "Mesaj Gönderildi" },
  { key: "messageUpdate", label: "Mesaj Düzenlendi" },
  { key: "messageDelete", label: "Mesaj Silindi" },
  // presenceUpdate listeden tamamen kaldırıldı
  { key: "voiceStateUpdate", label: "Ses Kanalı Olayı" },
  { key: "guildBanAdd", label: "Yasaklama (Ban)" },
  { key: "guildCreate", label: "Sunucuya Katılım (Bot)" },
  { key: "guildDelete", label: "Sunucudan Ayrılma (Bot)" },
  { key: "guildMemberAdd", label: "Üye Katıldı" },
  { key: "guildMemberRemove", label: "Üye Ayrıldı" },
  { key: "interactionCreate", label: "Etkileşim (Slash/Buton)" },
  { key: "channelCreate", label: "Kanal Oluşturuldu" },
  { key: "channelDelete", label: "Kanal Silindi" },
  { key: "rateLimit", label: "Rate Limit" },
  { key: "warn", label: "Uyarı" },
  { key: "error", label: "Hata" },
];

function FilterPanel({
  value,
  onChange,
  onClear,
}: {
  value: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}) {
  const [local, setLocal] = useState<Filters>(value);
  // Dış değişiklik geldiğinde local'i senkronla
  useEffect(() => setLocal(value), [value]);

  // Tek tek handler'lar
  const toggleType = (ev: string) => {
    setLocal((s) => {
      const exists = s.types.includes(ev);
      return { ...s, types: exists ? s.types.filter((x) => x !== ev) : [...s.types, ev] };
    });
  };

  // Değişiklikleri ebeveyne bildir (debounce ebeveynde)
  useEffect(() => {
    onChange(local);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local.user, local.channel, local.q, local.types.join("|")]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-3 md:p-4 space-y-3">
      {/* Tarih alanları kaldırıldı: canlı akış + sayfalama modeli */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Kullanıcı (ID / username / global name / nick)</label>
          <input
            placeholder="ör. 21612678940 veya 6month..."
            value={local.user}
            onChange={(e) => setLocal((s) => ({ ...s, user: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-sm text-zinc-200 outline-none focus:border-white/20"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Kanal ID</label>
          <input
            placeholder="ör. 119892401255..."
            value={local.channel}
            onChange={(e) => setLocal((s) => ({ ...s, channel: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-sm text-zinc-200 outline-none focus:border-white/20"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">İçerik (full-text)</label>
          <input
            placeholder="mesaj içeriği / ek veri"
            value={local.q}
            onChange={(e) => setLocal((s) => ({ ...s, q: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-sm text-zinc-200 outline-none focus:border-white/20"
          />
        </div>
      </div>

      <div>
        <div className="text-xs text-zinc-400 mb-1">Event Türleri</div>
        <div className="flex flex-wrap gap-1.5">
          {KNOWN_EVENTS.map((ev) => {
            const selected = value.types.includes(ev.key);
            return (
              <button
                key={ev.key}
                onClick={() => toggleType(ev.key)}
                className={`px-2.5 py-1 rounded-full border text-xs ${
                  selected
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                    : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20"
                }`}
                title={ev.label}
                type="button"
              >
                {ev.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-200 hover:border-white/20"
          onClick={onClear}
          type="button"
        >
          Filtreleri Temizle
        </button>
        <div className="text-xs text-zinc-500">Debounce: 300ms</div>
      </div>
    </div>
  );
}

function LogItem({ item, raw }: { item: LogEntry; raw: boolean }) {
  const ts = new Date(item.timestamp);
  const time = isNaN(ts.getTime()) ? item.timestamp : ts.toLocaleString("tr-TR");

  if (raw) {
    return (
      <pre className="text-xs text-zinc-300 bg-black/40 border border-white/10 rounded-lg p-2 overflow-auto">
        {JSON.stringify(item, null, 2)}
      </pre>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-zinc-100">
          <span className="px-2 py-0.5 rounded-full border border-white/10 bg-black/30 text-xs text-zinc-300 mr-2">
            {item.event}
          </span>
          <span className="text-zinc-300">{item.data?.userDisplay || item.userIdShort || item.userId || "-"}</span>
        </div>
        <div className="text-xs text-zinc-500">{time}</div>
      </div>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-zinc-400">
        <div>
          <div className="text-zinc-500">Kanal</div>
          <div className="text-zinc-300">{item.channelId || "-"}</div>
        </div>
        <div>
          <div className="text-zinc-500">Guild</div>
          <div className="text-zinc-300">{item.data?.guildName || item.guildId || "-"}</div>
        </div>
        <div>
          <div className="text-zinc-500">User</div>
          <div className="text-zinc-300">
            {item.data?.resolvedUser?.username || item.data?.usernameResolved || item.userIdShort || "-"}
          </div>
        </div>
        <div>
          <div className="text-zinc-500">ID</div>
          <div className="text-zinc-300">{item.userId || "-"}</div>
        </div>
      </div>
      {item.data?.content ? (
        <div className="mt-2 text-sm text-zinc-200 border-t border-white/10 pt-2">{String(item.data.content)}</div>
      ) : null}
    </div>
  );
}

export default function OfficerLogsPage() {
  const { data: session } = useSession() as any;

  // Filtre state
  const [filters, setFilters] = useState<Filters>({
    types: [],
    user: "",
    channel: "",
    q: "",
  });
  const debounced = useDebounced(filters, 300);

  // Sayfalama
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  // Mode: raw / pretty
  const [raw, setRaw] = useState(false);

  // Data state
  const [items, setItems] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Query string builder
  const query = useMemo(() => {
    const p = new URLSearchParams();
    for (const t of debounced.types) p.append("type", t);
    if (debounced.user) p.set("user", debounced.user.trim());
    if (debounced.channel) p.set("channel", debounced.channel.trim());
    if (debounced.q) p.set("q", debounced.q.trim());
    p.set("page", String(page));
    p.set("limit", String(limit));
    if (raw) p.set("mode", "json");
    return p.toString();
  }, [debounced, page, limit, raw]);

  // Fetcher
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    fetch(`/api/officer/logs?${query}`, { cache: "no-store" })
      .then(async (r) => {
        const j: ApiPayload = await r.json().catch(() => ({ ok: false, error: "invalid-json" } as any));
        if (!alive) return;
        if (!r.ok || !j.ok || !j.data) {
          const msg = (j as any)?.error || `HTTP ${r.status}`;
          setErr(typeof msg === "string" ? msg : "unknown-error");
          setItems([]);
          setTotal(0);
        } else {
          setItems(j.data.items || []);
          setTotal(j.data.total || 0);
        }
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message || "network-error");
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [query]);

  // Live SSE: always-on, adds newest items on top (if they match client filters)
  useSSE(
    () => {
      const p = new URLSearchParams();
      for (const t of debounced.types) p.append("type", t);
      if (debounced.user) p.set("user", debounced.user.trim());
      if (debounced.channel) p.set("channel", debounced.channel.trim());
      if (debounced.q) p.set("q", debounced.q.trim());
      return `/api/officer/logs/stream?${p.toString()}`;
    },
    (payload) => {
      if (!payload || payload.ok !== true) return;
      if (!payload.item) return; // hello/ready ping’lerini atla
      setItems((prev) => [payload.item as LogEntry, ...prev].slice(0, 1000)); // UI koruması: en fazla 1000 kayıt
      setTotal((t) => t + 1);
    }
  );

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));

  // UI
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-neutral-100">Officer / Loglar</h1>
 
        <div className="flex items-center gap-2">
          {/* Protection butonu */}
          <a
            href="/officer/protection"
            className="px-3 py-1.5 text-xs rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10"
            title="Protection paneline git"
          >
            Protection
          </a>
          <label className="text-xs text-zinc-400">Raw</label>
          <button
            onClick={() => setRaw((v) => !v)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              raw ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-white/10 bg-white/5 text-zinc-300"
            }`}
          >
            {raw ? "JSON" : "Kapalı"}
          </button>

          <select
            className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-zinc-200 outline-none"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value) || DEFAULT_LIMIT);
              setPage(1);
            }}
            title="Sayfa boyutu"
          >
            {[25, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n}/sayfa
              </option>
            ))}
          </select>
        </div>
      </div>

      <FilterPanel
        value={filters}
        onChange={(patch) => {
          setFilters((s) => ({ ...s, ...patch }));
          setPage(1); // filtre değişince sayfayı sıfırla
        }}
        onClear={() => {
          setFilters({ types: [], user: "", channel: "", q: "" });
          setPage(1);
        }}
      />

      {/* Sonuçlar */}
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-3 md:p-4">
        {loading ? (
          <div className="text-sm text-zinc-400">Yükleniyor…</div>
        ) : err ? (
          <div className="text-sm text-rose-400">Hata: {err}</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-zinc-400">Kayıt bulunamadı.</div>
        ) : (
          <div className="space-y-2">
            {items.map((it, idx) => (
              <LogItem key={`${it.timestamp}-${it.userId}-${idx}`} item={it} raw={raw} />
            ))}
          </div>
        )}
      </div>

      {/* Sayfalama */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-zinc-400">
          Toplam: <span className="text-zinc-200">{total}</span> • Sayfa {page}/{totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 disabled:opacity-50 hover:border-white/20"
          >
            Önceki
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 disabled:opacity-50 hover:border-white/20"
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>
  );
}
