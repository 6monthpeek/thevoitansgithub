const { buildMessagesForUser, callOpenRouter } = require("../openrouter");

const TARGET_CHANNEL_ID = process.env.OPENROUTER_CHANNEL_ID || "1140379269705502821";
const MAX_DISCORD_REPLY_LEN = 1800; // 2000 limitine güvenli tampon
const HISTORY_LIMIT = Number(process.env.OPENROUTER_HISTORY_LIMIT || 30); // Son 30 mesaj
const THINKING_EMOJI = "💭";

// Senior Officer rol ID (ENV)
const rawSenior = process.env.SENIOR_OFFICER_ROLE_ID || "";
const SENIOR_ROLE_ID = String(rawSenior).trim();

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
      // DEBUG: akış tetikleniyor mu?
      try {
        console.log("[bot][messageCreate] incoming", {
          guildId: message.guild?.id,
          channelId: message.channel?.id,
          target: String(TARGET_CHANNEL_ID),
          authorId: message.author?.id,
          isBot: !!message.author?.bot,
          len: String(message.content || "").length,
        });
      } catch {}

      // 1) Filtreler
      if (!message || !message.channel || !message.author) return;
      if (message.author.bot) return; // bot mesajları yok
      if (String(message.channel.id) !== String(TARGET_CHANNEL_ID)) {
        try {
          console.log("[bot][messageCreate] skip:not-target", {
            here: String(message.channel.id),
            target: String(TARGET_CHANNEL_ID),
          });
        } catch {}
        return; // sadece hedef kanal
      }

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

      // Lokal "son N mesajı oku/özetle" akışı (model çağrısı yok)
      // Örnek tetikler: "son 50 mesajı oku", "son 30 mesajı okur musun", "son 100 mesajın özetini ver"
      const readMatch = userText
        .toLowerCase()
        .match(/\bson\s+(\d{1,3})\s*mesaj[ıi]?\s*(oku|okur musun|özet(le|ini ver)|göster)/);
      if (readMatch) {
        const n = Math.min(Math.max(parseInt(readMatch[1], 10) || 50, 1), 100);
        try {
          const fetched = await message.channel.messages.fetch({ limit: Math.min(100, n) });
          const arr = Array.from(fetched.values())
            .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

          const stats = {
            total: arr.length,
            authors: new Set(arr.map(m => m.author?.id)).size,
            mentionsUsers: 0,
            mentionsRoles: 0,
            mentionsChannels: 0,
            attachments: 0,
            embeds: 0,
          };

          const preview = (m) => {
            const t = String(m.content || "").replace(/\s+/g, " ").trim();
            return t.length > 120 ? t.slice(0, 117) + "..." : t;
          };

          const samples = {
            head: arr.slice(0, Math.min(3, arr.length)),
            mid: arr.slice(Math.max(0, Math.floor(arr.length / 2) - 1), Math.max(0, Math.floor(arr.length / 2) - 1) + Math.min(3, arr.length)),
            tail: arr.slice(Math.max(0, arr.length - 3), arr.length),
          };

          for (const m of arr) {
            const mu = m.mentions?.users?.size || 0;
            const mr = m.mentions?.roles?.size || 0;
            const mc = m.mentions?.channels?.size || 0;
            stats.mentionsUsers += mu;
            stats.mentionsRoles += mr;
            stats.mentionsChannels += mc;
            stats.attachments += m.attachments?.size || 0;
            stats.embeds += (m.embeds?.length || 0);
          }

          const formatBlock = (label, list) => {
            if (!list.length) return `${label}: -`;
            return `${label}:\n` + list.map(m => `• ${m.author?.bot ? "[BOT] " : ""}${m.author?.username || "user"}: ${preview(m)}`).join("\n");
          };

          const replyText =
            `Son ${n} mesaj özeti\n` +
            `• Toplam: ${stats.total} | Benzersiz yazar: ${stats.authors}\n` +
            `• Mentions: kullanıcı ${stats.mentionsUsers}, rol ${stats.mentionsRoles}, kanal ${stats.mentionsChannels}\n` +
            `• Ekler: attachments ${stats.attachments}, embeds ${stats.embeds}\n` +
            `\n` +
            formatBlock("İlk 3", samples.head) + `\n\n` +
            formatBlock("Orta 3", samples.mid) + `\n\n` +
            formatBlock("Son 3", samples.tail);

          await message.reply(replyText.slice(0, MAX_DISCORD_REPLY_LEN)).catch(() => {});
          return;
        } catch (e) {
          console.error("[local-read][error]", e?.message || e);
          await message.reply("Son mesajları okurken bir sorun oluştu.").catch(() => {});
          return;
        }
      }

      // Senior Officer kontrolü (AI moderasyon/silme komutları için şart)
      const member = await message.guild?.members.fetch(message.author.id).catch(() => null);

      // Normalize role ids (trim to avoid invisible characters) and compare as strings
      const memberRoleIdsNorm = !!member && member.roles?.cache
        ? member.roles.cache.map(r => String(r.id).trim())
        : [];

      const isSeniorOfficer = SENIOR_ROLE_ID.length > 0
        ? memberRoleIdsNorm.includes(SENIOR_ROLE_ID)
        : false;

      // DEBUG (geçici): rol ve kontrol çıktıları
      try {
        const roleIds = memberRoleIdsNorm || [];
        console.log("[moderation][debug] senior_check", {
          SENIOR_ROLE_ID: SENIOR_ROLE_ID,
          user: { id: message.author.id, tag: message.author.tag },
          guild: { id: message.guild?.id, name: message.guild?.name },
          memberRoleIds: roleIds,
          isSeniorOfficer,
        });
      } catch {}

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

      // 4) AI komutu: silme isteği olabilir mi? OpenRouter ile JSON-yorumlama
      let handledDelete = false;
      if (isSeniorOfficer) {
        try {
          const interpreterSystem = [
            "Aşağıdaki kullanıcı komutunu JSON olarak yorumla.",
            'Sadece geçerli JSON döndür. Açıklama yazma.',
            'Şema: {"action":"delete","count":<int>|null,"untilTime":"HH:mm"|null}',
            '- "count": "son N mesajı sil" gibi ifadelerden sayıyı çıkar.',
            '- "untilTime": "05:20\'ye kadar olan mesajları sil" gibi ifadelerde yerel saati döndür (24h).',
            '- İkisi de yoksa {"action":"none"} döndür.',
          ].join("\n");

          const parseMessages = [
            { role: "system", content: interpreterSystem },
            { role: "user", content: userText }
          ];
          const parsedText = await callOpenRouter(parseMessages, { temperature: 0, max_tokens: 60 });
          console.log("[delete][parse][raw]", parsedText);
          let parsed;
          try { parsed = JSON.parse(parsedText); } catch { parsed = null; }
          console.log("[delete][parse][json]", parsed);

          if (parsed && parsed.action === "delete") {
            // Silinecek mesajları belirle
            const now = new Date();
            const isValidTime = (s) => /^\d{2}:\d{2}$/.test(s || "");
            let toDelete = [];

            if (Number.isInteger(parsed.count) && parsed.count > 0) {
              const fetched = await message.channel.messages.fetch({ limit: Math.min(100, parsed.count + 1) });
              // Komut mesajını hariç tut
              const arr = Array.from(fetched.values())
                .filter(m => m.id !== message.id)
                .slice(0, parsed.count);
              toDelete = arr;
            } else if (isValidTime(parsed.untilTime)) {
              // Gün içi "HH:mm" kadar olan mesajları hedefle
              const [hh, mm] = parsed.untilTime.split(":").map(n => Number(n));
              const target = new Date(now);
              target.setHours(hh, mm, 0, 0);
              const fetched = await message.channel.messages.fetch({ limit: 100 });
              const arr = Array.from(fetched.values()).filter((m) => m.createdAt <= target);
              // Komut mesajından önce olanları tercih et
              const beforeCmd = arr.filter(m => m.createdTimestamp <= message.createdTimestamp);
              toDelete = (beforeCmd.length ? beforeCmd : arr).slice(0, 100);
            } else {
            // JSON yorumlayıcı delete aksiyonu üretmediyse, kullanıcıya netleştirme mesajı
            await message.reply("Silme için ne kadar mesaj veya hangi saate kadar olduğunu belirtir misin? Örn: 'son 5 mesaj' ya da '05:20’ye kadar'").catch(() => {});
          }

            if (toDelete.length > 0) {
              // Discord kuralı: 14 günden eski mesajlar bulkDelete ile silinemez
              const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
              const nowMs = Date.now();
              const recent = toDelete.filter(m => nowMs - m.createdTimestamp < TWO_WEEKS);
              const older = toDelete.filter(m => nowMs - m.createdTimestamp >= TWO_WEEKS);

              let deleted = 0;

              if (recent.length > 1) {
                try {
                  const ids = recent.map(m => m.id);
                  // bulkDelete sadece count alır, fetch tekrar gerekebilir
                  const bulkCount = Math.min(100, recent.length);
                  const fetchedForBulk = await message.channel.messages.fetch({ limit: bulkCount });
                  const mapIds = new Set(ids);
                  const collection = fetchedForBulk.filter(m => mapIds.has(m.id));
                  const res = await message.channel.bulkDelete(collection, true).catch(() => null);
                  if (res && typeof res.size === "number") deleted += res.size;
                } catch (e) {
                  console.error("[delete][bulk-failed]", e?.message || e);
                }
              } else if (recent.length === 1) {
                try {
                  await recent[0].delete().catch(() => {});
                  deleted += 1;
                } catch (e) {}
              }

              // Eski mesajlar için tek tek dene (başarısız olabilir)
              for (const m of older) {
                try {
                  await m.delete().catch(() => {});
                  deleted += 1;
                } catch {}
              }

              handledDelete = true;
              await message.reply(`Silme tamamlandı. Kaldırılan mesaj sayısı: ${deleted}.`).catch(() => {});
            } else {
              // Silinecek mesaj bulunamadı
              handledDelete = true;
              await message.reply("Silinecek uygun mesaj bulunamadı veya ölçütler çok dar.").catch(() => {});
            }
          }
        } catch (e) {
          console.error("[openrouter][delete-parse-error]", e?.message || e);
          // devam edip normal yanıt üretelim
        }
      }

      if (!handledDelete) {
        // 5) Normal yanıt üretimi: Mesajları hazırla (system prompt + HISTORY + user)
        const historyBlock = history.length ? `Geçmiş:\n${history.join("\n")}\n---\n` : "";
        const messages = await buildMessagesForUser(`${historyBlock}${userText}`);

        // 6) OpenRouter çağrısı
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

        // 7) Yanıtı güvenli uzunlukla kanala gönder
        if (typeof reply !== "string" || !reply.trim()) {
          reply = "Boş yanıt döndü. Lütfen mesajını tekrar gönder.";
        }
        const safe = reply.slice(0, MAX_DISCORD_REPLY_LEN);
        await message.reply(safe);
      } else {
        clearInterval(typingTimer);
      }
    } catch (e) {
      console.error("[messageCreate][unhandled]", e?.message || e);
      try {
        await message.channel.send("İstek işlenirken beklenmeyen bir hata oluştu.");
      } catch {}
    }
  },
};
