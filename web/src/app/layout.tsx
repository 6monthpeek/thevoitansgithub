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
import AuthSessionProvider from "../components/AuthSessionProvider";
import AuthButton from "../components/AuthButton";

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
        {/* RSC uyarısını gidermek için provider'ı ayrı bir client bileşenine taşıyoruz */}
        <AuthSessionProvider>
          {/* Basit global auth butonu (geçici) */}
          <div className="fixed top-3 right-3 z-50">
            <AuthButton />
          </div>
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
