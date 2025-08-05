const { ChannelType, Events, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const triggerChannelId = "1245738391446753321"; // kanal id"
    const categoryId = "1140379892488360097"; // kategori ID'si

    // Kullanıcı bir odaya katıldığında:
    if (!oldState.channel && newState.channelId === triggerChannelId) {
      const guild = newState.guild;
      const user = newState.member.user;

      const cloned = await newState.channel.clone({
        name: `🎧 ${user.username}'s Room`,
        type: ChannelType.GuildVoice,
        parent: categoryId,
        permissionOverwrites: [
          {
            id: user.id,
            allow: [
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.DeafenMembers,
              PermissionFlagsBits.MoveMembers,
              PermissionFlagsBits.ManageChannels,
            ],
          },
          {
            id: guild.roles.everyone,
            allow: [PermissionFlagsBits.Connect],
          },
        ],
      });

      await newState.setChannel(cloned);
    }

    // Kullanıcı kanal değiştirdiğinde eski kanal boş kaldıysa sil:
    if (oldState.channel && oldState.channel.id !== triggerChannelId) {
      if (
        oldState.channel.members.size === 0 &&
        oldState.channel.parentId === categoryId &&
        oldState.channel.name.includes("'s Room")
      ) {
        oldState.channel.delete().catch(() => {});
      }
    }
  },
};
