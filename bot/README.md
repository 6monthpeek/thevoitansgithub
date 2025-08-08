# VOITANS Discord Bot

Modern Discord.js v14 ile geliştirilmiş, AI destekli hafıza sistemi olan Discord bot.

## 🚀 Özellikler

- **AI Destekli Sohbet**: OpenRouter API ile Claude 3.5 Sonnet
- **Hafıza Sistemi**: Kullanıcı konuşma geçmişini hatırlar
- **SQLite Database**: Hafif ve hızlı veri depolama
- **Profil Sistemi**: Kullanıcı profilleri ve ilgi alanları
- **Slash Commands**: Modern Discord slash command desteği
- **Memory Management**: AI ile kullanıcı bilgilerini özetleme

## 🛠️ Kurulum

### Gereksinimler
- Node.js 18+
- Discord Bot Token
- OpenRouter API Key

### Environment Variables

Render.com'da aşağıdaki environment variable'ları ayarlayın:

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

### Yerel Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Database'i başlatın:
```bash
npm run db:init
```

3. Bot'u başlatın:
```bash
npm start
```

## 📊 Database Yapısı

### Users Tablosu
- `discord_id`: Kullanıcı Discord ID'si
- `username`: Kullanıcı adı
- `nickname`: Sunucu takma adı
- `roles`: Kullanıcı rolleri (JSON)
- `message_count`: Toplam mesaj sayısı
- `reputation`: İtibar puanı

### Conversations Tablosu
- `user_id`: Kullanıcı ID'si
- `channel_id`: Kanal ID'si
- `message_content`: Mesaj içeriği
- `context_summary`: AI özeti
- `timestamp`: Mesaj zamanı

### User Profiles Tablosu
- `user_id`: Kullanıcı ID'si
- `bio`: Kullanıcı biyografisi
- `interests`: İlgi alanları (JSON)
- `skills`: Yetenekler (JSON)
- `favorite_topics`: Favori konular (JSON)

## 🧠 Memory Sistemi

Bot, kullanıcıların konuşma geçmişini hatırlar ve AI ile analiz eder:

1. **Kısa Vadeli Hafıza**: RAM'de son konuşmalar
2. **Uzun Vadeli Hafıza**: SQLite'da tüm geçmiş
3. **AI Özetleme**: Kullanıcı bilgilerini AI ile özetler
4. **Context Building**: Her yanıt için kullanıcı bağlamı oluşturur

## 📝 Komutlar

### `/profile`
- `set`: Profil bilgilerini güncelle
- `stats`: Bot istatistiklerini görüntüle (Admin)

### Örnek Kullanım:
```
/profile set bio:Merhaba, ben bir geliştiriciyim
/profile set interests:["programlama", "oyun", "müzik"]
/profile stats
```

## 🔧 Geliştirme

### Test Etme
```bash
# Memory sistemini test et
node test-memory.js

# Database'i sıfırla
npm run db:reset
```

### Yeni Özellik Ekleme
1. `commands/` klasörüne yeni komut ekle
2. `events/` klasörüne yeni event handler ekle
3. Database şemasını güncelle (gerekirse)
4. Memory sistemini genişlet

## 🚀 Render.com Deployment

1. GitHub repo'yu Render.com'a bağla
2. `render.yaml` dosyasındaki environment variable'ları ayarla
3. Deploy et

## 📈 Performans

- **Database**: SQLite ile hızlı sorgular
- **Memory**: LRU cache ile optimize edilmiş
- **AI**: OpenRouter ile güçlü AI yanıtları
- **Scalability**: Modüler yapı ile genişletilebilir

## 🤝 Katkıda Bulunma

1. Fork yap
2. Feature branch oluştur
3. Commit yap
4. Pull request gönder

## 📄 Lisans

MIT License
