// /protection komutu: korumaları (guards) görüntüleme ve aç/kapa (Mineary tarzı manuel kontrol)
// Varsayılan: hiçbir guard aktif değil. Değişiklikler bot/config/protection.json dosyasına yazılır.

const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { loadConfig, saveConfig } = require("../guards");

const CONFIG_PATH = path.join(__dirname, "..", "config", "protection.json");

function readConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return loadConfig ? loadConfig() : {};
  }
}

function writeConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
    return true;
  } catch (e) {
    if (saveConfig) return saveConfig(cfg);
    return false;
  }
}

const GUARD_KEYS = [
  "antiNuke",
  "roleGuard",
  "channelGuard",
  "webhookGuard",
  "guildUpdateGuard",
  "memberGuard",
  "messageGuard",
  "inviteGuard",
  "vanityGuard"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("protection")
    .setDescription("Koruma altyapısını yönet (görüntüle/aç/kapat/ayar)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sc =>
      sc.setName("status")
        .setDescription("Tüm guard durumlarını görüntüle")
    )
    .addSubcommand(sc =>
      sc.setName("enable")
        .setDescription("Bir guard'ı etkinleştir")
        .addStringOption(o =>
          o.setName("guard")
            .setDescription("Guard adı")
            .setRequired(true)
            .addChoices(
              { name: "antiNuke", value: "antiNuke" },
              { name: "roleGuard", value: "roleGuard" },
              { name: "channelGuard", value: "channelGuard" },
              { name: "webhookGuard", value: "webhookGuard" },
              { name: "guildUpdateGuard", value: "guildUpdateGuard" },
              { name: "memberGuard", value: "memberGuard" },
              { name: "messageGuard", value: "messageGuard" },
              { name: "inviteGuard", value: "inviteGuard" },
              { name: "vanityGuard", value: "vanityGuard" }
            )
        )
    )
    .addSubcommand(sc =>
      sc.setName("disable")
        .setDescription("Bir guard'ı devre dışı bırak")
        .addStringOption(o =>
          o.setName("guard")
            .setDescription("Guard adı")
            .setRequired(true)
            .addChoices(
              { name: "antiNuke", value: "antiNuke" },
              { name: "roleGuard", value: "roleGuard" },
              { name: "channelGuard", value: "channelGuard" },
              { name: "webhookGuard", value: "webhookGuard" },
              { name: "guildUpdateGuard", value: "guildUpdateGuard" },
              { name: "memberGuard", value: "memberGuard" },
              { name: "messageGuard", value: "messageGuard" },
              { name: "inviteGuard", value: "inviteGuard" },
              { name: "vanityGuard", value: "vanityGuard" }
            )
        )
    )
    .addSubcommand(sc =>
      sc.setName("config-get")
        .setDescription("config alanını görüntüle")
        .addStringOption(o =>
          o.setName("path")
            .setDescription("JSON path (ör. rateLimits.channelDelete veya guards.antiNuke.thresholdScore)")
            .setRequired(true)
        )
    )
    .addSubcommand(sc =>
      sc.setName("config-set")
        .setDescription("config alanını değiştir")
        .addStringOption(o =>
          o.setName("path")
            .setDescription("JSON path (ör. guards.antiNuke.enabled)")
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName("value")
            .setDescription("Yeni değer (JSON olarak; ör. true, 3, \"abc\", [\"x\"])")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    // Sadece aynı guild'de ve admin olanlar
    const me = interaction.member;
    if (!me?.permissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "Bu komut için yönetici yetkisi gerekir.", ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    const cfg = readConfig();

    if (!cfg.guards) cfg.guards = {};

    if (sub === "status") {
      const lines = [];
      lines.push("Koruma Durumu:");
      for (const k of GUARD_KEYS) {
        const en = cfg.guards[k]?.enabled ? "Açık" : "Kapalı";
        lines.push(`• ${k}: ${en}`);
      }
      return interaction.reply({ content: lines.join("\n"), ephemeral: true });
    }

    if (sub === "enable" || sub === "disable") {
      const guard = interaction.options.getString("guard");
      if (!GUARD_KEYS.includes(guard)) {
        return interaction.reply({ content: `Geçersiz guard. Kullanılabilir: ${GUARD_KEYS.join(", ")}`, ephemeral: true });
      }
      cfg.guards[guard] = cfg.guards[guard] || {};
      cfg.guards[guard].enabled = sub === "enable";
      if (!writeConfig(cfg)) {
        return interaction.reply({ content: "Config kaydedilemedi.", ephemeral: true });
      }
      return interaction.reply({ content: `${guard} ${sub === "enable" ? "etkinleştirildi" : "devre dışı bırakıldı"}.`, ephemeral: true });
    }

    if (sub === "config-get") {
      const pathStr = interaction.options.getString("path");
      const val = getByPath(cfg, pathStr);
      return interaction.reply({ content: `\`${pathStr}\` = \`\`\`json\n${JSON.stringify(val, null, 2)}\n\`\`\``, ephemeral: true });
    }

    if (sub === "config-set") {
      const pathStr = interaction.options.getString("path");
      const raw = interaction.options.getString("value");
      let value;
      try {
        value = JSON.parse(raw);
      } catch {
        return interaction.reply({ content: "Value JSON parse edilemedi. Örn: true, 3, \"abc\", [\"x\"]", ephemeral: true });
      }
      setByPath(cfg, pathStr, value);
      if (!writeConfig(cfg)) {
        return interaction.reply({ content: "Config kaydedilemedi.", ephemeral: true });
      }
      return interaction.reply({ content: `Güncellendi: \`${pathStr}\``, ephemeral: true });
    }
  }
};

function getByPath(obj, pathStr) {
  return pathStr.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}
function setByPath(obj, pathStr, value) {
  const parts = pathStr.split(".");
  let cur = obj;
  while (parts.length > 1) {
    const p = parts.shift();
    if (!cur[p]) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[0]] = value;
}
