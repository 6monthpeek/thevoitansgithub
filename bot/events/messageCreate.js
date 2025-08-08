const { buildMessagesForUser, callOpenRouter } = require("../openrouter");
const { MemoryMessageHandler } = require("../handlers/memory-message-handler");

// Idempotency guard: aynı mesajı birden fazla kez işlemeyi önle
const __processedMessageIds = global.__processedMessageIds || new Set();
global.__processedMessageIds = __processedMessageIds;

const TARGET_CHANNEL_ID = process.env.OPENROUTER_CHANNEL_ID || "1140379269705502821";
const MAX_DISCORD_REPLY_LEN = 1800; // 2000 limitine güvenli tampon
const HISTORY_LIMIT = Number(process.env.OPENROUTER_HISTORY_LIMIT || 30); // Son 30 mesaj
const THINKING_EMOJI = "💭";

// Memory handler instance
const memoryHandler = new MemoryMessageHandler();

// Kanal beyaz listesi davranışı:
// AI_ONLY_ENABLED_CHANNELS=1 ise yalnızca AI_ENABLED_CHANNELS içinde çalışır.
// AI_ONLY_ENABLED_CHANNELS=0 (veya tanımsız) ise TÜM metin kanallarında mention/prefix tetiklenebilir.
const AI_ONLY_ENABLED_CHANNELS = String(process.env.AI_ONLY_ENABLED_CHANNELS || "0") === "1";

// Senior Officer rol ID (ENV)
const rawSenior = process.env.SENIOR_OFFICER_ROLE_ID || "";
const SENIOR_ROLE_ID = String(rawSenior).trim();

/**
 * Ek yetkili rol
 * ID: 302812332915032064
 * Name: Field Officer
 */
const EXTRA_OFFICER_ROLE_ID = "302812332915032064";

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

      // Bot mesajlarını (webhook botları dahil) ve sistem mesajlarını atla
      if (message.author.bot || message.webhookId || message.system) {
        try {
          console.log("[bot][messageCreate] skip:bot-or-webhook", {
            authorBot: !!message.author?.bot,
            webhookId: message.webhookId || null,
            system: !!message.system
          });
        } catch {}
        return;
      }

      // Kanal filtresi tamamen KAPALI: bot mention/prefix gördüğü her metin kanalında çalışır
      // (AI_ONLY_ENABLED_CHANNELS ve ENABLED_CHANNELS kontrolü devre dışı)
      try {
        console.log("[bot][messageCreate] channel-whitelist:DISABLED (respond anywhere on mention/prefix)", {
          here: String(message.channel.id),
          guild: message.guild?.id,
        });
      } catch {}

      const prefixes = (process.env.AI_PREFIXES || "!ai,!ask,/ai").split(",").map(s => s.trim()).filter(Boolean);
      const contentRaw = String(message.content || "");

      // Mention algısını güçlendir: doğrudan mention, reply üzerinden mention ve ham içerikte <@id> match'i
      const botId = String(client.user?.id || "");
      const directMention = message.mentions?.users?.has?.(client.user?.id);
      const contentHasTag = botId ? /<@!?(\d+)>/.test(contentRaw) && contentRaw.includes(botId) : false;
      let replyMentionsBot = false;
      try {
        if (message.reference?.messageId && message.channel?.messages?.fetch) {
          const ref = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
          if (ref) {
            const refHas = ref.mentions?.users?.has?.(client.user?.id);
            const refContentHasTag = botId ? (typeof ref.content === "string" && ref.content.includes(botId)) : false;
            replyMentionsBot = !!(refHas || refContentHasTag);
          }
        }
      } catch {}

      const mentionsBot = !!(directMention || contentHasTag || replyMentionsBot);
      const hasPrefix = prefixes.some(p => contentRaw.startsWith(p));

      // Çifte tetiklemeyi önlemek için: mention + prefix birlikte ise sadece BİR kez çalıştır.
      // Tercih: mention öncelikli. Prefix tetikleyicisini devre dışı bırakmak için PREFIX_DISABLE=1 kullan.
      const PREFIX_DISABLE = String(process.env.PREFIX_DISABLE || "0") === "1";
      const allowPrefix = !PREFIX_DISABLE;

      const triggeredByMention = mentionsBot;
      const triggeredByPrefix = allowPrefix && !mentionsBot && hasPrefix;

      if (!(triggeredByMention || triggeredByPrefix)) {
        try { console.log("[bot][messageCreate] skip:no-mention-or-prefix", { mentionsBot, hasPrefix, allowPrefix }); } catch {}
        return;
      }

      const trigger = triggeredByMention ? "mention" : "prefix";
      try { console.log("[bot][messageCreate] trigger", { trigger, mentionsBot, hasPrefix, allowPrefix, channelId: String(message.channel.id), guildId: String(message.guild?.id || "") }); } catch {}

      // Idempotent koruma: aynı message.id için tek kez çalış
      try {
        if (__processedMessageIds.has(message.id)) {
          return;
        }
        __processedMessageIds.add(message.id);
        // 5 dk sonra otomatik temizle
        setTimeout(() => {
          try { __processedMessageIds.delete(message.id); } catch {}
        }, 5 * 60 * 1000);
      } catch {}

      // Eski tek-kanal kısıtı tamamen kaldırıldı (her yerde çalış)

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
      // Örnek tetikler: 
      //  - "son 50 mesajı oku", "son 30 mesajı okur musun", "son 100 mesajın özetini ver"
      //  - "geçmiş mesajları oku", "geçmişi oku", "son mesajları oku", "son 50 mesaj"
      const lower = userText.toLowerCase();
      const readRegexCount = /\bson\s+(\d{1,3})\s*mesaj[ıi]?\s*(oku|okur musun|okuyabilir misin|özet(le|ini ver)|göster)?/;
      const readRegexGeneric = /\b(geçmiş( mesaj(lar[ıi])?)?|son mesaj(lar[ıi])?)\s*(oku|okuyabilir misin|okur musun|özet(le|ini ver)|göster)?\b/;

      const readMatchCount = lower.match(readRegexCount);
      const readMatchGeneric = !readMatchCount && lower.match(readRegexGeneric);

      if (readMatchCount || readMatchGeneric) {
        // N belirtilmişse kullan, yoksa varsayılan 50
        const parsedN = readMatchCount ? parseInt(readMatchCount[1], 10) : 50;
        const n = Math.min(Math.max(parsedN || 50, 1), 100);
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

      const isSeniorOfficer = (() => {
        const allowSenior = SENIOR_ROLE_ID.length > 0 && memberRoleIdsNorm.includes(SENIOR_ROLE_ID);
        const allowExtra = EXTRA_OFFICER_ROLE_ID && memberRoleIdsNorm.includes(EXTRA_OFFICER_ROLE_ID);
        return !!(allowSenior || allowExtra);
      })();

      // DEBUG (geçici): rol ve kontrol çıktıları
      try {
        const roleIds = memberRoleIdsNorm || [];
        console.log("[moderation][debug] senior_check", {
          SENIOR_ROLE_ID: SENIOR_ROLE_ID,
          EXTRA_OFFICER_ROLE_ID: EXTRA_OFFICER_ROLE_ID,
          EXTRA_OFFICER_ROLE_NAME: "Field Officer",
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

      // 3) (İSTEK ÜZERİNE) Kullanıcı başına cooldown/daily limit KAPATILDI.
      // İstenirse tekrar açmak için aşağıdaki blok geri getirilebilir veya ENV ile koşullu yapılabilir.
      // 4) Kullanıcıya "typing" göster (maks 20s)
      message.channel.sendTyping().catch(() => {});
      const typingTimer = setInterval(() => {
        message.channel.sendTyping().catch(() => {});
      }, 7000);

      // 4) AI komutu: silme isteği olabilir mi? OpenRouter ile JSON-yorumlama
      let handledDelete = false;
      let handledResponse = false; // herhangi bir yanıt gönderildiyse normal akışı atlamak için
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
              handledResponse = true;
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
              handledResponse = true;
            } else {
              // Silinecek mesaj bulunamadı
              handledDelete = true;
              await message.reply("Silinecek uygun mesaj bulunamadı veya ölçütler çok dar.").catch(() => {});
              handledResponse = true;
            }
          }
        } catch (e) {
          console.error("[openrouter][delete-parse-error]", e?.message || e);
          // devam edip normal yanıt üretelim
        }
      }

      // Eğer delete/yardımcı akışta yanıt verildiyse, normal yanıt akışını atla
      if (handledResponse) {
        clearInterval(typingTimer);
        return;
      }

      if (!handledDelete) {
        // 5) Memory-enhanced AI yanıt üretimi
        let reply;
        try {
          // Memory handler ile mesajı işle
          const memoryResponse = await memoryHandler.handleMessage(message, false);
          
          if (memoryResponse.success) {
            reply = memoryResponse.message;
            console.log('[Memory] AI response generated with memory context');
          } else {
            // Memory system başarısız olursa fallback
            console.log('[Memory] Fallback to original system');
            const messages = await buildMessagesForUser(userText, history);
            reply = await callOpenRouter(messages, {
              temperature: 0.7,
              top_p: 0.9,
              max_tokens: 256,
            });
          }
        } catch (err) {
          console.error("[openrouter][error]", err?.message || err);
          // 429 için özel mesaj (Retry-After varsa ona göre)
          const msg = String(err?.message || "");
          if (/429|rate limit/i.test(msg)) {
            const minutes = Math.max(1, Math.ceil((Number(process.env.AI_RATE_LIMIT_COOLDOWN_MS || 3600000)) / 60000));
            reply = `Kota doldu. Lütfen yaklaşık ${minutes} dk sonra tekrar dene.`;
          } else {
            reply = "Şu an yanıt veremiyorum. Lütfen biraz sonra tekrar dener misin?";
          }
        } finally {
          clearInterval(typingTimer);
        }

        // 7) Yanıtı güvenli uzunlukla kanala gönder
        if (typeof reply !== "string" || !reply.trim()) {
          reply = "Boş yanıt döndü. Lütfen mesajını tekrar gönder.";
        }
        const safe = reply.slice(0, MAX_DISCORD_REPLY_LEN);
        // Birden fazla yanıtı önlemek için aynı mesaj için bir kere gönder
        if (!message.__repliedOnce) {
          message.__repliedOnce = true;
          await message.reply(safe);
        } else {
          try { console.log("[bot][messageCreate] skip:already-replied-once"); } catch {}
        }
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
