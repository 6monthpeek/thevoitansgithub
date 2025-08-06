const { buildMessagesForUser, callOpenRouter } = require("../openrouter");

const TARGET_CHANNEL_ID = process.env.OPENROUTER_CHANNEL_ID || "1140379269705502821";
const MAX_DISCORD_REPLY_LEN = 1800; // 2000 limitine güvenli tampon
const HISTORY_LIMIT = Number(process.env.OPENROUTER_HISTORY_LIMIT || 30); // Son 30 mesaj
const THINKING_EMOJI = "💭";

/**
 * messageCreate
 * - Belirlenen kanalda gelen kullanıcı mesajlarına OpenRouter ile yanıt verir.
 * - Bot mesajlarını ve salt komut prefix'li mesajları (opsiyonel) atlar.
 * - Uzun içerikleri kısaltır, hata durumunda kullanıcıyı nazikçe bilgilendirir.
 */
module.exports = {
  name: "messageCreate",
  once: false,
  async execute(message, client) {
    try {
      // 1) Filtreler
      if (!message || !message.channel || !message.author) return;
      if (message.author.bot) return; // bot mesajları yok
      if (String(message.channel.id) !== String(TARGET_CHANNEL_ID)) return; // sadece hedef kanal

      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        // Ortam değişkeni yoksa kullanıcıyı bilgilendir ve geri dön
        if (Math.random() < 0.02) {
          await message.channel.send("AI yanıt sistemi şu an devre dışı (OPENROUTER_API_KEY eksik).");
        }
        return;
      }

      const userText = String(message.content || "").trim();
      if (!userText) return;

      // 2) Kanal geçmişini al (son 30 mesaj, metin + mention/ek özet)
      let history = [];
      try {
        const fetched = await message.channel.messages.fetch({ limit: Math.min(100, HISTORY_LIMIT) });
        // En eskiden yeniye sıralama
        const arr = Array.from(fetched.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        history = arr.map((m) => {
          const parts = [];
          // Mention özetleri
          if (m.mentions) {
            const us = m.mentions.users?.map?.(u => `@${u.username}`) || [];
            const rs = m.mentions.roles?.map?.(r => `@role:${r.name}`) || [];
            const cs = m.mentions.channels?.map?.(c => `#${c.name}`) || [];
            const all = [...us, ...rs, ...cs].filter(Boolean);
            if (all.length) parts.push(`Mentions: ${all.join(", ")}`);
          }
          // Attachment/Embed özetleri
          const att = m.attachments?.size ? `Attachments:${m.attachments.size}` : "";
          const emb = m.embeds?.length ? `Embeds:${m.embeds.length}` : "";
          const extras = [att, emb].filter(Boolean).join(" ");
          if (extras) parts.push(extras);

          const content = (m.content || "").trim();
          const meta = parts.length ? ` (${parts.join(" | ")})` : "";
          const author = m.author?.bot ? `[BOT] ${m.author?.username}` : m.author?.username || "user";
          return `${author}: ${content}${meta}`;
        }).filter(Boolean);
      } catch (e) {
        console.error("[openrouter][history-fetch-error]", e?.message || e);
        history = [];
      }

      // 3) Kullanıcıya "typing" göster (maks 20s)
      message.channel.sendTyping().catch(() => {});
      const typingTimer = setInterval(() => {
        message.channel.sendTyping().catch(() => {});
      }, 7000);

      // 4) Mesajları hazırla (system prompt + HISTORY + user)
      const historyBlock = history.length ? `Geçmiş:\n${history.join("\n")}\n---\n` : "";
      const messages = await buildMessagesForUser(`${historyBlock}${userText}`);

      // 5) OpenRouter çağrısı
      let reply;
      try {
        reply = await callOpenRouter(messages, {
          // model: process.env.OPENROUTER_MODEL, // env ile override edilebilir
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 400,
        });
      } catch (err) {
        console.error("[openrouter][error]", err?.message || err);
        // Hata durumunda kısa bilgi
        reply = "Şu an yanıt veremiyorum. Lütfen biraz sonra tekrar dener misin?";
      } finally {
        clearInterval(typingTimer);
      }

      // 5) Yanıtı güvenli uzunlukla kanala gönder
      if (typeof reply !== "string" || !reply.trim()) {
        reply = "Boş yanıt döndü. Lütfen mesajını tekrar gönder.";
      }
      const safe = reply.slice(0, MAX_DISCORD_REPLY_LEN);
      await message.reply(safe);
    } catch (e) {
      console.error("[messageCreate][unhandled]", e?.message || e);
      try {
        await message.channel.send("İstek işlenirken beklenmeyen bir hata oluştu.");
      } catch {}
    }
  },
};
