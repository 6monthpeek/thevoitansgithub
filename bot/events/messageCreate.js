/* eslint-disable no-undef */
// 📁 events/messageCreate.js
// Not: Merkezî ingest helper'ını kullan (tek noktadan diagnostic ve normalizasyon)
const { postLog, baseUser, baseGuild, baseChannel, enrichUserData } = require("./_logIngest");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    try {
      if (!message || message.author?.bot) return;

      // Kullanıcı bilgilerini zenginleştir
      const enrichedData = message.guild && message.author ? await enrichUserData(message.author.id, message.guild.id) : {};

      // 0) Her messageCreate'i temel bilgiyle ingest et (UI özetleri için gerekli)
      await postLog({
        event: "messageCreate",
        ...baseGuild(message.guild),
        ...baseChannel(message.channel),
        ...baseUser(message.author),
        data: {
          content: typeof message.content === "string" ? message.content : undefined,
          messageId: message.id,
          attachments: Array.from(message.attachments?.values?.() || []).map((a) => ({
            id: a.id,
            name: a.name,
            size: a.size,
            contentType: a.contentType || a.content_type,
            url: a.url,
          })),
          hasEmbeds: Boolean(message.embeds?.length),
          hasComponents: Boolean(message.components?.length),
          isReply: Boolean(message.reference?.messageId),
          referencedMessageId: message.reference?.messageId,
          ...enrichedData, // Zenginleştirilmiş kullanıcı bilgilerini ekle
        },
      });

      // 1) Link paylaşımı tespiti (basit regex) - ayrı bir event ile detaylı log
      const content = String(message?.content || "");
      const linkMatch = content.match(/https?:\/\/\S+/gi);
      if (linkMatch && linkMatch.length > 0) {
        await postLog({
          event: "messageCreate_link",
          ...baseGuild(message.guild),
          ...baseChannel(message.channel),
          ...baseUser(message.author),
          data: {
            content,
            messageId: message.id,
            links: linkMatch.slice(0, 10),
            ...enrichedData, // Zenginleştirilmiş kullanıcı bilgilerini ekle
          },
        });
      }

      // 2) Mention'lar (user, role, everyone/here)
      const userMentions = Array.from(message.mentions?.users?.values?.() || []).map((u) => ({
        id: u.id,
        username: u.username,
      }));
      const roleMentions = Array.from(message.mentions?.roles?.values?.() || []).map((r) => ({
        id: r.id,
        name: r.name,
      }));
      if (userMentions.length || roleMentions.length || message.mentions?.everyone) {
        await postLog({
          event: "messageCreate_mentions",
          ...baseGuild(message.guild),
          ...baseChannel(message.channel),
          ...baseUser(message.author),
          data: {
            messageId: message.id,
            userMentions,
            roleMentions,
            everyone: Boolean(message.mentions?.everyone),
            ...enrichedData, // Zenginleştirilmiş kullanıcı bilgilerini ekle
          },
        });
      }

      // 3) Basit komut/önek alanı (geleceğe hazır)
      // const PREFIX = process.env.BOT_PREFIX || "!";
      // if (content.startsWith(PREFIX)) { ... }

    } catch (e) {
      console.warn("[events/messageCreate] error:", e?.message || e);
      // hata da ingest'e düşsün
      try {
        await postLog({
          event: "messageCreate_error",
          data: { message: String(e?.message || e) },
        });
      } catch {}
    }
  },
};
