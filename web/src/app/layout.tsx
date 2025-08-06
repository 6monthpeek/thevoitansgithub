import type { Metadata } from "next";
import { Cinzel, Inter, UnifrakturMaguntia, Orbitron, Anton, Zen_Dots, Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});
/* Display ve Mono fontlar (tasarım rehberi) */
const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const unifraktur = UnifrakturMaguntia({
  variable: "--font-unifraktur",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});
 
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Kullanıcının istediği "Zinc" benzeri sans için Zen Dots'u başlıkta kullanacağız
const zenDots = Zen_Dots({
  variable: "--font-zinc",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "THE VOITANS — Forge Your Legend",
  description:
    "Ultra modern, luxurious dark guild site for THE VOITANS. PvP & PvE excellence. Join and forge your legend.",
  // NOTE: Use env or fallback to current dev port (3031) to prevent mixed origins during dev.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3031"),
  openGraph: {
    title: "THE VOITANS — Forge Your Legend",
    description:
      "Ultra modern, luxurious dark guild site for THE VOITANS. PvP & PvE excellence.",
    url: "/",
    siteName: "THE VOITANS",
    images: [{ url: "/og-voitans.png", width: 1200, height: 630 }],
    type: "website",
  },
  icons: { icon: "/favicon.ico" },
};

import React from "react";
import dynamic from "next/dynamic";
// Server Component içinde ssr:false kullanılamaz; bu nedenle sadece dynamic import kullanıp
// ssr bayrağını kaldırıyoruz. LayoutClientShell zaten "use client" içerir.
const ClientShell = dynamic(() => import("../components/LayoutClientShell"));

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Hydration stabilitesi:
  // - className sabit string olarak serverda hesaplanır.
  // - cz-shortcut-listen vb. 3rd-party eklenti attribute farkları için suppressHydrationWarning html seviyesinde zaten aktif.
  const bodyClass =
    `${cinzel.variable} ${inter.variable} ${unifraktur.variable} ${orbitron.variable} ${anton.variable} ${zenDots.variable} ${sora.variable} ${jetbrains.variable} antialiased ` +
    `bg-grid text-[color:var(--fg)]`;

  return (
    <html lang="tr" suppressHydrationWarning>
      {/* body'de 3P uzantıların enjekte ettiği beklenmeyen attribute'ları tolere et */}
      <body className={bodyClass} suppressHydrationWarning>
        {/* Advanced.team benzeri iskelet: ortalanmış GIF arka plan katmanı */}
        <div aria-hidden className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          {/* styled-jsx kullanmadan inline style ile (Server Component uyumlu) */}
          <div
            className="absolute inset-0 grid place-items-center"
            style={{ pointerEvents: "none" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/thevoitanspurple-saturation100.gif"
              alt=""
              style={{
                width: "min(60vmin, 560px)",
                height: "auto",
                opacity: 0.22,
                imageRendering: "crisp-edges",
                filter: "saturate(1) contrast(1.05) brightness(1.05)",
                pointerEvents: "none",
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              inset: "-10%",
              pointerEvents: "none",
              mixBlendMode: "normal",
              background:
                "radial-gradient(60% 60% at 50% 40%, rgba(80,80,120,0.20), transparent 65%)," +
                "radial-gradient(80% 80% at 50% 80%, rgba(0,0,0,0.45), transparent 60%)," +
                "linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.60))",
            }}
          />
        </div>
        {/* First paint'te body üzerindeki bilinmeyen attribute'ları temizle */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  try {
    var b = document.body;
    if(!b) return;
    var allowed = new Set(["class","style"]); // sadece class ve style'a izin
    // cz-shortcut-listen gibi beklenmeyen attr'ları kaldır
    Array.from(b.attributes).forEach(function(attr){
      if(!allowed.has(attr.name)) {
        try { b.removeAttribute(attr.name); } catch(e){}
      }
    });
  } catch(e){}
})();`
          }}
        />
        {/* Client-only parçaları ayrı bir shell içinde render et */}
        <ClientShell>
          {children}
        </ClientShell>
      </body>
    </html>
  );
}
