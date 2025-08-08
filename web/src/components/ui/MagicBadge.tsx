"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        skyrim: "border-2 border-skyrim-gold bg-gradient-to-r from-skyrim-dark to-skyrim-stone text-skyrim-snow hover:from-skyrim-purple hover:to-skyrim-dark hover:border-skyrim-snow hover:shadow-lg hover:shadow-skyrim-gold/25 transition-all duration-300",
        "skyrim-minimal": "border-amber-900/30 bg-amber-950/5 text-amber-200 hover:bg-amber-950/10 hover:border-amber-700/50 transition-all duration-300"
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function MagicBadge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { MagicBadge, badgeVariants };

// Status badge component
export const MagicStatusBadge = ({ status, className }: { status: string; className?: string }) => {
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'idle':
return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'dnd':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'offline':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
      getStatusVariant(status),
      className
    )}>
      <span className={`w-2 h-2 rounded-full mr-1.5 ${
        status.toLowerCase() === 'online' ? 'bg-green-400' :
status.toLowerCase() === 'idle' ? 'bg-purple-400' :
        status.toLowerCase() === 'dnd' ? 'bg-red-400' : 'bg-gray-400'
      }`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </div>
  );
};

// Role badge component
export const MagicRoleBadge = ({ role, color, className }: { role: string; color?: string; className?: string }) => {
  return (
    <div 
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        "bg-black/20 text-snow border-gold/30",
        className
      )}
      style={color ? { borderColor: color, background: `linear-gradient(135deg, ${color}20, ${color}10)` } : undefined}
    >
      <span className="w-2 h-2 rounded-full mr-1.5 bg-gold/60" />
      {role}
    </div>
  );
};
