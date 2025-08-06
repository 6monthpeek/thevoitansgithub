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

  console.log("[openrouter][config] flags", {
    USE_MODEL_LIST: String(process.env.USE_MODEL_LIST || ""),
    KEY_SOURCE: "ENV_ONLY", // harden: keys read only from ENV
  });
  console.log("[openrouter][config] counts", { models: modelList.length, keys: keys.length, skippedKeys: keysRaw.length - keys.length });
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
            // If there are other models left for this key, we could try them, but since provider rate-limit tends to be per-key,
            // skip remaining models for this key and rotate to next key directly.
            const wait = backoffsMs[Math.min(idx, backoffsMs.length - 1)];
            await new Promise(r => setTimeout(r, wait));
            break; // break model loop -> next key
          }
          console.error("[openrouter][http-error]", { keyIndex: idx, model: modelTry, status: res.status, body: errText?.slice?.(0, 500) || errText });
          throw new Error(`OpenRouter HTTP ${res.status} ${errText}`);
        }

        const json = await res.json();
        const text = json?.choices?.[0]?.message?.content?.trim?.();

        if (!text) {
          console.error("[openrouter][empty-response]", {
            model: modelTry,
            usage: json?.usage,
            choices0_keys: json?.choices ? Object.keys(json.choices[0] || {}) : [],
          });
          throw new Error("OpenRouter returned empty response");
        }

        return text;
      } catch (e) {
        clearTimeout(t);
        lastErr = e;
        console.error("[openrouter][fetch-error]", { keyIndex: idx, model: modelTry, err: e?.message || e });
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
async function buildMessagesForUser(userText) {
  const SYSTEM = await readPrompt();
  const capped = String(userText || "").slice(0, 3000); // cap user content
  const messages = [];

  if (SYSTEM && SYSTEM.trim().length > 0) {
    messages.push({ role: "system", content: SYSTEM });
  } else {
    messages.push({
      role: "system",
      content:
        "You are VOITANS guild assistant. Be concise, helpful, and respectful. Answer in Turkish unless the user clearly writes in another language.",
    });
  }

  messages.push({ role: "user", content: capped });
  return messages;
}

module.exports = {
  callOpenRouter,
  buildMessagesForUser,
};
