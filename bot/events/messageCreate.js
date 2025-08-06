const { buildMessagesForUser, callOpenRouter } = require("../openrouter");

const TARGET_CHANNEL_ID = process.env.OPENROUTER_CHANNEL_ID || "1140379269705502821";
const MAX_DISCORD_REPLY_LEN = 1800; // 2000 limitine güvenli tampon
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

      // 2) Kullanıcıya "typing" göster (maks 20s)
      message.channel.sendTyping().catch(() => {});
      const typingTimer = setInterval(() => {
        message.channel.sendTyping().catch(() => {});
      }, 7000);

      // 3) Mesajları hazırla (system prompt + user)
      const messages = await buildMessagesForUser(userText);

      // 4) OpenRouter çağrısı
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
