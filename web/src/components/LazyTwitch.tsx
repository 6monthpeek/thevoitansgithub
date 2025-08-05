"use client";
import React, { useEffect, useRef, useState } from "react";

export type LazyTwitchProps = {
  channel?: string;
  type?: "player" | "chat";
  className?: string;
  title?: string;
  parents?: string[];
};

function buildTwitchSrc(opts: { channel?: string; type?: "player" | "chat"; parents?: string[] }) {
  const channel = opts.channel || process.env.NEXT_PUBLIC_TWITCH_CHANNEL || "thevoitans";
  const envParents = (process.env.NEXT_PUBLIC_TWITCH_PARENTS || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const baseParents = (opts.parents && opts.parents.length ? opts.parents : envParents);
  const parents = (baseParents && baseParents.length ? baseParents : ["localhost"]);
  const parentParams = parents.map((p) => `parent=${encodeURIComponent(p)}`).join("&");

  const type = opts.type || "player";
  if (type === "chat") {
    return `https://www.twitch.tv/embed/${encodeURIComponent(channel)}/chat?${parentParams}`;
  }
  return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&${parentParams}`;
}

function LazyTwitch({ channel, type = "player", className, title, parents }: LazyTwitchProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "120px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const src = buildTwitchSrc({ channel, type, parents });

  return (
    <div ref={ref} className={className}>
      {!visible ? (
        <div className="absolute inset-0 rounded-xl border border-white/10 bg-white/[0.03] grid place-items-center text-zinc-400">
          İçerik yükleniyor…
        </div>
      ) : (
        <iframe
          title={title || (type === "chat" ? "Twitch Chat" : "Twitch Player")}
          className="absolute inset-0 w-full h-full rounded-xl border border-white/10 bg-black"
          src={src}
          allowFullScreen
          loading="lazy"
        />
      )}
    </div>
  );
}

export default LazyTwitch;
