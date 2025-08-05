Amaç

- Ortaçağ mistisizmi ve lüks estetiği birleştiren, performanslı ve güvenli bir lonca web sitesi (Next.js 14 App Router, TypeScript, Tailwind) geliştirmek.
- Üyelik, roller, takvim/haftalık program, duyurular, Twitch entegrasyonu ve Discord ekosistemi ile bütünleşik bir deneyim sağlamak.
- Minimal ama çarpıcı bir arayüz; koyu, derin, tekstürlü, metalik/altın vurgularla “asil ve gizemli” bir aura.

Estetik ve UX İlkeleri

- Temel hissiyat: Ortaçağ-mistik + lüks. “Katedral ışığı”, “parşömen dokusu”, “obsidyen/siyah mermer”, “eskitilmiş altın” vurguları.
- Renk paleti: Obsidyen siyah (#0b0b0d), derin mor (#2b1036), koyu lacivert (#0e1a2b) baz; vurgu olarak zarif altın (#d4af37), bazen kızıl (#7a1c1c).
- Tipografi: Serif başlık (Blackletter veya modern gotik esintili; okunabilirlik öncelik), Sans gövde (Inter/Modern Grotesk). Başlıklarda letterspacing hafif dar, ağır ağırlık; gövdede konforlu leading.
- UI dili: Camlı/yarı saydam paneller, ince tanecikli noise, soft glow, düşük doygun gradientler. “Aşırı skeuomorfik” değil; modern, sade, yerinde doku.
- Hareket: Yavaş parallax, hafif highlight parıltıları, focus/hover’da altın çizgi animasyonu. Kullanılabilirlik öncelik; 60fps hedef.
- Erişilebilirlik: Kontrast ≥ WCAG AA, klavye navigasyonu, odak görünürlüğü, motion-reduce desteği.

Bilgi Mimarisi ve İçerik

- Ana sayfa: Lonca vitrini (hero + manifest, son duyurular, öne çıkan etkinlik, yeni üyeler, Twitch canlı/son VOD). Logo/crest güçlü görünüm.
- Üyeler: /members (src/app/api/members/route.ts ve src/data/members.json’dan beslenen), rollere göre filtre/etiket, MemberCard detayları.
- Roller: /roles (src/app/api/roles), roller ve yetkinlik tanımları; ortaçağ esintili armalar.
- Duyurular: /announcements, kronolojik liste; banner görselli duyuru kartları.
- Haftalık Program: /schedule/weekly, etkinlik takvimi; tier/önem rengi, timezone notu.
- Auth: NextAuth (src/app/api/auth/[...nextauth]) ile giriş/çıkış, rol tabanlı korunan bölümler.
- Entegrasyonlar: Discord (bot/log’lar “discordbot/”), Twitch (LazyTwitch bileşeni), BDO içerik akışı (public/bdo-*.json, attachments).

Teknik Çerçeve

- Next.js App Router, RSC tercih; istemci bileşenleri sadece gerektiğinde.
- TypeScript katı mod.
- Tailwind + tokens.css ile tema/DS. Renkler, spacing, z-index, shadow, blur, glow token’ları.
- Performans: Static/ISR tercih; API route’larında sade ve cache-friendly yanıtlar. Resim/video optimizasyonu. Dinamik import/lazy.
- Güvenlik: Auth guard, rate limit önerisi, API validation (zod). .env sızıntısı yok.
- Test ve Kalite Kapısı: npm run lint, tsc --noEmit, test (mevcutsa), npm run build yeşil olmadan merge yok.
- Komut: Geliştirme için “npm run dev:all” (README’de belirtildiği gibi).

Bileşen ve Sayfa Prensipleri

- src/components/ui.tsx: temel primitive’ler (Button, Card, Panel, GlowBorder, Tooltip). Altın vurguyu utility sınıflarla tek noktadan kontrol.
- MemberCard: avatar/crest, sınıf/rol rozetleri, hover parıltı.
- AdventuresTabs: tema ile uyumlu, klavye erişilebilir tablar.
- LazyTwitch: SSR uyumlu, client-only, IntersectionObserver.
- Cursor: Mistik imleç izi opsiyonel ve performans kontrollü.
- LocaleSwitcher: LTR/RTL ve dil seçimi için erişilebilir menü.

Veri ve API

- /api/members, /api/roles, /api/announcements, /api/schedule/weekly: tip güvenli, zod validate, hataları yapılandırılmış döndür.
- public/bdo-merged.json ve bdo-media.json gibi varlıklar okurken parse ve güvenlik kontrolleri.
- Discord bot klasörü web’den izole; web, bot tarafından üretilen JSON’ları sadece okur (gerekirse cron/ISR).

Görsel Kimlik

- Logo/crest: public/voitans-logo.svg; altın işleme, siyah arkaplanda fit. Düşük ışıkta güçlü kontrast.
- Banner/hero: public/assets/discord-banner-1920x1080.svg’den referans, noise + vignette + hafif volumetrik ışık efekti.
- İkonografi: Gotik/minimal çizgi ikonlar; stroke altın, hover’da yumuşak parıltı.

Performans ve Erişilebilirlik Hedefleri

- LCP < 2.0s (desktop), TTI < 3s. Görseller preloaded/optimized. Üst fold minimal JS.
- A11y denetimleri: semantic landmarks, aria etiketleri, form doğrulama feedback.

İş Akışı ve Kurallar

- Önce Plan, sonra Eylem. Her adım atomik; her mesajda tek tool.
- Değişikliklerde: Neden, Etki, Risk, Test Planı notu ekle.
- Konvansiyonel commit mesajları.
- Yıkıcı işlemler requires_approval=true ve yedek/geri alma planı.

Yakın Dönem Yol Haritası

1. Tema altyapısı: tokens.css genişlet, Tailwind theme map’le. Altın/obsidyen/mor varyant utility’leri.
2. UI primitives: GlowBorder, Panel, Button, Card, Tag/Badge, Tabs, Tooltip.
3. Layout katmanı: Ortaçağ dokulu arka plan, noise overlay, grid, nav/footer; Hero bölüm.
4. Sayfa iskeletleri: Members, Roles, Announcements, Schedule; mevcut API’larla veri bağlama.
5. A11y ve Performans turu: contrast/motion, img/video optimizasyonları, lazy/dynamic.
6. Auth/rol koruması: SSR yönlendirmeler, server actions ile kontrol.
7. Görsel ince ayar: tipografi tuning, mikro-animasyonlar.
