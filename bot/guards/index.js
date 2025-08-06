// Mineary benzeri koruma altyapısı - Guard yükleyici/çekirdek
// Varsayılan: tüm korumalar kapalı. bot/config/protection.json üzerinden etkinleştir.
// Discord.js v14 uyumlu. Mevcut event sistemine (events/_wireAll.js) entegre edilmek üzere tasarlandı.

const fs = require("fs");
const path = require("path");
const {
  AuditLogEvent,
  PermissionFlagsBits,
  PermissionsBitField,
  ChannelType,
  time
} = require("discord.js");

const CONFIG_PATH = path.join(__dirname, "..", "config", "protection.json");

// -------------------- Helper: Config --------------------
function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.warn("[guards] protection.json okunamadı, varsayılanlar kullanılacak:", e?.message);
    return {
      guildId: "",
      logChannelId: "",
      moderatorRoleIds: [],
      bypassUserIds: [],
      rateLimits: { windowMs: 10000 },
      guards: {}
    };
  }
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("[guards] protection.json yazılamadı:", e?.message);
    return false;
  }
}

// -------------------- Helper: Rate limit counter --------------------
class Counter {
  constructor(windowMs = 10000) {
    this.windowMs = windowMs;
    this.map = new Map();
  }
  inc(key) {
    const now = Date.now();
    const item = this.map.get(key) || { c: 0, t: now + this.windowMs };
    if (now > item.t) {
      item.c = 0;
      item.t = now + this.windowMs;
    }
    item.c++;
    this.map.set(key, item);
    return item.c;
  }
  get(key) {
    const item = this.map.get(key);
    if (!item) return 0;
    if (Date.now() > item.t) return 0;
    return item.c;
  }
}

const counters = {
  generic: new Counter(),
};

// -------------------- Helper: Permissions / Bypass --------------------
function isModerator(member, cfg) {
  if (!member) return false;
  if (cfg.moderatorRoleIds?.length && member.roles.cache.some(r => cfg.moderatorRoleIds.includes(r.id))) return true;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  return false;
}

function canBypass(userId, member, cfg) {
  if (!userId) return false;
  if (cfg.bypassUserIds?.includes(userId)) return true;
  if (isModerator(member, cfg)) return true;
  return false;
}

// -------------------- Helper: Logging --------------------
async function getLogChannel(client, cfg) {
  if (!cfg.logChannelId) return null;
  try {
    return await client.channels.fetch(cfg.logChannelId).catch(() => null);
  } catch {
    return null;
  }
}

async function log(client, cfg, payload) {
  const ch = await getLogChannel(client, cfg);
  if (!ch || !ch.isTextBased()) return;
  const safe = (v) => (v ? String(v).slice(0, 1900) : "—");
  const lines = [];

  if (payload.title) lines.push(`**${payload.title}**`);
  if (payload.desc) lines.push(payload.desc);
  if (payload.fields) {
    for (const f of payload.fields) {
      lines.push(`• **${f.name}:** ${safe(f.value)}`);
    }
  }
  if (payload.footer) lines.push(`_${payload.footer}_`);

  await ch.send(lines.join("\n"));
}

// -------------------- Helper: Audit log culprit --------------------
async function findExecutor(guild, type, targetId) {
  try {
    const fetched = await guild.fetchAuditLogs({ type, limit: 1 });
    const entry = fetched.entries.first();
    if (!entry) return null;
    // Yakın zamanda ve hedef eşleşiyorsa daha güvenilir
    const within = Date.now() - entry.createdTimestamp < 15_000;
    if (within && (!targetId || entry.target?.id === targetId)) {
      return entry.executorId || entry.executor?.id || null;
    }
    return entry.executorId || entry.executor?.id || null;
  } catch {
    return null;
  }
}

// -------------------- Helper: Safe actions --------------------
async function safetyTimeout(member, seconds = 600, reason = "Protection") {
  try {
    if (!member?.moderatable) return false;
    await member.timeout(seconds * 1000, reason);
    return true;
  } catch {
    return false;
  }
}

async function safetyBan(guild, userId, reason = "Protection") {
  try {
    await guild.bans.create(userId, { reason });
    return true;
  } catch {
    return false;
  }
}

// -------------------- Guards (Minimal skeletons, default off) --------------------
async function onChannelCreate(client, cfg, channel) {
  if (!cfg.guards?.channelGuard?.enabled) return;

  const key = `cc:${channel.guild.id}:${channel.creatorId || "unknown"}`;
  const count = counters.generic.inc(key);
  if (cfg.rateLimits?.channelCreate && count > cfg.rateLimits.channelCreate) {
    const execId = await findExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    const member = execId ? await channel.guild.members.fetch(execId).catch(() => null) : null;
    if (canBypass(execId, member, cfg)) return;

    await log(client, cfg, {
      title: "Spike: Çoklu Kanal Oluşturma",
      fields: [
        { name: "Kullanıcı", value: execId ? `<@${execId}> (${execId})` : "bilinmiyor" },
        { name: "Kanal", value: `${channel.name} (${channel.id})` },
        { name: "Sayaç", value: String(count) }
      ],
      footer: "channelGuard"
    });

    if (cfg.guards.antiNuke?.enabled) {
      const acted = await safetyTimeout(member, cfg.guards.antiNuke.timeoutSeconds || 600, "channelCreate spike");
      if (!acted) await safetyBan(channel.guild, execId, "channelCreate spike");
    }
  }
}

async function onChannelDelete(client, cfg, channel) {
  if (!cfg.guards?.channelGuard?.enabled) return;

  const execId = await findExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
  const member = execId ? await channel.guild.members.fetch(execId).catch(() => null) : null;
  if (canBypass(execId, member, cfg)) return;

  const count = counters.generic.inc(`cd:${channel.guild.id}:${execId || "unknown"}`);

  await log(client, cfg, {
    title: "Kanal Silindi",
    fields: [
      { name: "Silici", value: execId ? `<@${execId}> (${execId})` : "bilinmiyor" },
      { name: "Kanal", value: `${channel.name} (${channel.id})` },
      { name: "Sayaç", value: String(count) }
    ],
    footer: "channelGuard"
  });

  // Basit re-create (ad, tip) - tam birebir kopya değildir
  if (cfg.guards.channelGuard.recreateOnDelete && channel?.type && channel?.name) {
    try {
      const parent = channel.parentId ? await channel.guild.channels.fetch(channel.parentId).catch(() => null) : null;
      const created = await channel.guild.channels.create({
        name: channel.name,
        type: channel.type,
        parent: parent?.id || undefined,
        reason: "Recreate deleted channel (protection)"
      });
      await log(client, cfg, {
        title: "Kanal Yeniden Oluşturuldu",
        fields: [
          { name: "Yeni Kanal", value: `${created} (${created.id})` }
        ],
        footer: "channelGuard"
      });
    } catch {}
  }

  if (cfg.guards.antiNuke?.enabled && count > (cfg.rateLimits?.channelDelete || 2)) {
    const acted = await safetyTimeout(member, cfg.guards.antiNuke.timeoutSeconds || 600, "channelDelete spike");
    if (!acted) await safetyBan(channel.guild, execId, "channelDelete spike");
  }
}

async function onRoleDelete(client, cfg, role) {
  if (!cfg.guards?.roleGuard?.enabled) return;

  const execId = await findExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
  const member = execId ? await role.guild.members.fetch(execId).catch(() => null) : null;
  if (canBypass(execId, member, cfg)) return;

  const count = counters.generic.inc(`rd:${role.guild.id}:${execId || "unknown"}`);

  await log(client, cfg, {
    title: "Rol Silindi",
    fields: [
      { name: "Silici", value: execId ? `<@${execId}> (${execId})` : "bilinmiyor" },
      { name: "Rol", value: `${role.name} (${role.id})` },
      { name: "Sayaç", value: String(count) }
    ],
    footer: "roleGuard"
  });

  if (cfg.guards.antiNuke?.enabled && count > (cfg.rateLimits?.roleDelete || 2)) {
    const acted = await safetyTimeout(member, cfg.guards.antiNuke.timeoutSeconds || 600, "roleDelete spike");
    if (!acted) await safetyBan(role.guild, execId, "roleDelete spike");
  }
}

async function onGuildBanAdd(client, cfg, ban) {
  if (!cfg.guards?.memberGuard?.enabled) return;

  const execId = await findExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
  const member = execId ? await ban.guild.members.fetch(execId).catch(() => null) : null;
  if (canBypass(execId, member, cfg)) return;

  const count = counters.generic.inc(`ban:${ban.guild.id}:${execId || "unknown"}`);

  await log(client, cfg, {
    title: "Kullanıcı Yasaklandı",
    fields: [
      { name: "Yasaklayan", value: execId ? `<@${execId}> (${execId})` : "bilinmiyor" },
      { name: "Hedef", value: `${ban.user.tag} (${ban.user.id})` },
      { name: "Sayaç", value: String(count) }
    ],
    footer: "memberGuard"
  });

  if (cfg.guards.memberGuard.blockMassBan && count > (cfg.rateLimits?.banAdd || 3) && cfg.guards.antiNuke?.enabled) {
    const acted = await safetyTimeout(member, cfg.guards.antiNuke.timeoutSeconds || 600, "mass-ban spike");
    if (!acted) await safetyBan(ban.guild, execId, "mass-ban spike");
  }
}

async function onWebhooksUpdate(client, cfg, channel) {
  if (!cfg.guards?.webhookGuard?.enabled) return;

  const execId = await findExecutor(channel.guild, AuditLogEvent.WebhookCreate /* or Update */, null);
  const member = execId ? await channel.guild.members.fetch(execId).catch(() => null) : null;
  if (canBypass(execId, member, cfg)) return;

  const count = counters.generic.inc(`wh:${channel.guild.id}:${execId || "unknown"}`);

  await log(client, cfg, {
    title: "Webhook Değişikliği",
    fields: [
      { name: "Kullanıcı", value: execId ? `<@${execId}> (${execId})` : "bilinmiyor" },
      { name: "Kanal", value: `${channel?.name || "?"} (${channel?.id})` },
      { name: "Sayaç", value: String(count) }
    ],
    footer: "webhookGuard"
  });
}

// -------------------- Public API --------------------
function attachGuards(client) {
  const cfg = loadConfig();

  // Channel
  client.on("channelCreate", (ch) => onChannelCreate(client, cfg, ch));
  client.on("channelDelete", (ch) => onChannelDelete(client, cfg, ch));

  // Role
  client.on("roleDelete", (role) => onRoleDelete(client, cfg, role));

  // Member moderation
  client.on("guildBanAdd", (ban) => onGuildBanAdd(client, cfg, ban));

  // Webhook
  client.on("webhooksUpdate", (ch) => onWebhooksUpdate(client, cfg, ch));

  console.log("[guards] Koruma altyapısı yüklendi. Tüm guard'lar varsayılan kapalı.");
  return {
    reload: () => Object.assign(cfg, loadConfig()),
    config: cfg
  };
}

module.exports = {
  attachGuards,
  loadConfig,
  saveConfig
};
