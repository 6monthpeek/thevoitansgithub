import { NextResponse } from "next/server";

const ICS_URL = process.env.CALENDAR_ICS_URL as string | undefined;

// Simple in-memory cache for 10 minutes
type CacheEntry = { value: any; expires: number };
const g = globalThis as unknown as { __voitansIcsCache?: Map<string, CacheEntry> };
const cache: Map<string, CacheEntry> = g.__voitansIcsCache ?? new Map();
g.__voitansIcsCache = cache;

function getCache<T>(key: string): T | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) {
    cache.delete(key);
    return null;
  }
  return e.value as T;
}
function setCache(key: string, value: any, ttlMs = 60 * 1000) {
  // TTL 1 dakikaya düşürüldü (daha hızlı yenileme)
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

// Parse minimal ICS into events
type RawEvent = {
  uid?: string;
  summary?: string;
  dtstart?: string;
  dtend?: string;
  location?: string;
  description?: string;
  allDay?: boolean;
};

function parseICS(ics: string): RawEvent[] {
  // Handle folded lines (RFC5545)
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const events: RawEvent[] = [];
  let cur: RawEvent | null = null;

  const getVal = (line: string) => {
    const idx = line.indexOf(":");
    return idx >= 0 ? line.slice(idx + 1) : "";
  };

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      cur = {};
      continue;
    }
    if (line.startsWith("END:VEVENT")) {
      if (cur) events.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;

    if (line.startsWith("UID")) cur.uid = getVal(line);
    else if (line.startsWith("SUMMARY")) cur.summary = getVal(line);
    else if (line.startsWith("DESCRIPTION")) cur.description = getVal(line);
    else if (line.startsWith("LOCATION")) cur.location = getVal(line);
    else if (line.startsWith("DTSTART")) {
      // Preserve the whole line so we keep TZID/value params for robust parsing later.
      cur.dtstart = line; // e.g., "DTSTART;TZID=Europe/Istanbul:20250802T143000"
      cur.allDay = /VALUE=DATE/.test(line);
    } else if (line.startsWith("DTEND")) {
      cur.dtend = line; // keep params (TZID/DATE)
    }
  }
  return events;
}

function toIsoZ(dtLine: string): string | null {
  // Supports:
  // - Zulu: 20250802T213000Z (UTC)
  // - Floating: 20250802T213000 (treated as local then -> UTC)
  // - DATE: 20250802 (all-day)
  if (!dtLine) return null;

  const parts = dtLine.split(":");
  const value = parts.pop() ?? "";
  const params = parts.join(":");

  // All-day date
  if (/^\d{8}$/.test(value) || /VALUE=DATE/i.test(params)) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6)) - 1;
    const d = Number(value.slice(6, 8));
    const local = new Date(y, m, d, 0, 0, 0);
    if (isNaN(local.getTime())) return null;
    return new Date(local.getTime() - local.getTimezoneOffset() * 60000).toISOString();
  }

  // Zulu UTC like 20250802T213000Z
  if (/^\d{8}T\d{6}Z$/.test(value)) {
    // Ensure correct parse by inserting hyphens/colons
    const y = value.slice(0, 4);
    const mo = value.slice(4, 6);
    const d = value.slice(6, 8);
    const hh = value.slice(9, 11);
    const mm = value.slice(11, 13);
    const ss = value.slice(13, 15);
    const iso = `${y}-${mo}-${d}T${hh}:${mm}:${ss}Z`;
    const t = Date.parse(iso);
    if (isNaN(t)) return null;
    return new Date(t).toISOString();
  }

  // Floating time 20250802T213000 -> treat as local then convert to UTC
  if (/^\d{8}T\d{6}$/.test(value)) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6)) - 1;
    const dd = Number(value.slice(6, 8));
    const hh = Number(value.slice(9, 11));
    const mm = Number(value.slice(11, 13));
    const ss = Number(value.slice(13, 15));
    const local = new Date(y, m, dd, hh, mm, ss);
    if (isNaN(local.getTime())) return null;
    return new Date(local.getTime() - local.getTimezoneOffset() * 60000).toISOString();
  }

  return null;
}

function startOfWeek(date = new Date()): Date {
  // Monday 00:00 in Europe/Istanbul converted to UTC
  const d = new Date(date);
  // Europe/Istanbul haftanın başlangıcı: Pazartesi
  const day = (d.getDay() + 6) % 7; // Mon=0..Sun=6 (local)
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  // local midnight -> UTC ISO
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000);
}

function endOfWeek(start: Date): Date {
  // Hafta sonu: Pazar 23:59:59.999 (Europe/Istanbul) -> UTC
  const startLocal = new Date(new Date(start).getTime() + new Date().getTimezoneOffset() * 60000);
  const d = new Date(startLocal);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000);
}

export async function GET(req: Request) {
  try {
    if (!ICS_URL) {
      return NextResponse.json(
        { error: "missing-env:CALENDAR_ICS_URL", events: [], hint: "Add CALENDAR_ICS_URL to .env.local and restart the dev server" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    // optional ?weekOffset=0 current, 1 next, -1 prev
    const weekOffset = Number(searchParams.get("weekOffset") ?? "0");
    const force = searchParams.get("force") === "1";
    const debug = searchParams.get("debug") === "1";
    const base = startOfWeek(new Date());
    // weekOffset uygulaması (UTC değil local hesap bazlı)
    const baseLocal = new Date(new Date(base).getTime() + new Date().getTimezoneOffset() * 60000);
    baseLocal.setDate(baseLocal.getDate() + weekOffset * 7);
    const start = new Date(baseLocal.getTime() - baseLocal.getTimezoneOffset() * 60000);
    const end = endOfWeek(start);

    const cacheKey = `ics:${ICS_URL}:w${weekOffset}`;
    let txt = force ? null : getCache<string>(cacheKey);
    if (!txt) {
      // Retry/backoff basic
      const maxAttempts = 3;
      let attempt = 0;
      let lastErr: any;
      while (attempt < maxAttempts) {
        attempt++;
        try {
          const res = await fetch(ICS_URL, { headers: { "cache-control": "no-cache" }, cache: "no-store", next: { revalidate: 0 } });
          if (res.status === 429) {
            const retryAfter = Number(res.headers.get("retry-after")) || attempt * 0.5;
            const jitter = Math.random() * 0.2; // 0-200ms jitter
            await new Promise((r) => setTimeout(r, (retryAfter + jitter) * 1000));
            continue;
          }
          if (!res.ok) throw new Error(`ICS fetch failed: ${res.status}`);
          txt = await res.text();
          setCache(cacheKey, txt);
          break;
        } catch (e) {
          lastErr = e;
          const base = attempt * 400;
          const jitter = Math.floor(Math.random() * 150);
          await new Promise((r) => setTimeout(r, base + jitter));
        }
      }
      if (!txt) throw lastErr ?? new Error("ICS fetch failed");
    }

    // DEBUG: ham ICS ilk N satırı (özel durum teşhisi için)
    if (debug) {
      const first = txt.split(/\r?\n/).slice(0, 200);
      return NextResponse.json(
        { debug: true, firstLines: first, length: first.length },
        { status: 200 }
      );
    }

    const raw = parseICS(txt);
    type EventT = {
      id: string;
      title: string;
      description: string;
      location: string;
      start: string;
      end: string;
      allDay: boolean;
    };
    const mapped = raw.map((e): EventT | null => {
      const s = toIsoZ(e.dtstart ?? "");
      let en = toIsoZ(e.dtend ?? "");

      // DTEND eksikse makul varsayımlar:
      if (!en && s) {
        const base = new Date(s);
        if (e.allDay) {
          // all-day -> +1 gün
          base.setUTCDate(base.getUTCDate() + 1);
          en = base.toISOString();
        } else {
          // time-based -> +1 saat
          base.setUTCHours(base.getUTCHours() + 1);
          en = base.toISOString();
        }
      }

      // all-day DTEND ICS'te exclusive olduğundan 1ms geri çek
      if (e.allDay && en) {
        const t = new Date(en);
        t.setUTCMilliseconds(t.getUTCMilliseconds() - 1);
        en = t.toISOString();
      }
      if (!s || !en) return null;
      return {
        id: e.uid ?? `${e.summary}-${e.dtstart}`,
        title: e.summary ?? "Etkinlik",
        description: e.description ?? "",
        location: e.location ?? "",
        start: s,
        end: en,
        allDay: !!e.allDay,
      };
    }) as Array<EventT | null>;

    const events: EventT[] = mapped
      .filter((ev): ev is EventT => !!ev)
      .filter((ev) => {
        // Use inclusive overlap check against the exact Europe/Istanbul week window
        const es = new Date(ev.start).getTime();
        const ee = new Date(ev.end).getTime();
        return ee >= start.getTime() && es <= end.getTime();
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return NextResponse.json(
      {
        week: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        events,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown-error", events: [] }, { status: 500 });
  }
}
