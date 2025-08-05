const { EmbedBuilder } = require("discord.js");
const path = require("path");
const logChannels = require(path.join(__dirname, "../../logChannels.json"));

const { postLog, baseUser, baseGuild, baseChannel, enrichUserData } = require("../_logIngest");

module.exports = {
  name: "messageDelete",
  async execute(message) {
    // 1) Site'ye log gönder (merkezî helper ile; partial/DM durumlarına toleranslı)
    try {
      const isDM = message?.channel?.type === 1 || message?.channel?.isDMBased?.();
      const channel = message?.channel || null;
      const guild = message?.guild || channel?.guild || null;
      const user = message?.author || message?.member?.user || null;

      // Kullanıcı bilgilerini zenginleştir (guild adı iptallerine karşı eventten ismi geçir)
      const enrichedData = guild && user ? await enrichUserData(user.id, guild.id, guild.name) : {};

      await postLog({
        event: "messageDelete",
        // Üst seviyede ID'leri garanti et
        guildId: guild?.id || undefined,
        userId: user?.id || undefined,
        channelId: channel?.id || undefined,
        ...(guild ? baseGuild(guild) : {}),
        ...(channel ? baseChannel(channel) : {}),
        ...(user ? baseUser(user) : {}),
        data: {
          content: typeof message?.content === "string" ? message.content : null,
          messageId: message?.id,
          isDM: Boolean(isDM),
          // Zengin alanlar data içine
          ...enrichedData, // { userDisplay, userName, userAvatarUrl, displayName, guildName, userId, guildId }
        },
      });
    } catch (e) {
      console.warn("[LOG-INGEST] messageDelete send error:", e?.message || e);
    }

    // 2) Discord log kanalına da yaz (mevcut davranış)
    let logChannel;
    try {
      logChannel = await message.guild.channels.fetch(logChannels.general);
    } catch (err) {
      console.warn("[LOG] Kanal bulunamadı veya erişim hatası:", err.message);
      return;
    }

    if (!logChannel || !logChannel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setTitle("🗑️ Mesaj Silindi")
      .addFields(
        { name: "👤 Kullanıcı", value: `${message.author}`, inline: true },
        { name: "📺 Kanal", value: `${message.channel}`, inline: true },
        {
          name: "💬 İçerik",
          value: message.content?.slice(0, 1024) || "*Boş mesaj*",
          inline: false
        }
      )
      .setColor("Red")
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
  },
};
