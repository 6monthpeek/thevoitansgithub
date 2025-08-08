# VOITANS

Modern web uygulaması ve AI destekli Discord bot projesi.

## 🚀 Projeler

### 🌐 Web Uygulaması (`/web`)
- **Next.js 15** ile geliştirilmiş modern web sitesi
- **Tailwind CSS** ile responsive tasarım
- **Framer Motion** animasyonları
- **Splash Cursor** efekti
- **Vercel** üzerinde deploy edilmiş

### 🤖 Discord Bot (`/bot`)
- **Discord.js v14** ile geliştirilmiş bot
- **AI destekli hafıza sistemi** (OpenRouter API)
- **SQLite database** ile kullanıcı verileri
- **Slash commands** desteği
- **Render.com** üzerinde deploy edilmiş

## 🛠️ Teknolojiler

### Web Stack
- **Framework**: Next.js 15.4.5
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Language**: TypeScript
- **Deployment**: Vercel

### Bot Stack
- **Framework**: Discord.js v14
- **Database**: SQLite3
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

### Discord Bot
- ✅ AI destekli sohbet
- ✅ Kullanıcı hafıza sistemi
- ✅ Profil yönetimi
- ✅ Slash commands
- ✅ Database entegrasyonu
- ✅ Memory management

## 🔧 Environment Variables

### Web (.env.local)
```env
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
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
```

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
│   │   └── styles/        # CSS dosyaları
│   ├── public/            # Statik dosyalar
│   └── package.json
├── bot/                   # Discord bot
│   ├── commands/          # Slash commands
│   ├── events/            # Event handlers
│   ├── database/          # SQLite database
│   ├── memory/            # Memory management
│   ├── handlers/          # Message handlers
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
- **AI**: OpenRouter ile güçlü AI yanıtları
- **Memory**: LRU cache ile hızlı erişim

## 🤝 Katkıda Bulunma

1. Fork yap
2. Feature branch oluştur (`git checkout -b feature/amazing-feature`)
3. Commit yap (`git commit -m 'Add amazing feature'`)
4. Push yap (`git push origin feature/amazing-feature`)
5. Pull Request aç

## 📄 Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 👨‍💻 Geliştirici

**Ömer** - İstanbul'dan teknoloji tutkunu geliştirici

- Modern ve optimize sistemler
- Temiz ve modüler kod yapısı
- Performans odaklı geliştirme
- Kullanıcı deneyimi önceliği
