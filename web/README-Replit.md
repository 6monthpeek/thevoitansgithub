# Replit Deploy Kılavuzu (Next.js + Discord Bot tek Repl)

Bu repo, Replit üzerinde tek repl içinde hem Next.js web hem de Discord botunu aynı anda çalıştıracak şekilde hazırlanmıştır. Web 3000 portunda dışa açılır, bot arka planda çalışır ve /keepalive endpoint’i ile uyanık tutulabilir.

## 1) Replit’e Import

1. Replit’te “Create Repl” -> “Import from GitHub”
2. Repo: `https://github.com/6monthpeek/thevoitansgithub`
3. Public import seçebilirsiniz (ücretsizde private import kısıtlı olabilir).

## 2) Secrets (Environment Variables)

Replit sağ menüden “Secrets” (Environment) açın ve aşağıdaki anahtarları ekleyin:

- DISCORD_BOT_TOKEN = Discord uygulamanızın bot token’ı
- DISCORD_CLIENT_ID = Discord uygulaması Client ID
- DISCORD_GUILD_ID = Slash komutlarını basacağınız guild ID
- SITE_LOG_INGEST_TOKEN = Rastgele bir shared secret (ingest endpoint’i için)
- API_BASE_URL = Replit URL’niz (örn: https://yourrepl.username.repl.co)

Opsiyonel (legacy isimler de desteklenir):
- TOKEN (bot token), CLIENT_ID, GUILD_ID

Bot keep-alive için varsayılan port 8080’dir:
- KEEPALIVE_PORT = 8080

Next.js için dış port 3000’dir:
- PORT = 3000

## 3) Start Komutu

Paket scriptleri replit için hazırlandı:

- `npm run dev:replit` veya `npm start`

Her ikisi de aynı işi yapar: concurrently ile
- Discord bot: `cd discordbot && node index.js`
- Next.js dev: `next dev -p 3000`

## 4) UptimeRobot (opsiyonel, free)

Replit ücretsiz planlarda trafik yoksa uykuya geçebilir. Uykuyu minimize etmek için UptimeRobot’a iki farklı monitör ekleyebilirsiniz:
- Web: `https://yourrepl.username.repl.co/` (Next.js)
- Bot keep-alive: `https://yourrepl.username.repl.co/keepalive` (discordbot/index.js içinde küçük HTTP server eklendi)

5 dakikada bir GET yeterlidir.

## 5) Discord Bot Slash Komutları

İlk açılışta bot, `discordbot/commands` altındaki komutları `DISCORD_GUILD_ID` tanımlı guild’e register eder. Değişiklik sonrası repl’i yeniden başlatmanız yeterlidir.

## 6) Log Ingest Endpoint (geçici no-op)

- `/api/officer/logs/ingest` endpoint’i Vercel/Serverless ortam sorunları yüzünden geçici olarak no-op’tur ve 200 OK döner.
- Üretimde kalıcı log depolama için Vercel KV/Redis veya DB (Supabase/Postgres) entegrasyonu önerilir.

## 7) Önemli Notlar

- Replit tek portu dışa açar. Bu repoda dışa açılan port 3000’dedir (Next.js). Bot HTTP keep-alive 8080’de bind olur fakat dıştan bağlanmak için Replit yönlendirmesi gerekmeyebilir. Eğer sadece tek servis dışa gerekiyorsa, Next.js dışa, bot içte kalması yeterlidir. UptimeRobot ping’i web’e yönlendirmek genelde yeterli olur.
- Node sürümü: package.json `engines` 20.x || 22.x. Replit’te Node 20 önerilir.
- .env.example dosyası referans olarak repo kökünde mevcuttur.

## 8) Hızlı Başlangıç

1. Replit import
2. Secrets ekle (DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID, SITE_LOG_INGEST_TOKEN, API_BASE_URL)
3. Shell:
   - `npm install`
   - `npm run dev:replit`
4. Replit “Open in Browser” ile siteyi görüntüle
5. UptimeRobot monitör(ler)ini ekle

Her şeyi doğru yaptıysanız:
- Web: `https://yourrepl.username.repl.co/`
- Bot keep-alive: `https://yourrepl.username.repl.co/keepalive`
- Bot konsolda “READY” ve “Slash komutları yüklendi.” göreceksiniz.
