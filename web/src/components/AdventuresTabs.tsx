"use client";
import { useEffect, useMemo, useState } from "react";

type TabId = "aoc" | "bdo" | "nw";

const tabs: Array<{ id: TabId; label: string; subtitle: string }> = [
  { id: "aoc", label: "Ashes of Creation", subtitle: "Guild odaklı epik hazırlık" },
  { id: "bdo", label: "Black Desert Online", subtitle: "Ekonomi, node savaşları, boss rotaları" },
  { id: "nw", label: "New World", subtitle: "Savaş, bölge hakimiyeti ve crafting düzeni" },
];

export default function AdventuresTabs() {
  const [active, setActive] = useState<TabId>("aoc");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Maceralarımız sekmeleri">
        {tabs.map((t) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              aria-controls={`adv-panel-${t.id}`}
              id={`adv-tab-${t.id}`}
              onClick={() => setActive(t.id)}
              className={`px-4 py-2 text-sm rounded-full border transition-all ${
                selected
                  ? "text-white border-white/20 bg-white/5 shadow-[0_8px_20px_rgba(0,0,0,.25)]"
                  : "text-zinc-300 border-white/10 hover:border-white/20 hover:bg-white/5"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6">
        {active === "aoc" && <AOCPanel />}
        {active === "bdo" && <BDOPanel />}
        {active === "nw" && <NWPanel />}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
      <div className="text-sm text-zinc-400">{children}</div>
    </section>
  );
}

/* 1) Ashes of Creation */
/* Utilities to load archived media from output/aoc-channel.json */
type MediaItem = {
  id: string;
  type: "image" | "video" | "other";
  url: string;
  localPath?: string;
  filename?: string;
  timestamp?: string;
};

function useAOCMedia() {
  const [items, setItems] = useState<MediaItem[]>([]);
  useEffect(() => {
    let alive = true;
    // Dinamik import: build’a dahil etmeyelim, yalnızca client’ta yükleyelim
    (async () => {
      try {
        const res = await fetch("/aoc-channel.json").catch(() => null);
        // Public’te yoksa, çalışma klasöründeki output yolunu deneyelim (dev ortamında static serve edilmeyebilir)
        let json: any = null;
        if (res && res.ok) {
          json = await res.json();
        } else {
          // fallback: relative fetch denemesi (başarısız olabilir)
          const r2 = await fetch("/output/aoc-channel.json").catch(() => null);
          if (r2 && r2.ok) json = await r2.json();
        }
        if (!json) return;
        const messages: any[] = json.messages || [];
        const collected: MediaItem[] = [];
        for (const m of messages) {
          const atts = m.attachments || [];
          for (const a of atts) {
            const ext = (a.filename || "").toLowerCase();
            const isImg = /\.(png|jpg|jpeg|webp|gif)$/i.test(ext) || (a.content_type || "").startsWith("image/");
            const isVid = /\.(mp4|webm|mov)$/i.test(ext) || (a.content_type || "").startsWith("video/");
            if (isImg) {
              collected.push({
                id: `${m.id}-${a.id}`,
                type: "image",
                url: a.url,
                localPath: a.localPath ? `/aoc-attachments/${a.localPath.split("/").pop()}` : undefined,
                filename: a.filename,
                timestamp: m.timestamp,
              });
            } else if (isVid) {
              collected.push({
                id: `${m.id}-${a.id}`,
                type: "video",
                url: a.url,
                localPath: a.localPath ? `/aoc-attachments/${a.localPath.split("/").pop()}` : undefined,
                filename: a.filename,
                timestamp: m.timestamp,
              });
            }
          }
        }
        // Yeni -> eski sıralama
        collected.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
        if (alive) setItems(collected);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);
  return items;
}

function MediaThumb({ it }: { it: MediaItem }) {
  const src = it.localPath || it.url;
  if (it.type === "video") {
    return (
      <div className="rounded-xl overflow-hidden border border-white/10 bg-black/30">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={src}
          controls
          preload="none"
          className="w-full h-full object-cover"
          style={{ aspectRatio: "16 / 9" }}
        />
      </div>
    );
  }
  return (
    <div className="rounded-xl overflow-hidden border border-white/10 bg-black/30">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={it.filename || "AOC media"}
        loading="lazy"
        className="w-full h-full object-cover"
        style={{ aspectRatio: "16 / 9" }}
      />
    </div>
  );
}

function AOCPanel() {
  const media = useAOCMedia();
  const [limit, setLimit] = useState(12);
  const hasMore = media.length > limit;

  const featured = media[0];
  const grid = media.slice(1, limit);

  return (
    <div id="adv-panel-aoc" role="tabpanel" aria-labelledby="adv-tab-aoc" className="space-y-6">
      {/* Hero header */}
      <header className="flex items-start gap-4">
        <div className="size-12 rounded-xl bg-white/5 border border-white/10 grid place-items-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/voitans-logo.svg" alt="VOITANS Crest" className="w-7 h-7 object-contain opacity-90" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Ashes of Creation</h2>
          <p className="text-zinc-400 text-sm">
            MMORPG’lere dönüş yolculuğu – lonca merkezli, riskli ve anlamlı savaşlara özlem.
          </p>
        </div>
      </header>

      {/* Featured media */}
      {featured && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
          <MediaThumb it={featured} />
        </div>
      )}

      {/* Manifesto + Summary layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Manifesto (2 cols) */}
        <article className="lg:col-span-2 rounded-2xl border border-white/10 bg-black/30 p-5 leading-7 text-[15px] text-zinc-300">
          <h3 className="font-semibold text-zinc-100 text-base mb-2">Yıllar Geçti…</h3>
          <p className="mb-3">
            Ne kadar oyun oynadık bilmiyorum. Bazıları bir heves sürdü, bazıları bir ömür gibi… Ama bazıları vardı ki… dokundu.
            Gerçekmiş gibi. İçindeymişiz gibi. Ve biz… biz o dünyaların bir parçası olduk.
          </p>
          <p className="mb-3">
            Kimi hâlâ orada; hâlâ bir karakterin içinde nefes alıyor, savaşıyor. Kimi çoktan silinmiş, ama silinememiş. Çünkü bazı
            karakterler oyunda ölür, ama bizde yaşamaya devam eder. Sonra fark edersin: O karakter hep sendi. Biz kaçmadık… sadece sistem
            kapandı. Ama içimizde bir dünya hâlâ açık kaldı.
          </p>

          <h3 className="font-semibold text-zinc-100 text-base mt-5 mb-2">Neden Hâlâ Özlüyoruz?</h3>
          <p className="mb-3">
            Belki de bu dünyada tutunacak bir yer bulamadığımızda, başka bir evren arıyoruz. Bir kamp ateşi etrafında yeniden toplanmak,
            tanımadığın biriyle yan yana savaşıp adını hiç unutmamak istiyoruz.
          </p>
          <p className="mb-3">
            Benim için MMORPG’ler yalnızca vakit geçirmek olmadı. Orada olmak bir şeydi: bir amaç için, bir ekip için, bazen sadece
            kendin için mücadele etmek. Yalnız başlarsın; sonra bir bakmışsın bir grubun içindesin. Beraber kasarsın, beraber düşersin…
            sonra tekrar denersin.
          </p>
          <p className="mb-3">
            Boss’lar öğretir; ama beni içine çeken PvP’dir: Kalabalık meydanlarda yüzlerce kişinin çarpıştığı anlar… Orada sadece refleks
            değil, ruh da devreye girer. Bir adım geri çekilsen takımın dağılır, bir adım ileri atsan herkesin kaderi değişir. Doğru
            zamanda doğru adım – işte o an, gerçekten önemlisin.
          </p>

          <h3 className="font-semibold text-zinc-100 text-base mt-5 mb-2">Ne Değişti?</h3>
          <p className="mb-3">
            Yeni çıkan MMORPG’ler çoğu zaman eskisinin izini sürmekten öteye geçemedi. Grafikler güzelleşirken ruh kayboldu; yapımcılar
            oyuncuyu değil algoritmayı düşündü. Gösterişli ama risksiz savaşlar, pay-to-win ya da sayı kıyasına dönen PvP’ler…
            “Dünya büyük” dediler, içi boş kaldı. Guild sistemleri vardı ama herkes yalnızdı.
          </p>
          <p className="mb-3">
            Görev listesi gibi oyunlar: “Git-kes-getir-ver” döngüsünde anlam yitip gitti. Başarmanın yerine “bitirme” kondu. Bekledik;
            çıktığında iki hafta sonra sildiğimiz oyunlar oldular.
          </p>

          <h3 className="font-semibold text-zinc-100 text-base mt-5 mb-2">Ashes of Creation Neden?</h3>
          <p className="mb-0">
            Ashes of Creation, o özlemle yapılmış gibi. “Ben de oyuncuyum” diyen biri tarafından yazılmış gibi. Bu kez bir şirket değil,
            bizim gibiler yapıyormuş gibi hissettiriyor. Bu yüzden önem veriyoruz. Çünkü bu kez gerçekten eve dönüyor olabiliriz.
          </p>
        </article>

        {/* Right: Key points summary */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h4 className="text-sm font-semibold text-zinc-100">VOITANS AOC Yaklaşımı</h4>
            <ul className="mt-2 text-[13px] text-zinc-300 space-y-1.5">
              <li>• Uzun soluklu, lonca merkezli plan</li>
              <li>• Risk-getiri dengesi: gerçek kayıp, gerçek zafer</li>
              <li>• Net rol dağılımı ve disiplinli PvP</li>
              <li>• Ekonomi ve lojistik omurgası</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h4 className="text-sm font-semibold text-zinc-100">Bizi Çeken Öz</h4>
            <ul className="mt-2 text-[13px] text-zinc-300 space-y-1.5">
              <li>• Oyuncu merkezli tasarım</li>
              <li>• Anlamlı dünya ve guild etkisi</li>
              <li>• Gösteriden çok strateji ve emek</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h4 className="text-sm font-semibold text-zinc-100">Hedef</h4>
            <p className="mt-1 text-[13px] text-zinc-300">
              “Sıradaki MMO” değil; “eve dönüş”. Hatırladığımız o duyguyu yeniden bulmak.
            </p>
          </div>
        </aside>
      </div>

      {/* Media grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-100">AOC Medya Arşivi</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {grid.map((it) => (
            <MediaThumb key={it.id} it={it} />
          ))}
        </div>
        {hasMore && (
          <div className="flex justify-center">
            <button
              className="rounded-full px-4 py-2 text-sm border border-white/10 text-zinc-200 hover:border-white/20 hover:bg-white/5"
              onClick={() => setLimit((n) => n + 12)}
            >
              Daha Fazla
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* 2) Black Desert Online */
/* BDO: JSON beslemeli kronoloji + medya */
type BdoMessage = {
  id: string;
  channel_id: string;
  timestamp: string;
  author?: { id: string; username: string; global_name?: string | null } | null;
  content: string;
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
    content_type?: string | null;
  }>;
};

/* Medya tipleri ve bileşenleri kaldırıldı */

function formatMonth(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { year: "numeric", month: "long" });
}
function formatShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { month: "short", day: "2-digit" }) + " " + d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function useBdoData() {
  const [merged, setMerged] = useState<BdoMessage[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mj = await fetch("/bdo-merged.json", { cache: "no-store" })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null);
        if (!alive) return;
        if (mj?.messages) setMerged(mj.messages as BdoMessage[]);
      } catch {}
    })();
    return () => { alive = false; };
  }, []);
  return { merged };
}

/* Medya thumb kaldırıldı */

function pickHighlights(messages: BdoMessage[], max = 6) {
  // Basit kriter: medyası olan/uzun içerikli mesajlardan seç
  const scored = messages.map(m => {
    const hasMedia = (m.attachments || []).length > 0;
    const len = (m.content || "").length;
    const score = (hasMedia ? 2 : 0) + Math.min(1, len / 180);
    return { m, score };
  }).sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map(s => s.m);
}

function groupByMonth(messages: BdoMessage[]) {
  const map = new Map<string, BdoMessage[]>();
  for (const m of messages) {
    if (!m.timestamp) continue;
    const key = m.timestamp.slice(0, 7); // YYYY-MM
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  // Eski -> yeni
  for (const [k, arr] of map) arr.sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
  const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
  return keys.map(k => ({ key: k, title: formatMonth(k + "-01"), items: map.get(k)! }));
}

function BDOPanel() {
  // Medya ve filtre KALDIRILDI (istek üzerine)
  const { merged } = useBdoData();

  // BDO odaklı anlatım bloğu (küratörlü metin) + kritik savaş videosu
  const story = (
    <section className="rounded-2xl border border-white/10 bg-black/30 p-5 leading-7 text-[15px] text-zinc-300 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-zinc-100 mb-2">2017 — Başlangıç</h3>
        <p className="mb-3">
          İlk adımlar… Henüz sahnenin ışıkları sönmemişti. Bir dünyaya girdik ve geri dönmek gibi bir niyetimiz yoktu. 
          Zamanla “biz” olduk; tek tek oyunculardan, omuz omuza duran bir topluluğa dönüştük.
        </p>
        <h3 className="text-base font-semibold text-zinc-100 mt-4 mb-2">Kamasylvia Dönemi — Miru, OldmanClub</h3>
        <p className="mb-3">
          Kamasylvia genişlemesiyle birlikte Miru’da çok sayıda TF yaşadık. OldmanClub bünyesinde çarpıştık, öğrendik, alıştık, 
          düştük ve ayağa kalktık. Haritanın damarlarını, taktiklerin ritmini ezberledik.
        </p>
        <h3 className="text-base font-semibold text-zinc-100 mt-4 mb-2">2023 — WillOfFire ile Dönüş</h3>
        <p className="mb-0">
          Geri döndüğümüzde bir isim seçtik: WillOfFire. 
          Ateşin iradesini göstermek için dezavantajlı savaşları özellikle seçtik; kısa yolu değil, zoru tercih ettik. 
          İttifak tekliflerini reddettik; çünkü kimsenin gücüne ihtiyacımız yoktu. 
          Biz sahada yazılan hikâyeye inandık ve bu hikâye mücadeleyle büyüdü.
        </p>
      </div>

      {/* Önemli savaş: ArcherBDO1.mp4 */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="text-xs text-zinc-400 mb-2">Önemli Savaş — Zafer Kaydı</div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src="/bdo-attachments/ArcherBDO1.mp4"
          controls
          preload="metadata"
          // Poster yok: siyah placeholder still ile
          className="w-full h-full object-cover rounded-lg bg-black"
          style={{ aspectRatio: "16 / 9" }}
          controlsList="nodownload noplaybackrate"
        />
      </div>
    </section>
  );

  // Öne çıkanlar ve kronoloji kaldırıldı

  return (
    <div
      id="adv-panel-bdo"
      role="tabpanel"
      aria-labelledby="adv-tab-bdo"
      className="space-y-6 [contain:content]"
      style={{ contentVisibility: "auto" as any }}
    >
      {/* Header */}
      <header className="flex items-start gap-4">
        <div className="size-12 rounded-xl bg-white/5 border border-white/10 grid place-items-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/voitans-logo.svg" alt="VOITANS Crest" className="w-7 h-7 object-contain opacity-90" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Black Desert Online</h2>
          <p className="text-zinc-400 text-sm">2017’den WillOfFire’a uzanan yol: sahada yazılan hikâye.</p>
        </div>
      </header>

      {/* Anlatım bloğu */}
      <div className="grid lg:grid-cols-1 gap-6">
        <div className="lg:col-span-1">{story}</div>
      </div>


      {/* Kronoloji kaldırıldı */}

      {/* Medya bölümü kaldırıldı */}
    </div>
  );
}

/* 3) New World */
function NWPanel() {
  return (
    <div id="adv-panel-nw" role="tabpanel" aria-labelledby="adv-tab-nw" className="space-y-5">
      <header className="flex items-start gap-4">
        <div className="size-12 rounded-xl bg-white/5 border border-white/10 grid place-items-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/voitans-logo.svg" alt="VOITANS Crest" className="w-7 h-7 object-contain opacity-90" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">New World</h2>
          <p className="text-zinc-400 text-sm">Bölge savunması, savaş düzeni ve crafting omurgası.</p>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <Section title="Savaş Düzeni">
          - Roller: frontline, bruiser, ranged, healer
          <br />
          - Çağrı ve rotasyon planları
          <br />
          - Siege ve savunma dağılımı
        </Section>
        <Section title="Üretim ve Lojistik">
          - Crafting/rafting planı ve depo yönetimi
          <br />
          - Toplu kaynak temini ve dağıtım
          <br />
          - Ekipman bakımı ve tamir protokolleri
        </Section>
        <Section title="Günlük Akış">
          Görev, dungeon ve etkinlik rotaları ile haftalık plan.
        </Section>
        <Section title="Hedef">
          Bölge yönetiminde süreklilik, war performansında istikrar ve ekonomik güç.
        </Section>
      </div>
    </div>
  );
}
