/**
 * Tüm önemli Discord.js eventlerini dinleyip ingest'e yollayan merkezi wiring.
 * Kullanım: index.js içinde require("./events/_wireAll")(client);
 */
const {
  postLog,
  baseUser,
  baseGuild,
  baseChannel,
} = require("./_logIngest");

module.exports = function wireAll(client) {
  // Helper: güvenli post
  const send = (event, extra = {}) =>
    postLog({
      event,
      ...extra,
    });

  // ready
  client.once("ready", async () => {
    try {
      const g = client.guilds.cache.first();
      await send("ready", {
        ...baseGuild(g),
        data: {
          ...(g ? { guildName: g.name } : {}),
          shardCount: client.ws.shards.size,
          userCount: client.users.cache.size,
        },
      });
    } catch (e) {
      console.warn("[wireAll:ready]", e);
    }
  });

  // rateLimit / warn / error / shard
  client.rest.on("rateLimited", (info) =>
    send("rateLimit", { data: { info } })
  );
  client.on("warn", (message) =>
    send("warn", { data: { message: String(message) } })
  );
  client.on("error", (error) =>
    send("error", { data: { message: String(error?.message || error) } })
  );
  client.on("shardError", (error, shardId) =>
    send("shardError", { data: { shardId, message: String(error?.message || error) } })
  );
  client.on("shardDisconnect", (event, shardId) =>
    send("shardDisconnect", { data: { shardId, code: event?.code, reason: event?.reason } })
  );
  client.on("shardReconnecting", (shardId) =>
    send("shardReconnecting", { data: { shardId } })
  );
  client.on("shardResume", (shardId, replayedEvents) =>
    send("shardResume", { data: { shardId, replayedEvents } })
  );

  // messageCreate LOG + HANDLER: Tek noktadan bind
  // - Hem ingest logu yolla
  // - Hem de ana yanıtlayıcıyı burada require edip çalıştır
  const handleMessageCreate = require("./messageCreate");
  client.on("messageCreate", (message) => {
    if (!message) return;
    // 1) LOG (ingest)
    send("messageCreate", {
      ...baseGuild(message.guild),
      ...baseChannel(message.channel),
      ...baseUser(message.author),
      data: {
        content: message.content,
      },
    });
    // 2) ANA HANDLER (yanıtlayıcı)
    try {
      if (handleMessageCreate && typeof handleMessageCreate.execute === "function") {
        handleMessageCreate.execute(message, client);
      }
    } catch (e) {
      console.warn("[wireAll:messageCreate][handler-error]", e?.message || e);
    }
  });

  client.on("messageUpdate", (oldMessage, newMessage) => {
    const guild = newMessage?.guild || oldMessage?.guild;
    const channel = newMessage?.channel || oldMessage?.channel;
    const author = newMessage?.author || oldMessage?.author;
    send("messageUpdate", {
      ...baseGuild(guild),
      ...baseChannel(channel),
      ...baseUser(author),
      data: {
        before: oldMessage?.content,
        after: newMessage?.content,
      },
    });
  });

  // messageDelete: partial mesajlar, DM kanalları ve izin kısıtları için ekstra kontroller
  client.on("messageDelete", async (message) => {
    try {
      // DM kanalı mı?
      const isDM = message?.channel?.type === 1 || message?.channel?.isDMBased?.();
      // Kanal ve guild'i güvenli al (DM ise guild yok)
      const channel = message?.channel || null;
      const guild = message?.guild || channel?.guild || null;

      // Author yoksa: message.author, message.member?.user, message?.mentions?.users?.first vb.
      let user = message?.author || message?.member?.user || null;

      // Partial kontrolleri: message.partial true olabilir
      // İçeriği ve author'u fetch etmeyi dene; fetch başarısız olabilir
      if (message?.partial && message?.fetch) {
        try {
          const full = await message.fetch();
          user = full?.author || user;
        } catch {
          // fetch başarısız olabilir, yoksay
        }
      }

      // Ek fetch: sadece kanal mesajları için (DM değilse) ve author hâlâ yoksa
      if (!isDM && !user && message?.id && channel?.messages?.fetch) {
        try {
          const fetched = await channel.messages.fetch(message.id);
          user = fetched?.author || null;
        } catch {
          // fetch edilemeyebilir (silinmiş/izin yok/partial)
        }
      }

      // İçerik: partial ise undefined olabilir
      const content = typeof message?.content === "string" ? message.content : undefined;

      // En azından messageId ile kayıt yolla; guild/channel DM ise data.channelName dolmayabilir
      await send("messageDelete", {
        ...(guild ? baseGuild(guild) : {}),
        ...(channel ? baseChannel(channel) : {}),
        ...(user ? baseUser(user) : {}),
        data: {
          content,
          messageId: message?.id,
          isDM: Boolean(isDM),
        },
      });
    } catch (e) {
      console.warn("[wireAll:messageDelete] hata:", e?.message || e);
      await send("messageDelete", {
        data: {
          error: String(e?.message || e),
        },
      });
    }
  });

  // message reactions
  client.on("messageReactionAdd", (reaction, user) => {
    send("messageReactionAdd", {
      ...baseGuild(reaction?.message?.guild),
      ...baseChannel(reaction?.message?.channel),
      ...baseUser(user),
      data: {
        emoji: reaction?.emoji?.name,
        messageId: reaction?.message?.id,
      },
    });
  });
  client.on("messageReactionRemove", (reaction, user) => {
    send("messageReactionRemove", {
      ...baseGuild(reaction?.message?.guild),
      ...baseChannel(reaction?.message?.channel),
      ...baseUser(user),
      data: {
        emoji: reaction?.emoji?.name,
        messageId: reaction?.message?.id,
      },
    });
  });
  client.on("messageReactionRemoveAll", (message, reactions) => {
    send("messageReactionRemoveAll", {
      ...baseGuild(message?.guild),
      ...baseChannel(message?.channel),
      data: {
        messageId: message?.id,
        count: reactions?.size,
      },
    });
  });
  client.on("messageReactionRemoveEmoji", (reaction) => {
    send("messageReactionRemoveEmoji", {
      ...baseGuild(reaction?.message?.guild),
      ...baseChannel(reaction?.message?.channel),
      data: {
        emoji: reaction?.emoji?.name,
        messageId: reaction?.message?.id,
      },
    });
  });

  // typing
  client.on("typingStart", (typing) => {
    send("typingStart", {
      ...baseGuild(typing?.guild),
      ...baseChannel(typing?.channel),
      ...baseUser(typing?.user),
    });
  });

  // guild member
  client.on("guildMemberAdd", (member) => {
    send("guildMemberAdd", {
      ...baseGuild(member?.guild),
      ...baseUser(member?.user),
    });
  });
  client.on("guildMemberRemove", (member) => {
    send("guildMemberRemove", {
      ...baseGuild(member?.guild),
      ...baseUser(member?.user),
    });
  });
  client.on("guildMemberUpdate", (oldMember, newMember) => {
    send("guildMemberUpdate", {
      ...baseGuild(newMember?.guild || oldMember?.guild),
      ...baseUser(newMember?.user || oldMember?.user),
      data: {
        oldNick: oldMember?.nickname,
        newNick: newMember?.nickname,
      },
    });
  });

  // guild ban
  client.on("guildBanAdd", (ban) => {
    send("guildBanAdd", {
      ...baseGuild(ban?.guild),
      ...baseUser(ban?.user),
    });
  });
  client.on("guildBanRemove", (ban) => {
    send("guildBanRemove", {
      ...baseGuild(ban?.guild),
      ...baseUser(ban?.user),
    });
  });

  // roles
  client.on("roleCreate", (role) => {
    send("roleCreate", {
      ...baseGuild(role?.guild),
      data: { roleId: role?.id, roleName: role?.name },
    });
  });
  client.on("roleDelete", (role) => {
    send("roleDelete", {
      ...baseGuild(role?.guild),
      data: { roleId: role?.id, roleName: role?.name },
    });
  });
  client.on("roleUpdate", (oldRole, newRole) => {
    send("roleUpdate", {
      ...baseGuild(newRole?.guild || oldRole?.guild),
      data: {
        roleId: newRole?.id || oldRole?.id,
        oldName: oldRole?.name,
        newName: newRole?.name,
      },
    });
  });

  // channels
  client.on("channelCreate", (channel) => {
    send("channelCreate", {
      ...baseGuild(channel?.guild),
      ...baseChannel(channel),
    });
  });
  client.on("channelDelete", (channel) => {
    send("channelDelete", {
      ...baseGuild(channel?.guild),
      ...baseChannel(channel),
    });
  });
  client.on("channelUpdate", (oldCh, newCh) => {
    send("channelUpdate", {
      ...baseGuild(newCh?.guild || oldCh?.guild),
      ...baseChannel(newCh || oldCh),
      data: {
        oldName: oldCh?.name,
        newName: newCh?.name,
      },
    });
  });
  client.on("channelPinsUpdate", (channel, time) => {
    send("channelPinsUpdate", {
      ...baseGuild(channel?.guild),
      ...baseChannel(channel),
      data: { time: String(time) },
    });
  });

  // threads
  client.on("threadCreate", (thread) => {
    send("threadCreate", {
      ...baseGuild(thread?.guild),
      ...baseChannel(thread),
    });
  });
  client.on("threadDelete", (thread) => {
    send("threadDelete", {
      ...baseGuild(thread?.guild),
      ...baseChannel(thread),
    });
  });
  client.on("threadUpdate", (oldT, newT) => {
    send("threadUpdate", {
      ...baseGuild(newT?.guild || oldT?.guild),
      ...baseChannel(newT || oldT),
      data: {
        oldName: oldT?.name,
        newName: newT?.name,
      },
    });
  });
  client.on("threadListSync", (threads) => {
    send("threadListSync", {
      data: { count: threads?.threads?.size ?? threads?.size },
    });
  });
  client.on("threadMembersUpdate", (oldMembers, newMembers) => {
    send("threadMembersUpdate", {
      data: {
        oldCount: oldMembers?.size,
        newCount: newMembers?.size,
      },
    });
  });

  // emojis & stickers
  client.on("emojiCreate", (emoji) => {
    send("emojiCreate", {
      ...baseGuild(emoji?.guild),
      data: { name: emoji?.name, id: emoji?.id },
    });
  });
  client.on("emojiDelete", (emoji) => {
    send("emojiDelete", {
      ...baseGuild(emoji?.guild),
      data: { name: emoji?.name, id: emoji?.id },
    });
  });
  client.on("emojiUpdate", (oldE, newE) => {
    send("emojiUpdate", {
      ...baseGuild(newE?.guild || oldE?.guild),
      data: {
        id: newE?.id || oldE?.id,
        oldName: oldE?.name,
        newName: newE?.name,
      },
    });
  });

  client.on("stickerCreate", (sticker) => {
    send("stickerCreate", {
      ...baseGuild(sticker?.guild),
      data: { name: sticker?.name, id: sticker?.id },
    });
  });
  client.on("stickerDelete", (sticker) => {
    send("stickerDelete", {
      ...baseGuild(sticker?.guild),
      data: { name: sticker?.name, id: sticker?.id },
    });
  });
  client.on("stickerUpdate", (oldS, newS) => {
    send("stickerUpdate", {
      ...baseGuild(newS?.guild || oldS?.guild),
      data: {
        id: newS?.id || oldS?.id,
        oldName: oldS?.name,
        newName: newS?.name,
      },
    });
  });

  // presence / voice / invites
  client.on("presenceUpdate", (oldP, newP) => {
    const user = newP?.user || oldP?.user;
    // presenceUpdate event'inde guild çoğu zaman direkt yok; cache üzerinden dene
    let guild = newP?.guild || oldP?.guild || null;
    try {
      if (!guild) {
        const uid = newP?.userId || user?.id;
        if (uid) {
          for (const [gid, g] of newP?.client?.guilds?.cache || []) {
            if (g?.members?.cache?.has(uid)) {
              guild = g;
              break;
            }
          }
        }
      }
    } catch {}
    send("presenceUpdate", {
      ...(guild ? baseGuild(guild) : {}),
      ...baseUser(user),
      data: {
        oldStatus: oldP?.status,
        newStatus: newP?.status,
      },
    });
  });

  client.on("voiceStateUpdate", (oldS, newS) => {
    const member = newS?.member || oldS?.member;
    const guild = newS?.guild || oldS?.guild || member?.guild || null;
    // Kanal adını da göndermek için mevcut/önceki kanalı cache'den çöz
    const chNow = newS?.channel || (newS?.channelId && guild?.channels?.cache?.get(newS.channelId)) || null;
    const chOld = oldS?.channel || (oldS?.channelId && guild?.channels?.cache?.get(oldS.channelId)) || null;
    send("voiceStateUpdate", {
      ...(guild ? baseGuild(guild) : {}),
      ...baseUser(member?.user),
      ...(chNow ? baseChannel(chNow) : chOld ? baseChannel(chOld) : {}),
      data: {
        oldChannel: oldS?.channelId,
        newChannel: newS?.channelId,
        mute: newS?.mute,
        deaf: newS?.deaf,
      },
    });
  });

  client.on("inviteCreate", (invite) => {
    send("inviteCreate", {
      ...baseGuild(invite?.guild),
      data: {
        code: invite?.code,
        channelId: invite?.channelId,
        inviterId: invite?.inviterId,
      },
    });
  });
  client.on("inviteDelete", (invite) => {
    send("inviteDelete", {
      ...baseGuild(invite?.guild),
      data: {
        code: invite?.code,
        channelId: invite?.channelId,
      },
    });
  });

  // interactions
  client.on("interactionCreate", (interaction) => {
    send("interactionCreate", {
      ...baseGuild(interaction?.guild),
      ...baseUser(interaction?.user),
      data: {
        type: interaction?.type,
        commandName: interaction?.commandName,
      },
    });
  });

  // guild
  client.on("guildCreate", (guild) => {
    send("guildCreate", { ...baseGuild(guild) });
  });
  client.on("guildDelete", (guild) => {
    send("guildDelete", { ...baseGuild(guild) });
  });
  client.on("guildUpdate", (oldG, newG) => {
    send("guildUpdate", {
      ...baseGuild(newG || oldG),
      data: {
        oldName: oldG?.name,
        newName: newG?.name,
      },
    });
  });

  // webhooks / stage / auto-moderation
  client.on("webhookUpdate", (channel) => {
    send("webhookUpdate", {
      ...baseGuild(channel?.guild),
      ...baseChannel(channel),
    });
  });
  client.on("stageInstanceCreate", (stage) => {
    send("stageInstanceCreate", {
      ...baseGuild(stage?.guild),
      data: { id: stage?.id, channelId: stage?.channelId, topic: stage?.topic },
    });
  });
  client.on("stageInstanceDelete", (stage) => {
    send("stageInstanceDelete", {
      ...baseGuild(stage?.guild),
      data: { id: stage?.id, channelId: stage?.channelId },
    });
  });
  client.on("stageInstanceUpdate", (oldS, newS) => {
    send("stageInstanceUpdate", {
      ...baseGuild(newS?.guild || oldS?.guild),
      data: {
        id: newS?.id || oldS?.id,
        oldTopic: oldS?.topic,
        newTopic: newS?.topic,
      },
    });
  });

  // Auto moderation (v14 API: events mevcut bot intents ve perms gerektirir)
  client.on("autoModerationActionExecution", (execution) => {
    send("autoModerationActionExecution", {
      ...baseGuild(execution?.guild),
      data: {
        ruleId: execution?.ruleId,
        userId: execution?.userId,
        channelId: execution?.channelId,
        alertSystemMessageId: execution?.alertSystemMessageId,
        matchedContent: execution?.matchedContent,
      },
    });
  });
};
