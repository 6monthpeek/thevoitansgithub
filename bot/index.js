require("dotenv").config();
const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const { attachGuards } = require("./guards");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const fs = require("fs");
const path = require("path");

// MongoDB Logger'ı import et
const logger = require("./logger");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User
  ]
});

client.commands = new Collection();

// Slash komutları yükle
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

const commands = [];

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
  }
}

/**
 * Legacy event loader (klasörde modül bazlı event handler'lar varsa çalışsın diye korunuyor)
 * Yanı sıra tüm eventleri kapsayan merkezi wiring de eklendi (_wireAll).
 */
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.existsSync(eventsPath)
  ? fs.readdirSync(eventsPath).filter(file => file.endsWith(".js") && !file.startsWith("_"))
  : [];

/**
 * ÖNEMLİ: messageCreate için ÇİFT TETİKLEMENİN önüne geçmek adına,
 * merkezi _wireAll da kendi messageCreate dinleyicisini kuruyor (log amaçlı).
 * Bu nedenle legacy loader ile messageCreate'i bind ETME.
 */
for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event && typeof event === "object" && ("name" in event) && ("execute" in event)) {
    // messageCreate dosyasını legacy loader üzerinden tekrar bind etmeyelim.
    if (String(event.name) === "messageCreate") {
      // Sadece LOG amaçlı _wireAll üzerinden tek bağlama yapılacak.
      continue;
    }
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
}

// Merkezi wiring: tüm önemli eventleri ingest'e yollar
/**
 * Merkezi wiring: tüm önemli eventleri ingest'e yollar.
 * Not: messageCreate yanıtlayıcıyı legacy loader üzerinden devre dışı bıraktık,
 * böylece aynı mesaj için iki farklı handler tetiklenmeyecek.
 */
try {
  require(path.join(__dirname, "events", "_wireAll"))(client);
  console.log("✅ Merkezi event wiring aktif (_wireAll).");
} catch (e) {
  console.warn("⚠️ _wireAll yüklenemedi:", e?.message || e);
}

// MongoDB Logger event handlers
client.on('messageCreate', (message) => {
  logger.messageCreate(message);
});

client.on('messageUpdate', (oldMessage, newMessage) => {
  logger.messageUpdate(oldMessage, newMessage);
});

client.on('messageDelete', (message) => {
  logger.messageDelete(message);
});

client.on('interactionCreate', (interaction) => {
  logger.interactionCreate(interaction);
});

client.on('guildMemberAdd', (member) => {
  logger.guildMemberAdd(member);
});

client.on('guildMemberRemove', (member) => {
  logger.guildMemberRemove(member);
});

// Basit HTTP keep-alive sunucusu (Replit/Uptime ping için)
try {
  const http = require("http");
  const KEEPALIVE_PORT = process.env.KEEPALIVE_PORT || process.env.PORT || 8080; // Replit bazen PORT verir
  const server = http.createServer((req, res) => {
    if (req.url === "/keepalive" || req.url === "/" ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        ts: new Date().toISOString(),
        bot: {
          ready: !!client?.user,
          user: client?.user?.tag || null
        }
      }));
      return;
    }
    res.writeHead(404);
    res.end("not found");
  });
  server.listen(KEEPALIVE_PORT, () => {
    console.log(`🌐 Keep-alive HTTP listening on :${KEEPALIVE_PORT}`);
  });

  // Ek: Guards yönetimi için hafif HTTP API
  const SHARED_SECRET = process.env.GUARDS_SHARED_SECRET || process.env.SHARED_SECRET;
  const API_PORT = process.env.GUARDS_API_PORT || 8787;

  function readBody(req) {
    return new Promise((resolve) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => {
        try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
      });
    });
  }
  function send(res, code, obj) {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(obj));
  }

  const { loadConfig, saveConfig } = require("./guards");

  const api = http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      return send(res, 200, { ok: true, user: client?.user?.tag || null });
    }
    const secret = req.headers["x-guards-secret"];
    if (!SHARED_SECRET || secret !== SHARED_SECRET) {
      return send(res, 401, { ok: false, error: "unauthorized" });
    }

    if (req.method === "GET" && req.url === "/guards/status") {
      const cfg = loadConfig();
      return send(res, 200, { ok: true, config: cfg });
    }

    if (req.method === "POST" && (req.url === "/guards/enable" || req.url === "/guards/disable")) {
      const body = await readBody(req);
      const guard = String(body.guard || "");
      if (!guard) return send(res, 400, { ok: false, error: "guard required" });
      const cfg = loadConfig();
      cfg.guards = cfg.guards || {};
      cfg.guards[guard] = cfg.guards[guard] || {};
      cfg.guards[guard].enabled = req.url.endsWith("/enable");
      const ok = saveConfig(cfg);
      return send(res, ok ? 200 : 500, { ok });
    }

    if (req.method === "POST" && req.url === "/guards/config-set") {
      const body = await readBody(req);
      const pathStr = String(body.path || "");
      if (!pathStr) return send(res, 400, { ok: false, error: "path required" });
      const cfg = loadConfig();
      const parts = pathStr.split(".");
      let cur = cfg;
      while (parts.length > 1) {
        const p = parts.shift();
        if (!cur[p]) cur[p] = {};
        cur = cur[p];
      }
      cur[parts[0]] = body.value;
      const ok = saveConfig(cfg);
      return send(res, ok ? 200 : 500, { ok });
    }

    return send(res, 404, { ok: false, error: "not found" });
  });

  api.listen(API_PORT, () => {
    console.log(`🛡️ Guards HTTP API listening on :${API_PORT}`);
  });
} catch (e) {
  console.warn("HTTP keep-alive server başlatılamadı:", e?.message || e);
}

// Koruma altyapısını bağla (varsayılan: tüm guard'lar kapalı).
try {
  attachGuards(client);
  console.log("🛡️  Protection guards attached (defaults: disabled).");
} catch (e) {
  console.warn("⚠️ Guards attach sırasında hata:", e?.message || e);
}

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.TOKEN;
const APP_CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID;

if (!BOT_TOKEN) {
  console.error("❌ Bot token bulunamadı. DISCORD_BOT_TOKEN (tercihen) veya TOKEN env tanımlayın.");
  process.exit(1);
}
if (!APP_CLIENT_ID) {
  console.error("❌ Uygulama Client ID bulunamadı. DISCORD_CLIENT_ID (tercihen) veya CLIENT_ID env tanımlayın.");
  process.exit(1);
}
if (!GUILD_ID) {
  console.error("❌ Guild ID bulunamadı. DISCORD_GUILD_ID (tercihen) veya GUILD_ID env tanımlayın.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);

// Küçük HTTP keep-alive sunucusu (Replit/Uptime ping için)
try {
  const http = require("http");
  const KEEPALIVE_PORT = process.env.KEEPALIVE_PORT || process.env.PORT || 8080; // Replit bazen PORT verir
  const server = http.createServer((req, res) => {
    if (req.url === "/keepalive" || req.url === "/" ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        ts: new Date().toISOString(),
        bot: {
          ready: !!client?.user,
          user: client?.user?.tag || null
        }
      }));
      return;
    }
    res.writeHead(404);
    res.end("not found");
  });
  server.listen(KEEPALIVE_PORT, () => {
    console.log(`🌐 Keep-alive HTTP listening on :${KEEPALIVE_PORT}`);
  });
} catch (e) {
  console.warn("HTTP keep-alive server başlatılamadı:", e?.message || e);
}

/**
 * Robust login with retry (exponential backoff + jitter)
 */
let loginAttempt = 0;
async function robustLogin() {
  const maxDelay = 60_000; // 60s cap
  try {
    loginAttempt += 1;
    await client.login(BOT_TOKEN);
    loginAttempt = 0; // success -> reset
  } catch (err) {
    const base = Math.min(1000 * Math.pow(2, loginAttempt), maxDelay);
    const jitter = Math.floor(Math.random() * 1000);
    const delay = base + jitter;
    console.error(`[login][retry] attempt=${loginAttempt} in ${delay}ms`, err?.message || err);
    setTimeout(robustLogin, delay);
  }
}
robustLogin();

// Reconnect/guard hooks
client.on("shardError", (error) => {
  console.error("[discord][shardError]", error?.message || error);
});
client.on("error", (error) => {
  console.error("[discord][error]", error?.message || error);
});
client.on("warn", (m) => console.warn("[discord][warn]", m));
client.on("disconnect", (e) => {
  console.warn("[discord][disconnect]", e);
  // Let discord.js attempt reconnect; if it fails, our robustLogin handles next tries
});

process.on("unhandledRejection", (reason) => {
  console.error("[process][unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[process][uncaughtException]", err);
});

// Slash komutlarını yükle
(async () => {
  try {
    console.log("🔄 Slash komutları yükleniyor...");
    await rest.put(
      Routes.applicationGuildCommands(APP_CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash komutları yüklendi.");
  } catch (error) {
    console.error("❌ Slash komutları yüklenirken hata:", error);
  }
})();
