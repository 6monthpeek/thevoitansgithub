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
 * - Primary: OPENROUTER_API_KEY
 * - Secondary: OPENROUTER_API_KEY1, OPENROUTER_API_KEY2, ...
 * When 429 received, we retry once per additional key with small backoff.
 * NOTE: Prefer official pooling (Integrations) for production. This is a best-effort fallback.
 */
function listApiKeys() {
  const keys = [];

  // 1) If USE_KEY_LIST=1, read keys from bot/config/openrouter-keys.md (one per line, ignoring comments)
  const useKeyList = String(process.env.USE_KEY_LIST || "").trim() === "1";
  if (useKeyList) {
    try {
      const fsSync = require("fs");
      const path = require("path");
      const p = path.join(__dirname, "config", "openrouter-keys.md");
      console.log("[openrouter][config] reading keys from", p);
      if (fsSync.existsSync(p)) {
        const raw = fsSync.readFileSync(p, "utf8");
        for (const line of raw.split(/\r?\n/)) {
          const s = String(line || "").trim();
          if (!s || s.startsWith("#")) continue;
          keys.push(s);
        }
      } else {
        console.log("[openrouter][config] keys file not found");
      }
    } catch (e) {
      console.log("[openrouter][config] keys read error", e?.message || e);
    }
  }

  // 2) Also collect from ENV (primary + OPENROUTER_API_KEY1..N)
  const primary = process.env.OPENROUTER_API_KEY ? String(process.env.OPENROUTER_API_KEY).trim() : "";
  if (primary) keys.push(primary);
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

async function callOpenRouter(messages, opts = {}) {
  const baseURL = DEFAULT_BASE;

  // Build model list:
  // - If USE_MODEL_LIST=1 and bot/config/models.md exists, read ordered list from there (ignore comments).
  // - Else fallback to single model from opts.model or DEFAULT_MODEL.
  let modelList = [];
  const useModelList = String(process.env.USE_MODEL_LIST || "").trim() === "1";
  if (useModelList) {
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
  if (!modelList.length) {
    modelList = [String(opts.model || DEFAULT_MODEL)];
  }

  const keys = listApiKeys();
  console.log("[openrouter][config] flags", {
    USE_MODEL_LIST: String(process.env.USE_MODEL_LIST || ""),
    USE_KEY_LIST: String(process.env.USE_KEY_LIST || ""),
  });
  console.log("[openrouter][config] counts", { models: modelList.length, keys: keys.length });
  if (!keys.length) throw new Error("Missing OPENROUTER_API_KEY (and OPENROUTER_API_KEY1..N) or key list in bot/config/openrouter-keys.md");

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
            console.error("[openrouter][http-error][rate-limit]", { keyIndex: idx, model: modelTry, status: 429, body: errText?.slice?.(0, 500) || errText });
            // On 429: if there are other models left for this key, try next model.
            // If all models for this key exhausted, backoff then rotate to next key.
            const moreModelsLeft = mi < modelList.length - 1;
            if (moreModelsLeft) {
              continue; // try next model with same key
            }
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
