# VOITANS

Modern web uygulaması ve AI destekli Discord bot projesi.

## 🚀 Projeler

### 🌐 Web Uygulaması (`/web`)
- **Next.js 15** ile geliştirilmiş modern web sitesi
- **Tailwind CSS** ile responsive tasarım
- **Framer Motion** animasyonları
- **Splash Cursor** efekti
- **Vercel** üzerinde deploy edilmiş
- **MongoDB** ile log sistemi

### 🤖 Discord Bot (`/bot`)
- **Discord.js v14** ile geliştirilmiş bot
- **AI destekli hafıza sistemi** (OpenRouter API)
- **SQLite database** ile kullanıcı verileri
- **MongoDB** ile log sistemi
- **Slash commands** desteği
- **Render.com** üzerinde deploy edilmiş

## 🛠️ Teknolojiler

### Web Stack
- **Framework**: Next.js 15.4.5
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Language**: TypeScript
- **Database**: MongoDB Atlas
- **Deployment**: Vercel

### Bot Stack
- **Framework**: Discord.js v14
- **Database**: SQLite3 (kullanıcı verileri) + MongoDB (loglar)
- **AI**: OpenRouter API (Claude 3.5 Sonnet)
- **Language**: JavaScript (Node.js)
- **Deployment**: Render.com

## 🚀 Hızlı Başlangıç

### Web Uygulaması
```bash
cd web
npm install
npm run dev
```

### Discord Bot
```bash
cd bot
npm install
npm run db:init
npm start
```

## 📊 Özellikler

### Web Uygulaması
- ✅ Modern ve responsive tasarım
- ✅ Splash cursor efekti
- ✅ Smooth animasyonlar
- ✅ SEO optimizasyonu
- ✅ Vercel deployment
- ✅ MongoDB log sistemi

### Discord Bot
- ✅ AI destekli sohbet
- ✅ Kullanıcı hafıza sistemi
- ✅ Profil yönetimi
- ✅ Slash commands
- ✅ Database entegrasyonu
- ✅ Memory management
- ✅ MongoDB log sistemi

## 🔧 Environment Variables

### Web (.env.local)
```env
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/voitans
LOG_INGEST_SECRET=your-secret-key
```

### Bot (.env)
```env
DISCORD_BOT_TOKEN=your_discord_bot_token
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_HISTORY_LIMIT=30
NODE_ENV=production
BOT_PREFIX=!
GUILD_ID=your_guild_id
CLIENT_ID=your_client_id
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/voitans
LOG_INGEST_URL=https://your-domain.vercel.app/api/officer/logs/ingest
LOG_INGEST_SECRET=your-secret-key
```

## 🗄️ MongoDB Kurulumu

### 1. MongoDB Atlas'ta Cluster Oluştur
1. https://cloud.mongodb.com adresine git
2. "Try Free" butonuna tıkla
3. Hesap oluştur (email veya Google/GitHub)
4. "Build a Database" → "FREE" plan seç
5. AWS provider ve Frankfurt/Amsterdam region seç
6. "Create" butonuna tıkla

### 2. Database User Oluştur
1. Sol menüden "Database Access" git
2. "Add New Database User" tıkla
3. Username: `voitans-bot`
4. Password: Güçlü şifre oluştur
5. "Read and write to any database" seç
6. "Add User" tıkla

### 3. Network Access Ayarla
1. Sol menüden "Network Access" git
2. "Add IP Address" tıkla
3. "Allow Access from Anywhere" seç (0.0.0.0/0)
4. "Confirm" tıkla

### 4. Connection String Al
1. Sol menüden "Database" git
2. "Connect" butonuna tıkla
3. "Connect your application" seç
4. Driver: Node.js, Version: 5.0+
5. Connection string'i kopyala
6. `<password>` yerine şifreni yaz
7. Sonuna `/voitans?retryWrites=true&w=majority` ekle

### 5. Environment Variables Ayarla
**Vercel'de (Web)**:
- `MONGODB_URI` = connection string
- `LOG_INGEST_SECRET` = rastgele güçlü secret

**Render'da (Bot)**:
- `MONGODB_URI` = aynı connection string
- `LOG_INGEST_URL` = `https://SENIN-SITEN.vercel.app/api/officer/logs/ingest`
- `LOG_INGEST_SECRET` = Vercel'deki ile aynı

## 🚀 Deployment

### Web (Vercel)
1. GitHub repo'yu Vercel'e bağla
2. Otomatik deploy aktif
3. Environment variable'ları ayarla

### Bot (Render.com)
1. GitHub repo'yu Render.com'a bağla
2. `render.yaml` dosyasındaki env vars'ları ayarla
3. Deploy et

## 📁 Proje Yapısı

```
thevoitansgithub/
├── web/                    # Next.js web uygulaması
│   ├── src/
│   │   ├── app/           # App Router
│   │   ├── components/    # React bileşenleri
│   │   ├── lib/          # MongoDB utilities
│   │   └── styles/        # CSS dosyaları
│   ├── public/            # Statik dosyalar
│   └── package.json
├── bot/                   # Discord bot
│   ├── commands/          # Slash commands
│   ├── events/            # Event handlers
│   ├── database/          # SQLite database
│   ├── memory/            # Memory management
│   ├── handlers/          # Message handlers
│   ├── logger.js          # MongoDB logger
│   └── package.json
├── render.yaml            # Render.com config
└── README.md
```

## 🧠 Memory Sistemi

Discord bot'u kullanıcıların konuşma geçmişini hatırlar:

1. **Kısa Vadeli**: RAM'de son konuşmalar
2. **Uzun Vadeli**: SQLite'da tüm geçmiş
3. **AI Özetleme**: Kullanıcı bilgilerini AI ile özetler
4. **Context Building**: Her yanıt için kullanıcı bağlamı

## 📝 Bot Komutları

### `/profile`
- `set`: Profil bilgilerini güncelle
- `stats`: Bot istatistiklerini görüntüle (Admin)

## 🔧 Geliştirme

### Web
```bash
cd web
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint check
```

### Bot
```bash
cd bot
npm start            # Bot'u başlat
npm run db:init      # Database başlat
npm run db:reset     # Database sıfırla
node test-memory.js  # Memory test
```

## 📈 Performans

- **Web**: Vercel Edge Network ile hızlı yükleme
- **Bot**: SQLite ile optimize edilmiş database
- **Logs**: MongoDB ile scalable log sistemi

## 🔒 Güvenlik

- **HMAC Signature**: Log ingest endpoint'i güvenli
- **Environment Variables**: Hassas bilgiler env'de
- **Rate Limiting**: API rate limiting aktif
- **Access Control**: Senior Officer erişimi gerekli
