"use client";
import clsx from "clsx";
// framer-motion'u dinamik ve koşullu (reduced-motion uyumlu) yükle
import dynamic from "next/dynamic";
const MotionDiv = dynamic(
  () => import("framer-motion").then((m) => m.motion.div),
  { ssr: false, loading: () => <div /> }
);

/* Utility */
export function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

/* Panel - glassmorphism + hairline */
export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        // Sade panel: tek hairline, hafif blur ve düşük gölge
        "rounded-2xl border border-white/10",
        "bg-black/30 backdrop-blur-[2px]",
        "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/* NeonButton - primary/outline */
export function NeonButton({
  children,
  size = "md",
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "md" | "lg";
  variant?: "primary" | "outline";
}) {
  // Ölçek: md h-11 (44px), lg h-12 (48px)
  const sizes =
    size === "lg"
      ? "h-12 px-5 text-[17px]"
      : "h-11 px-4 text-base";
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 " +
    sizes;

  if (variant === "outline") {
    return (
      <button
        {...props}
        className={cn(
          base,
          "border border-white/10 text-zinc-200 hover:border-white/20 hover:bg-white/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)]",
          className
        )}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      {...props}
      className={cn(
        base,
        "font-semibold text-black bg-[color:var(--accent-cyan)] hover:bg-[#57dbff] shadow-[0_5px_14px_rgba(57,208,255,.15)]",
        className
      )}
    >
      {children}
    </button>
  );
}

/* Badge - small capsule */
export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] leading-4 tracking-tight",
        "bg-white/5 border border-white/10 text-zinc-300",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
        className
      )}
    >
      {children}
    </span>
  );
}

/* Section header */
export function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="display text-2xl font-semibold tracking-tight">{title}</h2>
      {subtitle ? (
        <p className="text-zinc-400 mt-1 max-w-2xl">{subtitle}</p>
      ) : null}
    </div>
  );
}

/* PaginationCapsule - previous/next with page indicator */
export function PaginationCapsule({
  page,
  totalPages,
  onPrev,
  onNext,
  size = "md",
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  size?: "md" | "lg";
}) {
  const btnSize = size === "lg" ? "h-12 px-5 text-[17px]" : "h-11 px-4 text-base";
  return (
    <div className="flex items-center justify-center gap-3 mt-6 text-sm text-zinc-300">
      <button
        onClick={onPrev}
        disabled={page <= 1}
        className={cn(
          "rounded-full border border-white/10 disabled:opacity-40 hover:border-white/20 hover:bg-white/5 transition-colors",
          btnSize
        )}
      >
        Önceki
      </button>
      <span className="px-2 text-zinc-400">
        Sayfa {page} / {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={page >= totalPages}
        className={cn(
          "rounded-full border border-white/10 disabled:opacity-40 hover:border-white/20 hover:bg-white/5 transition-colors",
          btnSize
        )}
      >
        Sonraki
      </button>
    </div>
  );
}

/* RoleDot - tiny colored dot */
export function RoleDot({ role }: { role: "Tank" | "Healer" | "DPS" }) {
  const color =
    role === "Tank" ? "bg-cyan-400" : role === "Healer" ? "bg-lime-400" : "bg-pink-500";
  return <span className={cn("size-2 rounded-full", color)} />;
}

/* Motion preference hook (prefers-reduced-motion) */
function usePrefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/* Parallax container + layer */
export function Parallax({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("relative overflow-hidden will-change-transform", className)}>
      {children}
    </div>
  );
}

export function ParallaxLayer({
  depth = 10,
  children,
  className,
}: {
  depth?: number; // px offset max
  children: React.ReactNode;
  className?: string;
}) {
  // Reduced motion tercihinde parallax devre dışı (erişilebilirlik)
  const reduced = usePrefersReducedMotion();

  // Lightweight mouse parallax with throttling for 60fps
  let raf = 0;
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      const t = e.currentTarget.getBoundingClientRect();
      const cx = t.left + t.width / 2;
      const cy = t.top + t.height / 2;
      const dx = (e.clientX - cx) / t.width;
      const dy = (e.clientY - cy) / t.height;
      const tx = -(dx * depth);
      const ty = -(dy * depth);
      (e.currentTarget as HTMLElement).style.setProperty(
        "transform",
        `translate3d(${tx}px, ${ty}px, 0)`
      );
      raf = 0;
    });
  };

  return (
    <div
      className={cn("absolute inset-0", className)}
      onMouseMove={handleMove}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.setProperty(
          "transform",
          "translate3d(0,0,0)"
        );
      }}
      style={{
        transition: reduced ? "none" : "transform .3s ease",
        willChange: reduced ? "auto" : "transform",
      }}
      aria-hidden={reduced ? true : undefined}
    >
      {children}
    </div>
  );
}

/* Liquid Loader */
export function LiquidLoader({
  show,
}: {
  show: boolean;
}) {
  if (!show) return null;

  const reduced = usePrefersReducedMotion();

  // Reduced motion: statik ve düşük görsel gürültü ile degrade
  if (reduced) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-0 z-[9999] grid place-items-center bg-[radial-gradient(600px_400px_at_50%_40%,rgba(57,208,255,.06),transparent_60%)]"
      >
        <div
          className="size-16 rounded-full"
          style={{
            boxShadow:
              "inset 0 0 28px rgba(57,208,255,.35), 0 0 40px rgba(57,208,255,.18)",
            background:
              "radial-gradient(closest-side, rgba(57,208,255,.45), rgba(255,77,157,.35))",
            filter: "blur(1.5px)",
          }}
        />
        <span className="sr-only">Yükleniyor…</span>
      </div>
    );
  }

  // Normal durumda framer-motion bileşenini dinamik (client-only) kullan
  return (
    <MotionDiv
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] grid place-items-center bg-[radial-gradient(600px_400px_at_50%_40%,rgba(57,208,255,.08),transparent_60%)]"
    >
      <MotionDiv
        className="size-24 rounded-full"
        style={{
          boxShadow:
            "inset 0 0 40px rgba(57,208,255,.4), 0 0 80px rgba(57,208,255,.25)",
          background:
            "radial-gradient(closest-side, rgba(57,208,255,.6), rgba(255,77,157,.5))",
          filter: "blur(2px)",
        }}
        animate={{
          borderRadius: [
            "30% 70% 65% 35% / 30% 30% 70% 70%",
            "50% 50% 50% 50%",
            "70% 30% 35% 65% / 60% 60% 40% 40%",
          ],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: "easeInOut",
          repeatType: "mirror",
        }}
      />
    </MotionDiv>
  );
}
