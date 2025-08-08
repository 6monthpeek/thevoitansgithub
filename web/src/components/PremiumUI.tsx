"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

// Premium Card Component
interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "glass" | "gradient" | "premium";
  glow?: boolean;
  hover?: boolean;
}

export function PremiumCard({ 
  children, 
  className = "", 
  variant = "default", 
  glow = false,
  hover = true 
}: PremiumCardProps) {
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
      whileHover={hover ? { 
        scale: 1.02,
        boxShadow: glow ? "0 0 40px rgba(147,112,219,0.4)" : "0 8px 32px rgba(0,0,0,0.3)"
      } : {}}
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
  children: ReactNode;
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

// Premium Badge Component
interface PremiumBadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
  className?: string;
}

export function PremiumBadge({ children, variant = "default", className = "" }: PremiumBadgeProps) {
  const variantClasses = {
    default: "bg-gradient-to-r from-[#0B0410] to-[#110513] border border-[#140617]/50",
    success: "bg-gradient-to-r from-[#0F0311] to-[#140617] border border-[#120614]/50",
    warning: "bg-gradient-to-r from-[#090510] to-[#0E0210] border border-[#100412]/50",
    error: "bg-gradient-to-r from-[#09020E] to-[#0C0310] border border-[#110513]/50",
    info: "bg-gradient-to-r from-[#0B0410] to-[#120614] border border-[#140617]/50"
  };

  return (
    <motion.span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${variantClasses[variant]} ${className}`}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.span>
  );
}

// Premium Divider Component
interface PremiumDividerProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export function PremiumDivider({ className = "", orientation = "horizontal" }: PremiumDividerProps) {
  const orientationClasses = orientation === "vertical" ? "h-full w-px" : "w-full h-px";
  
  return (
    <div className={`${orientationClasses} bg-gradient-to-r from-[#09020E] via-[#110513] to-[#140617] ${className}`} />
  );
}

// Premium Loading Spinner
interface PremiumSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PremiumSpinner({ size = "md", className = "" }: PremiumSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} border-2 border-[#110513] border-t-[#140617] rounded-full ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
}
