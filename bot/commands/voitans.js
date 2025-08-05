// Discord.js v14 - Slash Command (Chat Input) "kayıt"
// Kullanım: /kayıt uye:@user oyun_adi:"..." gercek_ad:"..." (gercek_ad opsiyonel)
// Gerekli izinler: Manage Nicknames, Manage Roles; bot rolü hiyerarşide yeterince üstte olmalı.

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");

// ROL/KANAL sabitleri (isterseniz Settings.json'a taşıyın)
const ROLE_IDS = {
  SUPPORT: "1249512318929342505", // Komutu kullanma izni (opsiyonel; ayrıca permissions ile sınırlandırıyoruz)
  WOF: "1140381309500412008",
  WAITLISTED: "1202082025821966417",
  GRIND: "1097803365586571294",
  CLASS: "720680856368185364",
  BOSS: "1093075649511559228",
  BUFF: "770954181632327680",
};

const LOG_CHANNEL_ID = "1168164420904570991";

// Slash komut tanımı
module.exports.data = new SlashCommandBuilder()
  .setName("kayıt")
  .setDescription("Üyeyi kayıt eder; takma adını ayarlar, bekleme listesini kaldırır ve WOF rolünü verir.")
  .addUserOption((opt) =>
    opt.setName("uye").setDescription("Kayıt edilecek üye").setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName("oyun_adi").setDescription("Oyundaki kullanıcı adı").setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName("gercek_ad").setDescription("Gerçek adı").setRequired(false)
  )
  // Komutu sadece belirli izni olanların kullanmasına izin ver (ManageRoles yeterli bir kısıt olabilir)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

// v14 Slash komut çalıştırma
module.exports.execute = async (interaction) => {
  try {
    if (!interaction.inGuild()) {
      return interaction.reply({ content: "Bu komut yalnızca sunucu içinde kullanılabilir.", ephemeral: true });
    }

    const guild = interaction.guild;
    const uye = interaction.options.getUser("uye", true);
    const oyunAdi = interaction.options.getString("oyun_adi", true);
    const gercekAd = interaction.options.getString("gercek_ad") ?? undefined;

    // Üye resolve
    const member =
      guild.members.resolve(uye.id) || (await guild.members.fetch(uye.id).catch(() => null));
    if (!member) {
      return interaction.reply({ content: "Üye sunucuda bulunamadı.", ephemeral: true });
    }

    // Rolleri hazırla
    const wof = guild.roles.cache.get(ROLE_IDS.WOF);
    const waitlisted = guild.roles.cache.get(ROLE_IDS.WAITLISTED);
    // Diğer roller istenirse açılabilir:
    // const grind = guild.roles.cache.get(ROLE_IDS.GRIND);
    // const classs = guild.roles.cache.get(ROLE_IDS.CLASS);
    // const boss = guild.roles.cache.get(ROLE_IDS.BOSS);
    // const buff = guild.roles.cache.get(ROLE_IDS.BUFF);

    // Nickname ayarla
    const newNick = gercekAd ? `${oyunAdi} | ${gercekAd}` : `${oyunAdi}`;
    await member.setNickname(newNick).catch(() => {});

    // Rol işlemleri
    if (wof) await member.roles.add(wof).catch(() => {});
    if (waitlisted) await member.roles.remove(waitlisted).catch(() => {});
    // if (grind) await member.roles.add(grind).catch(() => {});
    // if (classs) await member.roles.add(classs).catch(() => {});
    // if (boss) await member.roles.add(boss).catch(() => {});
    // if (buff) await member.roles.add(buff).catch(() => {});

    // Kayıt başarılı embed (kanala duyuru)
    const chat = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("KAYIT BAŞARILI")
      .addFields(
        { name: "Kayıt edilen kullanıcı", value: `${uye}`, inline: false },
        { name: "Oyundaki kullanıcı adı", value: oyunAdi, inline: true },
        { name: "Gerçek Adı", value: gercekAd ?? "-", inline: true },
        { name: "Kayıt eden yetkili", value: `${interaction.user}`, inline: false }
      )
      .setImage("https://cdn.discordapp.com/banners/1140361736470409316/72b649cc2984dacb04bb8a603c49f89a.webp?size=4096")
      .setThumbnail(uye.displayAvatarURL({ size: 256 }))
      .setTimestamp(new Date());

    await interaction.reply({ embeds: [chat] });

    // Hoş geldin mesajı
    await interaction.followUp({
      content: `${uye} aramıza hoş geldin!\nTüm <@&${ROLE_IDS.WOF}> topluluğuna duyurudur, ${uye} loncamıza yeni katıldı. Hoş geldin demeyi unutmayalım :pray:`,
    }).catch(() => {});

    // Log kanalına detay
    const log = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("KAYIT BAŞARILI")
      .addFields(
        { name: "Kayıt edilen kullanıcının Discord ID", value: uye.id, inline: true },
        { name: "Kayıt edilen kullanıcının Discord Adı", value: uye.username ?? uye.tag, inline: true },
        { name: "Kayıt edilen kullanıcı", value: `${uye}`, inline: false },
        { name: "Oyundaki kullanıcı adı", value: oyunAdi, inline: true },
        { name: "Gerçek Adı", value: gercekAd ?? "-", inline: true },
        { name: "Kayıt eden yetkili", value: `${interaction.user}`, inline: false },
        { name: "Kayıt eden yetkili Discord ID", value: interaction.user.id, inline: true },
        { name: "Kayıt eden yetkili Discord Adı", value: interaction.user.username ?? interaction.user.tag, inline: true }
      )
      .setThumbnail(uye.displayAvatarURL({ size: 256 }))
      .setTimestamp(new Date());

    const logCh = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
    if (logCh && logCh.send) {
      await logCh.send({ embeds: [log] }).catch(() => {});
    }
  } catch (err) {
    console.error("[/kayıt] error:", err);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: "Komut çalıştırılırken bir hata oluştu.", ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: "Komut çalıştırılırken bir hata oluştu.", ephemeral: true }).catch(() => {});
    }
  }
};

// Eğer komut yükleyiciniz module.exports.settings bekliyorsa basit bir harita bırakıyoruz (opsiyonel)
module.exports.settings = {
  Commands: ["kayıt", "kayit"],
  Slash: true,
  Description: "Üyeyi kayıt eder ve rollerini günceller.",
};
