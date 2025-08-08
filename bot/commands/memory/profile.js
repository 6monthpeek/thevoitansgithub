/**
 * Profile Commands
 * Kullanıcı profil yönetimi
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getMemoryManager } = require('../../memory/memory-manager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Kullanıcı profil bilgilerini göster')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Profil bilgilerini görmek istediğin kullanıcı')
        .setRequired(false))
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Profil bilgilerini güncelle')
        .addStringOption(option =>
          option.setName('bio')
            .setDescription('Hakkında bilgisi')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('interests')
            .setDescription('İlgi alanları (virgülle ayır)')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('skills')
            .setDescription('Yetenekler (virgülle ayır)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('Bot hafıza istatistikleri'))
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      const memory = getMemoryManager();

      if (subcommand === 'stats') {
        await this.showStats(interaction, memory);
      } else if (subcommand === 'set') {
        await this.setProfile(interaction, memory);
      } else {
        await this.showProfile(interaction, memory);
      }

    } catch (error) {
      console.error('[Profile Command] Hata:', error);
      await interaction.reply({
        content: '❌ Komut çalıştırılırken hata oluştu',
        ephemeral: true
      });
    }
  },

  async showProfile(interaction, memory) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const discordId = targetUser.id;

    // Kullanıcı hafızasını al
    const userMemory = await memory.getUserMemory(discordId);
    
    if (!userMemory || !userMemory.profile) {
      await interaction.reply({
        content: `❌ ${targetUser.username} hakkında bilgi bulunamadı`,
        ephemeral: true
      });
      return;
    }

    const { profile, context, summary } = userMemory;

    // Embed oluştur
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(`👤 ${targetUser.username} Profili`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setTimestamp();

    // Temel bilgiler
    embed.addFields(
      { name: '🆔 Discord ID', value: discordId, inline: true },
      { name: '📝 Username', value: profile.username, inline: true },
      { name: '🏷️ Nickname', value: profile.nickname || 'Yok', inline: true }
    );

    // Roller
    if (profile.roles && profile.roles.length > 0) {
      embed.addFields({
        name: '🎭 Roller',
        value: profile.roles.join(', '),
        inline: false
      });
    }

    // AI analizi
    if (context) {
      if (context.personality && context.personality !== 'Yeni kullanıcı') {
        embed.addFields({
          name: '🧠 Kişilik',
          value: context.personality,
          inline: true
        });
      }

      if (context.interests && context.interests.length > 0) {
        embed.addFields({
          name: '🎯 İlgi Alanları',
          value: context.interests.join(', '),
          inline: true
        });
      }

      if (context.communication_style && context.communication_style !== 'Bilinmiyor') {
        embed.addFields({
          name: '💬 İletişim Tarzı',
          value: context.communication_style,
          inline: true
        });
      }
    }

    // Aktivite bilgileri
    embed.addFields(
      { name: '📊 Toplam Mesaj', value: profile.message_count.toString(), inline: true },
      { name: '🕐 Son Aktivite', value: new Date(profile.last_seen).toLocaleString('tr-TR'), inline: true }
    );

    // Son konuşma konuları
    if (context?.topics_discussed && context.topics_discussed.length > 0) {
      const recentTopics = context.topics_discussed.slice(0, 5);
      embed.addFields({
        name: '🗣️ Son Konuşma Konuları',
        value: recentTopics.join(', '),
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed] });
  },

  async setProfile(interaction, memory) {
    const discordId = interaction.user.id;
    const bio = interaction.options.getString('bio');
    const interestsStr = interaction.options.getString('interests');
    const skillsStr = interaction.options.getString('skills');

    // Değişiklik kontrolü
    if (!bio && !interestsStr && !skillsStr) {
      await interaction.reply({
        content: '❌ En az bir profil bilgisi girmelisin',
        ephemeral: true
      });
      return;
    }

    // String'leri array'e çevir
    const interests = interestsStr ? interestsStr.split(',').map(i => i.trim()) : null;
    const skills = skillsStr ? skillsStr.split(',').map(s => s.trim()) : null;

    // Profili güncelle
    const success = await memory.learnAboutUser(discordId, {
      bio,
      interests,
      skills
    });

    if (success) {
      await interaction.reply({
        content: '✅ Profil bilgilerin güncellendi! `/profile` komutu ile görüntüleyebilirsin.',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: '❌ Profil güncellenirken hata oluştu',
        ephemeral: true
      });
    }
  },

  async showStats(interaction, memory) {
    const stats = await memory.getMemoryStats();
    
    if (!stats) {
      await interaction.reply({
        content: '❌ İstatistikler alınamadı',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('📊 Bot Hafıza İstatistikleri')
      .setTimestamp();

    // Database stats
    embed.addFields(
      { name: '👥 Toplam Kullanıcı', value: stats.database.users.toString(), inline: true },
      { name: '💬 Toplam Konuşma', value: stats.database.conversations.toString(), inline: true },
      { name: '📝 Toplam Profil', value: stats.database.profiles.toString(), inline: true }
    );

    // Memory stats
    embed.addFields(
      { name: '🧠 RAM Kullanıcı', value: stats.memory.shortTermUsers.toString(), inline: true },
      { name: '💾 Context Kullanıcı', value: stats.memory.contextUsers.toString(), inline: true },
      { name: '🗄️ Database Boyutu', value: `${(stats.database.databaseSize / 1024).toFixed(2)} KB`, inline: true }
    );

    await interaction.reply({ embeds: [embed] });
  }
};
