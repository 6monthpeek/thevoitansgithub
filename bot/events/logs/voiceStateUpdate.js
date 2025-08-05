const { postLog, baseGuild, baseChannel, enrichUserData, baseUser } = require("../_logIngest");

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState) {
    try {
      const member = newState?.member || oldState?.member;
      const guild = newState?.guild || oldState?.guild || member?.guild || null;

      const oldCh = oldState?.channel || (oldState?.channelId && guild?.channels?.cache?.get(oldState.channelId)) || null;
      const newCh = newState?.channel || (newState?.channelId && guild?.channels?.cache?.get(newState.channelId)) || null;

      let event = "voiceStateUpdate_switch";
      if (!oldCh && newCh) event = "voiceStateUpdate_join";
      else if (oldCh && !newCh) event = "voiceStateUpdate_leave";
      else if (oldCh && newCh && oldCh.id !== newCh.id) event = "voiceStateUpdate_switch";
      else return; // No meaningful change

      // Kullanıcı bilgilerini zenginleştir (guild adı eventten alınabiliyorsa geçir)
      const enrichedData = member && guild ? await enrichUserData(member.user.id, guild.id, guild.name) : {};

      await postLog({
        event,
        // Üst seviyede ID'leri garanti et
        guildId: guild?.id || undefined,
        userId: member?.user?.id || undefined,
        channelId: (newCh?.id || oldCh?.id) || undefined,
        ...(guild ? baseGuild(guild) : {}),
        ...(newCh ? baseChannel(newCh) : oldCh ? baseChannel(oldCh) : {}),
        ...(member?.user ? baseUser(member.user) : {}),
        data: {
          oldChannel: oldCh ? { id: oldCh.id, name: oldCh.name || undefined } : null,
          newChannel: newCh ? { id: newCh.id, name: newCh.name || undefined } : null,
          mute: newState?.mute,
          deaf: newState?.deaf,
          selfMute: newState?.selfMute,
          selfDeaf: newState?.selfDeaf,
          streaming: newState?.streaming,
          suppress: newState?.suppress,
          // Zengin alanlar data içine
          ...enrichedData, // { userDisplay, userName, userAvatarUrl, displayName, guildName, userId, guildId }
        },
      });
    } catch (e) {
      console.warn("[events/voiceStateUpdate] error:", e?.message || e);
      try {
        await postLog({
          event: "voiceStateUpdate_error",
          data: { message: String(e?.message || e) },
        });
      } catch {}
    }
  },
};
