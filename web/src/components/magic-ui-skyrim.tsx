"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, createContext, useContext } from "react";

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

// Cursor Trail kaldırıldı; sade kullanım için no-op döndürüyoruz
export function CursorTrail() { return null; }

// Skyrim Title Component
interface SkyrimTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function SkyrimTitle({ children, className = "" }: SkyrimTitleProps) {
  return (
    <motion.h1
      className={`text-3xl md:text-4xl font-extrabold text-center tracking-tight text-white ${className}`}
      style={{
        fontFamily: "'Cinzel', 'Times New Roman', serif",
        letterSpacing: "0.02em",
        textShadow: "0 0 20px rgba(147, 112, 219, 0.15)",
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
      className={`text-base md:text-lg text-center text-purple-100/80 max-w-3xl mx-auto ${className}`}
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
      className={`relative rounded-xl border border-purple-500/25 bg-black/40 backdrop-blur-sm p-5 ${className} ${glow ? 'shadow-lg shadow-purple-500/10' : ''}`}
      whileHover={{ 
        y: -4, 
        borderColor: "rgba(147, 112, 219, 0.45)",
        boxShadow: glow ? "0 20px 40px rgba(147, 112, 219, 0.22)" : "0 10px 30px rgba(0, 0, 0, 0.5)"
      }}
      transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/10 via-transparent to-purple-600/10 opacity-0 hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,rgba(147,112,219,0.12)_0%,transparent_70%)] opacity-0 hover:opacity-100 transition-opacity duration-700" />
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
      base: "bg-gradient-to-r from-purple-600/10 to-purple-700/10 border border-purple-500/25 text-purple-100 hover:from-purple-600/20 hover:to-purple-700/20 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10",
      disabled: "opacity-50 cursor-not-allowed",
      hover: { scale: 1.02 },
      tap: { scale: 0.98 }
    },
    outline: {
      base: "border border-purple-500/35 text-purple-100 hover:bg-purple-500/10 hover:border-purple-500/55 hover:shadow-lg hover:shadow-purple-500/10",
      disabled: "opacity-50 cursor-not-allowed",
      hover: { scale: 1.02 },
      tap: { scale: 0.98 }
    },
    glow: {
      base: "bg-gradient-to-r from-purple-600/20 to-purple-700/20 border border-purple-500/45 text-purple-100 shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30",
      disabled: "opacity-50 cursor-not-allowed shadow-purple-500/10",
      hover: { scale: 1.05, boxShadow: "0 0 30px rgba(147, 112, 219, 0.4)" },
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
          className="absolute inset-0 bg-gradient-to-r from-purple-500/15 to-purple-600/15 opacity-0"
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
      {!disabled && variant === "glow" && (
        <motion.div
          className="absolute inset-0 rounded-lg bg-[radial-gradient(ellipse_at_center,rgba(147,112,219,0.3)_0%,transparent_70%)] opacity-0"
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

export function GlowText({ children, color = "purple", className = "" }: GlowTextProps) {
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
        textShadow: `0 0 8px currentColor, 0 0 15px currentColor`,
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

// Premium Card Component with new color palette
interface PremiumCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "gradient" | "premium";
  glow?: boolean;
}

export function PremiumCard({ children, className = "", variant = "default", glow = false }: PremiumCardProps) {
  const variantClasses = {
    default: "bg-gradient-to-br from-[#09020E] to-[#0B0410] border border-[#110513]/30",
    glass: "bg-[#09020E]/20 backdrop-blur-xl border border-[#110513]/40",
    gradient: "bg-gradient-to-br from-[#09020E] via-[#0F0311] to-[#140617] border border-[#120614]/50",
    premium: "bg-gradient-to-br from-[#09020E] via-[#0B0410] to-[#110513] border border-[#140617]/60 shadow-2xl"
  };

  const glowClasses = glow ? "shadow-[0_0_30px_rgba(147,112,219,0.3)]" : "";

  return (
    <motion.div
      className={`relative overflow-hidden rounded-xl p-6 ${variantClasses[variant]} ${glowClasses} ${className}`}
      whileHover={{ 
        scale: 1.02,
        boxShadow: glow ? "0 0 40px rgba(147,112,219,0.4)" : "0 8px 32px rgba(0,0,0,0.3)"
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {glow && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#140617]/20 to-[#120614]/20 rounded-xl blur-xl"></div>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

// Premium Button Component
interface PremiumButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: "default" | "gradient" | "glass" | "premium";
  size?: "sm" | "md" | "lg";
}

export function PremiumButton({ 
  children, 
  onClick, 
  className = "", 
  disabled = false, 
  variant = "default",
  size = "md"
}: PremiumButtonProps) {
  const variantClasses = {
    default: "bg-gradient-to-r from-[#0B0410] to-[#110513] border border-[#140617]/50 hover:border-[#140617]/80",
    gradient: "bg-gradient-to-r from-[#09020E] via-[#0F0311] to-[#140617] border border-[#120614]/60",
    glass: "bg-[#09020E]/30 backdrop-blur-lg border border-[#110513]/40 hover:bg-[#09020E]/50",
    premium: "bg-gradient-to-r from-[#09020E] via-[#0B0410] to-[#110513] border border-[#140617]/70 shadow-lg"
  };

  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative overflow-hidden rounded-lg font-semibold transition-all duration-300
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95"}
      `}
      whileHover={!disabled ? { 
        boxShadow: "0 8px 25px rgba(147,112,219,0.3)",
        y: -2
      } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      <div className="relative z-10">{children}</div>
      {variant === "premium" && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#140617]/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
      )}
    </motion.button>
  );
}

// Animated Gradient Background Component
interface AnimatedGradientProps {
  className?: string;
  colors?: string[];
  duration?: number;
}

export function AnimatedGradient({ 
  className = "", 
  colors = ["#09020E", "#0B0410", "#110513", "#140617", "#120614"],
  duration = 10 
}: AnimatedGradientProps) {
  return (
    <div 
      className={`absolute inset-0 ${className}`}
      style={{
        background: `linear-gradient(-45deg, ${colors.join(", ")})`,
        backgroundSize: `${colors.length * 100}% ${colors.length * 100}%`,
        animation: `gradientShift ${duration}s ease infinite`
      }}
    />
  );
}

// Color Theme System
interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
}

const themes: Record<string, ThemeColors> = {
  default: {
    primary: "#9370DB",
    secondary: "#6A5ACD",
    accent: "#8b0000",
    background: "#0A0B0D",
    surface: "#1a1a1a",
    text: "#f0f8ff"
  },
  premium: {
    primary: "#140617",
    secondary: "#110513",
    accent: "#0F0311",
    background: "#09020E",
    surface: "#0B0410",
    text: "#f0f8ff"
  },
  dark: {
    primary: "#2d1b69",
    secondary: "#1a103f",
    accent: "#4a148c",
    background: "#0a0a0a",
    surface: "#1a1a1a",
    text: "#ffffff"
  }
};

// Theme Context and Hook

interface ThemeContextType {
  theme: string;
  colors: ThemeColors;
  setTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState("default");

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "default";
    setTheme(savedTheme);
  }, []);

  const colors = themes[theme] || themes.default;

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Theme Switcher Component
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <motion.div className="flex gap-2 p-2 bg-[#09020E]/50 backdrop-blur-lg rounded-lg border border-[#110513]/30">
      {Object.keys(themes).map((themeName) => (
        <motion.button
          key={themeName}
          onClick={() => setTheme(themeName)}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
            theme === themeName
              ? "bg-[#140617] text-white shadow-lg"
              : "bg-[#0B0410]/50 text-gray-300 hover:bg-[#110513]/50"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
        </motion.button>
      ))}
    </motion.div>
  );
}
