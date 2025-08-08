"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// Animated Background Component
export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      hue: number;
    }> = [];

    // Create particles
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.3 + 0.1,
        hue: Math.random() * 60 + 30, // Gold to amber range
      });
    }

    const animate = () => {
      // Create fade trail effect instead of clearing
      ctx.fillStyle = "rgba(10, 10, 10, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.forEach((particle) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.hue += 0.05;

        // Wrap around edges
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.y > canvas.height) particle.y = 0;
        if (particle.y < 0) particle.y = canvas.height;

        // Draw particle with glow
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 2
        );
        gradient.addColorStop(0, `hsla(${particle.hue}, 70%, 50%, ${particle.opacity})`);
        gradient.addColorStop(0.5, `hsla(${particle.hue}, 70%, 50%, ${particle.opacity * 0.3})`);
        gradient.addColorStop(1, `hsla(${particle.hue}, 70%, 50%, 0)`);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      // Draw connecting lines (less frequently)
      if (Math.random() > 0.8) {
        particles.forEach((particle, i) => {
          particles.slice(i + 1).forEach((otherParticle) => {
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 80) {
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.strokeStyle = `hsla(${(particle.hue + otherParticle.hue) / 2}, 70%, 50%, ${0.05 * (1 - distance / 80)})`;
              ctx.lineWidth = 0.3;
              ctx.stroke();
            }
          });
        });
      }

      time += 0.01;
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ background: "transparent" }}
    />
  );
}

// Cursor Trail Component
export function CursorTrail() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const trailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      setCursorVisible(true);
    };

    const handleMouseEnter = () => {
      setCursorVisible(true);
    };

    const handleMouseLeave = () => {
      setCursorVisible(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={trailRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ mixBlendMode: "difference" }}
    >
      <AnimatePresence>
        {cursorVisible && (
          <>
            {/* Main cursor */}
            <motion.div
              className="fixed w-6 h-6 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
              style={{
                left: mousePosition.x - 12,
                top: mousePosition.y - 12,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            {/* Cursor trail */}
            <motion.div
              className="fixed w-3 h-3 rounded-full bg-amber-400/20 backdrop-blur-sm"
              style={{
                left: mousePosition.x - 6,
                top: mousePosition.y - 6,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Skyrim Title Component
interface SkyrimTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function SkyrimTitle({ children, className = "" }: SkyrimTitleProps) {
  return (
    <motion.h1
      className={`text-3xl md:text-4xl font-bold text-center tracking-wider ${className}`}
      style={{
        fontFamily: "'Cinzel', 'Times New Roman', serif",
        background: "linear-gradient(135deg, #d4af37 0%, #f4e4c1 50%, #d4af37 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        textShadow: "0 0 20px rgba(212, 175, 55, 0.3)",
        letterSpacing: "0.1em",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {children}
    </motion.h1>
  );
}

// Skyrim Subtitle Component
interface SkyrimSubtitleProps {
  children: React.ReactNode;
  className?: string;
}

export function SkyrimSubtitle({ children, className = "" }: SkyrimSubtitleProps) {
  return (
    <motion.p
      className={`text-base md:text-lg text-center text-amber-100/70 max-w-3xl mx-auto ${className}`}
      style={{
        fontFamily: "'Cinzel', 'Times New Roman', serif",
        letterSpacing: "0.05em",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      {children}
    </motion.p>
  );
}

// Magic Card Skyrim Minimal Component
interface MagicCardSkyrimMinimalProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export function MagicCardSkyrimMinimal({ children, className = "", glow = false }: MagicCardSkyrimMinimalProps) {
  return (
    <motion.div
      className={`relative rounded-xl border border-amber-500/20 bg-black/40 backdrop-blur-sm p-5 ${className} ${glow ? 'shadow-lg shadow-amber-500/10' : ''}`}
      whileHover={{ 
        y: -4, 
        borderColor: "rgba(212, 175, 55, 0.4)",
        boxShadow: glow ? "0 20px 40px rgba(212, 175, 55, 0.2)" : "0 10px 30px rgba(0, 0, 0, 0.5)"
      }}
      transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/8 via-transparent to-amber-600/5 opacity-0 hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.1)_0%,transparent_70%)] opacity-0 hover:opacity-100 transition-opacity duration-700" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// Magic Button Skyrim Component
interface MagicButtonSkyrimProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "glow";
}

export function MagicButtonSkyrim({ 
  children, 
  onClick, 
  className = "", 
  disabled = false, 
  variant = "default" 
}: MagicButtonSkyrimProps) {
  const baseClasses = "relative px-5 py-2.5 rounded-lg font-medium text-sm overflow-hidden transition-all duration-300";
  const fontStyles = "font-serif tracking-wider";
  
  const variants = {
    default: {
      base: "bg-gradient-to-r from-amber-600/10 to-amber-700/10 border border-amber-500/20 text-amber-100 hover:from-amber-600/20 hover:to-amber-700/20 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/10",
      disabled: "opacity-50 cursor-not-allowed",
      hover: { scale: 1.02 },
      tap: { scale: 0.98 }
    },
    outline: {
      base: "border border-amber-500/30 text-amber-100 hover:bg-amber-500/10 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10",
      disabled: "opacity-50 cursor-not-allowed",
      hover: { scale: 1.02 },
      tap: { scale: 0.98 }
    },
    glow: {
      base: "bg-gradient-to-r from-amber-600/20 to-amber-700/20 border border-amber-500/40 text-amber-100 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30",
      disabled: "opacity-50 cursor-not-allowed shadow-amber-500/10",
      hover: { scale: 1.05, boxShadow: "0 0 30px rgba(212, 175, 55, 0.4)" },
      tap: { scale: 0.95 }
    }
  };

  const currentVariant = variants[variant];
  
  return (
    <motion.button
      className={`${baseClasses} ${currentVariant.base} ${disabled ? currentVariant.disabled : ""} ${className} ${fontStyles}`}
      style={{
        fontFamily: "'Cinzel', 'Times New Roman', serif",
        letterSpacing: "0.08em",
      }}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? currentVariant.hover : {}}
      whileTap={!disabled ? currentVariant.tap : {}}
    >
      <span className="relative z-10">{children}</span>
      {!disabled && variant !== "outline" && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-amber-500/15 to-amber-600/15 opacity-0"
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
      {!disabled && variant === "glow" && (
        <motion.div
          className="absolute inset-0 rounded-lg bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.3)_0%,transparent_70%)] opacity-0"
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        />
      )}
    </motion.button>
  );
}

// Magic Badge Skyrim Minimal Component
interface MagicBadgeSkyrimMinimalProps {
  children: React.ReactNode;
  className?: string;
}

export function MagicBadgeSkyrimMinimal({ children, className = "" }: MagicBadgeSkyrimMinimalProps) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 text-amber-100 ${className}`}
      style={{
        fontFamily: "'Cinzel', 'Times New Roman', serif",
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </span>
  );
}

// Magic Divider Component
export function MagicDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`relative my-8 ${className}`}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-amber-500/20" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-4 bg-black/60 text-amber-500/50" style={{ fontFamily: "'Cinzel', 'Times New Roman', serif" }}>
          VOITANS
        </span>
      </div>
    </div>
  );
}

// Glow Text Component
interface GlowTextProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export function GlowText({ children, color = "gold", className = "" }: GlowTextProps) {
  const colorClasses = {
    gold: "text-amber-400",
    cyan: "text-cyan-400",
    purple: "text-purple-400",
    pink: "text-pink-400",
  };

  return (
    <motion.span
      className={`font-bold ${colorClasses[color as keyof typeof colorClasses] || colorClasses.gold} ${className}`}
      style={{
        fontFamily: "'Cinzel', 'Times New Roman', serif",
        textShadow: `0 0 15px currentColor, 0 0 30px currentColor`,
        letterSpacing: "0.05em",
      }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.span>
  );
}

// Staggered List Component
interface StaggeredListProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}

export function StaggeredList({ children, className = "", stagger = 0.1 }: StaggeredListProps) {
  return (
    <div className={className}>
      {Array.isArray(children) ? (
        children.map((child, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * stagger }}
          >
            {child}
          </motion.div>
        ))
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0 }}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

// List Item Component
interface ListItemProps {
  children: React.ReactNode;
  className?: string;
}

export function ListItem({ children, className = "" }: ListItemProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ x: 5 }}
    >
      {children}
    </motion.div>
  );
}

// Magic Grid Component
interface MagicGridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
  className?: string;
}

export function MagicGrid({ children, columns = 3, gap = 6, className = "" }: MagicGridProps) {
  const getGridClass = () => {
    const colsClass = columns === 2 ? "grid-cols-2" : 
                     columns === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : 
                     columns === 4 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : 
                     "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    
    const gapClass = gap === 4 ? "gap-4" : 
                     gap === 6 ? "gap-6" : 
                     gap === 8 ? "gap-8" : 
                     "gap-6";
    
    return `${colsClass} ${gapClass}`;
  };
  
  return (
    <div className={`grid ${getGridClass()} ${className}`}>
      {children}
    </div>
  );
}
