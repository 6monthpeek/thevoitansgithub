/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {},
  eslint: { 
    ignoreDuringBuilds: process.env.NODE_ENV === 'production' 
  },

  // Replit/Riker proxy arkasında doğru host/proto'yu NextAuth'a yansıtmak için header'ları sabitle
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Proxy'ler üzerinden gelirken orijinal host/proto bilgisini koru
          { key: "X-Forwarded-Proto", value: "https" },
          // Replit riker alt alan adları için Host değeri runtime'da değişebilir, orijinali korumaya çalış
          // Burada sabit Host yazmıyoruz; Next kendi Host'u alır. Sadece proto'yu garanti ediyoruz.
        ],
      },
    ];
  },
};

export default nextConfig;
