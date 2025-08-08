/**
 * OpenRouter minimal client for Discord bot
 * - Reads system prompt from ./prompt.md (optional)
 * - Uses OPENROUTER_API_KEY from process.env (set this in Replit Secrets)
 * - Model can be overridden via process.env.OPENROUTER_MODEL
 * - Base URL defaults to https://openrouter.ai/api/v1
 *
 * Safe defaults: short timeouts, content length caps, error handling.
 */

const DEFAULT_BASE = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "openrouter/auto"; // you can set e.g. "meta-llama/llama-3.1-70b-instruct:free"

async function readPrompt() {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const p = path.join(__dirname, "prompt.md");
    const content = await fs.readFile(p, "utf8").catch(() => "");
    return content || "";
  } catch {
    return "";
  }
}

/**
 * callOpenRouter
 * @param {Array<{role:"system"|"user"|"assistant", content:string}>} messages
 * @param {object} opts
 * @returns {Promise<string>} assistant text
 */
/**
 * Rotating API keys on 429:
 * - Source ONLY from ENV to avoid leaking keys via repo.
 * - Priority: OPENROUTER_API_KEYS (comma-separated) -> OPENROUTER_API_KEY -> OPENROUTER_API_KEY1..N
 * When 429 received, we retry once per additional key with small backoff.
 * NOTE: Prefer official pooling (Integrations) for production. This is a best-effort fallback.
 */
function listApiKeys() {
  const keys = [];

  // 1) Comma-separated list
  const listEnv = process.env.OPENROUTER_API_KEYS;
  if (listEnv && typeof listEnv === "string") {
    for (const part of listEnv.split(","))
      if (part && String(part).trim()) keys.push(String(part).trim());
  }

  // 2) Primary single key
  const primary = process.env.OPENROUTER_API_KEY ? String(process.env.OPENROUTER_API_KEY).trim() : "";
  if (primary) keys.push(primary);

  // 3) Numbered keys OPENROUTER_API_KEY1..N
  let i = 1;
  while (true) {
    const k = process.env[`OPENROUTER_API_KEY${i}`];
    if (!k) break;
    const v = String(k).trim();
    if (v) keys.push(v);
    i += 1;
    if (i > 50) break; // extended hard cap
  }

  // De-duplicate while preserving order
  const uniq = [];
  const seen = new Set();
  for (const k of keys) {
    if (!seen.has(k)) {
      uniq.push(k);
      seen.add(k);
    }
  }
  return uniq;
}

/**
 * Simple memory cache to avoid retrying a rate-limited key for a cooldown window.
 * In-memory per process. Map<apiKey, epochMsUntil>
 */
const rateLimitedUntil = new Map();

async function callOpenRouter(messages, opts = {}) {
  const baseURL = DEFAULT_BASE;

  // DEBUG FLAG (env ile aç/kapat)
  const DEBUG_OPENROUTER = String(process.env.DEBUG_OPENROUTER || "1") === "1";
  const dbg = (...args) => {
    try {
      if (DEBUG_OPENROUTER) console.log("[openrouter][debug]", ...args);
    } catch {}
  };

  // Build model list from ENV or file (ENV preferred)
  let modelList = [];

  // 1) ENV: OPENROUTER_MODEL_LIST (comma or newline separated)
  const envModelList = process.env.OPENROUTER_MODEL_LIST;
  if (envModelList && typeof envModelList === "string") {
    const parts = envModelList.split(/\r?\n|,/).map(s => String(s || "").trim()).filter(Boolean).filter(s => !s.startsWith("#"));
    if (parts.length) modelList.push(...parts);
  }

  // 2) File: models.md if USE_MODEL_LIST=1 (kept for compatibility)
  if (!modelList.length && String(process.env.USE_MODEL_LIST || "").trim() === "1") {
    try {
      const fsSync = require("fs");
      const path = require("path");
      const p = path.join(__dirname, "config", "models.md");
      console.log("[openrouter][config] reading models from", p);
      if (fsSync.existsSync(p)) {
        const raw = fsSync.readFileSync(p, "utf8");
        for (const line of raw.split(/\r?\n/)) {
          const s = String(line || "").trim();
          if (!s || s.startsWith("#")) continue;
          modelList.push(s);
        }
      } else {
        console.log("[openrouter][config] models file not found");
      }
    } catch (e) {
      console.log("[openrouter][config] models read error", e?.message || e);
    }
  }

  // 3) Fallback: opts.model or DEFAULT_MODEL
  if (!modelList.length) {
    modelList = [String(opts.model || DEFAULT_MODEL)];
  }

  const keysRaw = listApiKeys();
  // Apply cooldown filter: skip keys rate-limited within window
  const now = Date.now();
  const cooldownMs = Number(process.env.OPENROUTER_KEY_COOLDOWN_MS || 60 * 60 * 1000); // default 60 minutes
  const keys = keysRaw.filter(k => {
    const until = rateLimitedUntil.get(k) || 0;
    return until <= now;
  });

  dbg("config flags", {
    USE_MODEL_LIST: String(process.env.USE_MODEL_LIST || ""),
    KEY_SOURCE: "ENV_ONLY", // harden: keys read only from ENV
  });
  dbg("config counts", { models: modelList.length, keys: keys.length, skippedKeys: (listApiKeys().length - keys.length) });
  if (!keys.length) throw new Error("No usable OpenRouter keys (all cooling down or missing)");

  const payloadBase = {
    messages,
    temperature: opts.temperature ?? 0.7,
    top_p: opts.top_p ?? 0.9,
    max_tokens: opts.max_tokens ?? 400,
  };

  let lastErr;
  // Progressive backoff sequence specifically for 429s between key attempts
  const backoffsMs = [500, 1000, 2000, 4000, 8000];

  for (let idx = 0; idx < keys.length; idx++) {
    const apiKey = keys[idx];

    // Try models in order (from modelList). No implicit "openrouter/auto".
    for (let mi = 0; mi < modelList.length; mi++) {
      const modelTry = modelList[mi];

      // If this key went rate-limited while iterating, break and rotate to next key immediately
      const until = rateLimitedUntil.get(apiKey) || 0;
      if (until > Date.now()) {
        console.log("[openrouter][skip] key under cooldown", { keyIndex: idx, remainingMs: until - Date.now() });
        break;
      }

      const abort = new AbortController();
      const t = setTimeout(() => abort.abort(), Math.min(20000, Number(process.env.OPENROUTER_TIMEOUT_MS) || 20000));
      try {
        dbg("fetch start", { keyIndex: idx, model: modelTry });
        const res = await fetch(`${baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.SITE_URL || "https://thevoitansgithub.vercel.app",
            "X-Title": "VOITANS Discord Bot",
          },
          body: JSON.stringify({ ...payloadBase, model: modelTry }),
          signal: abort.signal,
        });

        clearTimeout(t);

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          if (res.status === 429) {
            // Mark key as rate-limited for cooldown window
            rateLimitedUntil.set(apiKey, Date.now() + cooldownMs);
            console.error("[openrouter][http-error][rate-limit]", { keyIndex: idx, model: modelTry, status: 429, body: errText?.slice?.(0, 500) || errText, cooldownMs });
            dbg("rate-limit rotate-key", { keyIndex: idx, cooldownMs });
            const wait = backoffsMs[Math.min(idx, backoffsMs.length - 1)];
            await new Promise(r => setTimeout(r, wait));
            break; // break model loop -> next key
          }
          console.error("[openrouter][http-error]", { keyIndex: idx, model: modelTry, status: res.status, body: errText?.slice?.(0, 500) || errText });
          dbg("http-error", { status: res.status, body: (errText || "").slice(0, 200) });
          throw new Error(`OpenRouter HTTP ${res.status} ${errText}`);
        }

        const json = await res.json();
        dbg("response usage/choices", { usage: json?.usage, choicesLen: Array.isArray(json?.choices) ? json.choices.length : 0 });
        let text = json?.choices?.[0]?.message?.content?.trim?.();

        // Fallback (R1/Reasoning modelleri için): content boş ise reasoning/tool_outputs'tan özet çıkar
        if (!text) {
          const msg0 = json?.choices?.[0]?.message || {};
          const reasoning = typeof msg0.reasoning === "string" ? msg0.reasoning : Array.isArray(msg0.reasoning) ? msg0.reasoning.join("\n") : "";
          const toolOut = Array.isArray(msg0.tool_outputs) ? msg0.tool_outputs.map(t => t?.output || t?.content || "").join("\n") : "";
          const anyAlt = `${reasoning}\n${toolOut}`.trim();

          if (anyAlt) {
            // Basit çıkarım: son 3 satırdan bir özet oluştur
            const lines = anyAlt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
            const tail = lines.slice(-6); // biraz daha fazla bağlam
            // Çok uzun ise kısalt
            const merged = tail.join(" ").replace(/\s+/g, " ").trim();
            text = merged.slice(0, 800) || null;
            dbg("fallback-from-reasoning", { usedReasoning: !!reasoning, usedToolOutputs: !!toolOut, extractedLen: text ? text.length : 0 });
          }

          if (!text) {
            console.error("[openrouter][empty-response]", {
              model: modelTry,
              usage: json?.usage,
              choices0_keys: json?.choices ? Object.keys(json.choices[0] || {}) : [],
            });
            dbg("empty message.content", { model: modelTry });
            throw new Error("OpenRouter returned empty response");
          }
        }

        // Sadece sohbet modu
        return text;
      } catch (e) {
        clearTimeout(t);
        lastErr = e;
        console.error("[openrouter][fetch-error]", { keyIndex: idx, model: modelTry, err: e?.message || e, stack: String(e?.stack||"").slice(0,500) });
        dbg("fetch-error detail", { err: String(e?.stack || e).slice(0, 500) });
        // Network/timeout: try next model; if models exhausted, rotate key after small wait
        const moreModelsLeft = mi < modelList.length - 1;
        if (!moreModelsLeft) {
          await new Promise(r => setTimeout(r, 300));
        }
        continue;
      }
    }
    // proceed to next key
    continue;
  }

  // All keys failed
  throw lastErr || new Error("All OpenRouter keys failed");
}

/**
 * buildMessagesForUser
 * - Reads system prompt and builds messages array with user content
 * - Applies a length cap to user content to avoid excessive tokens
 */
/**
 * Basit niyet yönlendirme ve iki modlu mesaj kurucu:
 * - moderation: sadece JSON şemasıyla dön (doğal dil yok)
 * - chat: kısa ve konu dışına kaçma
 */
function detectIntent(text) {
  const s = (text || "").toLowerCase();
  const modHints = [
    "/purge", "/ban", "/kick", "/timeout",
    "mesajları sil", "tamamen sil", "temizle",
    "banla", "kick at", "sustur", "moderasyon"
  ];
  // Tam kelime eşleşmesi için regex kullan
  const modRegex = new RegExp(`\\b(${modHints.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`);
  if (modRegex.test(s)) return "moderation";
  return "chat";
}

async function buildMessagesForUser(userText, history = []) {
  const SYSTEM_BASE = await readPrompt();
  const capped = String(userText || "").slice(0, 2000);
  const intent = detectIntent(capped);

  const messages = [];

  if (intent === "moderation") {
    const SYSTEM = `
${SYSTEM_BASE}

GÖREV: Yalnızca aşağıdaki JSON şemasında cevap ver; doğal dil, açıklama veya ekstra karakter yazma.
ŞEMA:
{
  "action": "purge" | "ban" | "kick" | "timeout",
  "params": {
    "amount"?: number,      // purge için 1..100
    "userId"?: string,      // ban/kick/timeout için
    "reason"?: string,
    "durationSec"?: number  // timeout için
  }
}

KURALLAR:
- Metinden niyeti çıkart ve eksik parametreleri null/undefined bırakma; yoksa hiç koyma.
- Yetki/izin kontrolü yapma; onu bot yapacak. Sen sadece niyeti JSON’a dök.
- Bilinmiyorsa boş JSON yerine { "action": "purge", "params": {} } gibi en mantıklı minimal yapıyı ver.
- ÇIKTI: SADECE TEK BİR JSON nesnesi.`;
    messages.push({ role: "system", content: SYSTEM });
    messages.push({ role: "user", content: capped });
    return messages;
  }

  // chat intent
  const SYSTEM = `
ROL: VOITANS loncasının resmi asistanısın.
DİL: Varsayılan Türkçe (kullanıcı başka dilde yazarsa o dilde yanıtla).
ÜSLUP: Net, saygılı, kısa ve faydacı. Gereksiz laf kalabalığı yok.

KISITLAMALAR:
- Discord kurallarına uy. Toksik dil/NSFW yok. Kişisel veri/getir denmemeli.
- Kişiler hakkında veri yoksa "Elimde buna dair veri yok." de; uydurma.
- Konu dışına sapma; soruyu kısaca yanıtla veya 1-2 soru ile netleştir.

YANIT ŞEKLİ:
- Tek paragraf veya en fazla 3 madde.
- Emojiyi abartma (0-1 emoji).
- Linkleri kısa ve temiz ver.
- Üye/rol/izin konularında kesin konuşma; emin değilsen "yetki gerekiyor" de.
`;

  messages.push({ role: "system", content: SYSTEM });

  // Sadece kullanıcı mesajını ekle, geçmişi sistem mesajına dahil et
  messages.push({ role: "user", content: capped });

  return messages;
}

module.exports = {
  callOpenRouter,
  buildMessagesForUser,
};
