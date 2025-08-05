/**
 * Ortak log gönderici helper.
 * .env:
 *   SITE_LOG_INGEST_URL=https://site.example.com/api/officer/logs/ingest
 *   (Auth istenmedi: token yok)
 */
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

async function postLog(payload = {}) {
  // Çoklu URL desteği:
  // - SITE_LOG_INGEST_URLS: virgülle ayrılmış tam URL listesi
  // - yoksa SITE_LOG_INGEST_URL tekil fallback
  const urlsEnv = process.env.SITE_LOG_INGEST_URLS;
  const singleUrl = process.env.SITE_LOG_INGEST_URL;

  // Fallback: API_BASE_URL varsa otomatik türet
  let derived = [];
  const base = process.env.API_BASE_URL;
  if (base) {
    const clean = String(base).replace(/\/+$/, "");
    derived = [`${clean}/api/officer/logs/ingest`];
  }

  const urls = (urlsEnv
    ? urlsEnv.split(",")
    : (singleUrl ? [singleUrl] : derived)
  )
    .map(s => String(s || "").trim())
    .filter(Boolean)
    // protokolsüz yazıldıysa https ile düzelt
    .map(u => (u.startsWith("http://") || u.startsWith("https://")) ? u : `https://${u}`);

  if (!urls.length) {
    console.warn("[logIngest] SITE_LOG_INGEST_URL(S) ve API_BASE_URL tanımlı değil, log post atlanıyor.");
    console.warn("[logIngest] Örnek tekil: SITE_LOG_INGEST_URL=https://<your-app>/api/officer/logs/ingest");
    console.warn("[logIngest] Örnek çoklu: SITE_LOG_INGEST_URLS=https://app-1/api/officer/logs/ingest,https://app-2/api/officer/logs/ingest");
    console.warn("[logIngest] Alternatif: API_BASE_URL=https://<your-app> (otomatik /api/officer/logs/ingest türetilir)");
    return;
  }

  const ts = new Date().toISOString();
  const body = {
    timestamp: ts,
    ...payload,
  };

  // DIAGNOSTIC: outbound payload kısa özet
  try {
    const guildId = body.guildId || body?.data?.guildId || body?.data?.guild?.id;
    const userId = body.userId || body?.data?.userId;
    const channelId = body.channelId || body?.data?.channelId;
    console.log(
      "[logIngest:POST]",
      body.event,
      "| guild:",
      guildId || "-",
      "| user:",
      userId || "-",
      "| channel:",
      channelId || "-"
    );
  } catch {}

  try {
    // Shared-secret header ekle (varsa)
    const baseHeaders = {
      "content-type": "application/json",
    };
    // Yeni isim: SITE_LOG_INGEST_TOKEN (API ile hizalı)
    const ingestToken = process.env.SITE_LOG_INGEST_TOKEN || process.env.INGEST_TOKEN;
    if (ingestToken) {
      baseHeaders["X-Ingest-Token"] = ingestToken;
    }

    // Her URL için POST dene, biri bile başarılıysa OK yaz
    let anyOk = false;
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: baseHeaders,
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.warn("[logIngest] HTTP", res.status, "-", url, "-", txt);
        } else {
          anyOk = true;
          console.log("[logIngest] OK 200 -", url, "-", body.event);
        }
      } catch (err) {
        console.warn("[logIngest] POST error -", url, "-", err?.message || err);
      }
    }
    if (!anyOk) {
      console.warn("[logIngest] Tüm URL denemeleri başarısız:", urls.join(", "));
    }
  } catch (e) {
    console.warn("[logIngest] Hata:", e?.message || e);
  }
}

/**
 * Minimal kullanıcı + sunucu bilgisi normalize edici
 */
function baseUser(user) {
  if (!user) return {};
  const id = String(user.id || "");
  // minimal username: tag yok
  const username = user.username || (user.tag ? String(user.tag).split("#")[0] : undefined);
  return {
    userId: id || undefined,
    data: {
      userName: username,
    },
  };
}

function baseGuild(guild) {
  if (!guild) return {};
  return {
    guildId: String(guild.id || ""),
    data: {
      guildId: String(guild.id || ""),
      guildName: guild.name,
    },
  };
}

function baseChannel(channel) {
  if (!channel) return {};
  // name bazı channel tiplerinde olmayabilir; toString ya da id ile fallback
  const name = channel.name || (typeof channel.toString === "function" ? channel.toString() : null) || undefined;
  return {
    channelId: String(channel.id || ""),
    data: {
      channelId: String(channel.id || ""),
      channelName: name,
    },
  };
}

// Yeni: Kullanıcı bilgilerini zenginleştir
async function enrichUserData(userId, guildId, guildNameFromEvent) {
  if (!userId || !guildId) return {};

  try {
    // Discord API'den guild member al
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
    });

    if (!response.ok) return {};

    const member = await response.json();
    const user = member?.user || {};

    // Guild adı: member payload'ında gelmez, eventten gelen ismi kullan ya da fallback olarak ayrı isteğe git.
    let guildName = guildNameFromEvent;
    if (!guildName) {
      try {
        const gRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
          headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
        });
        if (gRes.ok) {
          const g = await gRes.json();
          guildName = g?.name || undefined;
        }
      } catch {}
    }
    if (!guildName) guildName = "Bilinmeyen Sunucu";

    // Username (discriminator "#0" olabilir; sade username yeterli)
    const username = user?.username || "kullanici";

    // Tam ID
    const fullId = String(user?.id || userId);

    // Display name öncelik: sunucu nick > global_name > username
    const displayName = member?.nick || user?.global_name || username;

    // Avatar URL oluştur (user avatar)
    const avatarHash = user?.avatar || null;
    let userAvatarUrl;
    if (avatarHash) {
      const ext = avatarHash.startsWith("a_") ? "gif" : "png";
      userAvatarUrl = `https://cdn.discordapp.com/avatars/${fullId}/${avatarHash}.${ext}?size=128`;
    } else {
      // default embed avatar
      const sum = fullId.split("").reduce((acc, ch) => (/\d/.test(ch) ? acc + (ch.charCodeAt(0) - 48) : acc), 0);
      const idx = sum % 5;
      userAvatarUrl = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
    }

    // Formatlı kullanıcı bilgisi
    const userDisplay = `${guildName} - ${username} - ${fullId}`;

    return {
      userDisplay,
      userName: username,
      userAvatarUrl,
      displayName,
      guildName,
      userId: fullId,
      guildId: String(guildId),
    };
  } catch (error) {
    console.error("[logIngest] Kullanıcı bilgileri alınamadı:", error);
    return {};
  }
}

module.exports = {
  postLog,
  baseUser,
  baseGuild,
  baseChannel,
  enrichUserData,
};
