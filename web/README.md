This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Ortam Değişkenleri (ENV) – Voitans

Aşağıdaki değişkenler Discord API ve Üyeler sayfası için gereklidir:

Zorunlu
- DISCORD_BOT_TOKEN: Discord bot token’ı.
- DISCORD_GUILD_ID: Sunucu (guild) ID’si.

İsteğe bağlı (varsayılanlar parantez içinde)
- DISCORD_VOITANS_ROLE_ID: “Voitans” temel rol ID’si (1140381309500412008).
- VOITANS_IDS_TTL_MS: Guild üyeleri cache TTL (ms) (600000).
- VOITANS_HYDRATE_TTL_MS: Kullanıcı zenginleştirme TTL (ms) (600000).
- VOITANS_BG_CONCURRENCY: Arka plan hydrate worker sayısı (2).

Açıklama
- API tüm ROLE_PRIORITY rollerini kapsayacak şekilde üyeleri çeker; global hiyerarşi sıralaması (Guild Master en üstte) korunur.
- Üyeler sayfasında:
  - 300ms arama debounce, durum rozeti (backgroundRefresh/hydratedUntil), grid virtualization + skeleton.
  - Kartlarda dominant rol rengine göre accent ve ring, rol rozeti, mini emoji/ikon seti.
  - Akan Duvar görünümü çoklu sayfayı API’den çekerek zenginleşir; başarısız olursa yerel fallback devrededir.
## Vercel Deploy Notları (Node 22.x)
- Node: 22.x (Vercel Project Settings → General → Node.js Version)
- Build Command: npm run build
- Install Command: npm install
- Output Directory: .next
- Environment Variables (Vercel → Settings → Environment Variables):
  - NEXTAUTH_URL
  - NEXTAUTH_SECRET
- Büyük assetler için LFS kotasını izleyin veya harici depolama (S3/CDN) düşünün.

## Railway (Discord Bot)
- Service Path: discordbot
- Start Command: npm start (veya node index.js)
- Variables: BOT_TOKEN, CLIENT_ID, (ops) GUILD_ID
