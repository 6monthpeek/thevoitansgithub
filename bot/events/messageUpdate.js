/* eslint-disable no-undef */
// 📁 events/messageUpdate.js
// Not: Merkezî ingest helper'ını kullan (tek noktadan diagnostic ve normalizasyon)
const { postLog, baseUser, baseGuild, baseChannel, enrichUserData } = require("./_logIngest");

module.exports = {
  name: "messageUpdate",
  async execute(oldMessage, newMessage) {
    try {
      const guild = newMessage?.guild || oldMessage?.guild;
      const channel = newMessage?.channel || oldMessage?.channel;
      const author = newMessage?.author || oldMessage?.author;

      // Kullanıcı bilgilerini zenginleştir
      const enrichedData = guild && author ? await enrichUserData(author.id, guild.id) : {};

      // 0) Ana event: önce/sonra içerik, ek bağlamlar
      await postLog({
        event: "messageUpdate",
        ...baseGuild(guild),
        ...baseChannel(channel),
        ...baseUser(author),
        data: {
          messageId: newMessage?.id || oldMessage?.id,
          before: typeof oldMessage?.content === "string" ? oldMessage.content : undefined,
          after: typeof newMessage?.content === "string" ? newMessage.content : undefined,
          editedTimestamp: newMessage?.editedTimestamp,
          hasEmbeds: Boolean(newMessage?.embeds?.length || oldMessage?.embeds?.length),
          hasComponents: Boolean(newMessage?.components?.length || oldMessage?.components?.length),
          attachmentsBefore: Array.from(oldMessage?.attachments?.values?.() || []).map((a) => ({ id: a.id, name: a.name, size: a.size, url: a.url })),
          attachmentsAfter: Array.from(newMessage?.attachments?.values?.() || []).map((a) => ({ id: a.id, name: a.name, size: a.size, url: a.url })),
          ...enrichedData, // Zenginleştirilmiş kullanıcı bilgilerini ekle
        },
      });

      // 1) İçerik değişimi tespiti (ayrı olay)
      const before = String(oldMessage?.content || "");
      const after = String(newMessage?.content || "");
      if (before !== after) {
        await postLog({
          event: "messageUpdate_contentChanged",
          ...baseGuild(guild),
          ...baseChannel(channel),
          ...baseUser(author),
          data: {
            messageId: newMessage?.id || oldMessage?.id,
            before,
            after,
            delta: {
              removed: before && !after ? true : undefined,
              added: after && !before ? true : undefined,
              lengthBefore: before.length,
              lengthAfter: after.length,
            },
            ...enrichedData, // Zenginleştirilmiş kullanıcı bilgilerini ekle
          },
        });
      }
    } catch (e) {
      console.warn("[events/messageUpdate] error:", e?.message || e);
      try {
        await postLog({
          event: "messageUpdate_error",
          data: { message: String(e?.message || e) },
        });
      } catch {}
    }
  },
};
