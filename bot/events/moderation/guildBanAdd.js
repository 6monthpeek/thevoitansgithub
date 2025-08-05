const { Events, EmbedBuilder } = require("discord.js");
const logChannels = require("../../logChannels.json");
const { postLog, baseUser, baseGuild, enrichUserData } = require("../_logIngest");

/* eslint-disable no-undef */
module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban) {
    // 1) Site'ye ingest
    try {
      const guild = ban?.guild;
      const user = ban?.user;

      // Kullanıcı bilgilerini zenginleştir
      const enrichedData = guild && user ? await enrichUserData(user.id, guild.id) : {};

      await postLog({
        event: "guildBanAdd",
        ...baseGuild(guild),
        ...baseUser(user),
        data: {
          userTag: user?.tag,
          ...enrichedData, // Zenginleştirilmiş kullanıcı bilgilerini ekle
        },
      });
    } catch (e) {
      console.warn("[LOG-INGEST] guildBanAdd send error:", e?.message || e);
    }

    // 2) Mevcut Discord kanalına embed gönder
    const logChannelId = logChannels.ban; //logchannels.json içindeki ban anahtarının (yani ban log'unun) ID’sini alır.
    const logChannel = ban.guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle("🚫 Kullanıcı Yasaklandı")
      .setColor(0xff0000)
      .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "Kullanıcı", value: `${ban.user.tag} (${ban.user.id})`, inline: false },
        { name: "Tarih", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setFooter({ text: `${ban.guild.name}`, iconURL: ban.guild.iconURL({ dynamic: true }) });

    logChannel.send({ embeds: [embed] }).catch(console.error);
  },
};
