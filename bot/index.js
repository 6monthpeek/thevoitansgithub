require("dotenv").config();
const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const fs = require("fs");
const path = require("path");

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

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event && typeof event === "object" && ("name" in event) && ("execute" in event)) {
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
}

// Merkezi wiring: tüm önemli eventleri ingest'e yollar
try {
  require(path.join(__dirname, "events", "_wireAll"))(client);
  console.log("✅ Merkezi event wiring aktif (_wireAll).");
} catch (e) {
  console.warn("⚠️ _wireAll yüklenemedi:", e?.message || e);
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

client.login(BOT_TOKEN);

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
