"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

// MagicButton bileşeni - minimalist ve Skyrim havası
const MagicButtonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30",
skyrim: "bg-gradient-to-r from-purple-900 to-purple-800 border-2 border-purple-600 text-purple-100 hover:from-purple-800 hover:to-purple-700 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:-translate-y-0.5",
"skyrim-minimal": "border-purple-900/30 bg-purple-950/5 text-purple-200 hover:bg-purple-950/10 hover:border-purple-700/50 transition-all duration-300",
        minimal: "bg-black/20 text-white border border-white/10 hover:bg-white/10 hover:border-white/20",
        violet: "bg-gradient-to-r from-purple-900/30 to-violet-900/30 text-purple-100 border border-purple-700/50 hover:from-purple-800/50 hover:to-violet-800/50 hover:border-purple-600 hover:shadow-lg hover:shadow-purple-500/20",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-4 py-2 text-sm",
        lg: "h-14 px-8 py-4 text-base",
        icon: "h-10 w-10 p-0",
        skyrim: "h-14 px-8 py-4 text-base font-bold uppercase tracking-wider",
        "skyrim-minimal": "h-11 px-5 py-2.5 text-base font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface MagicButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof MagicButtonVariants> {
  asChild?: boolean;
  size?: "default" | "sm" | "lg" | "icon" | "skyrim";
}

const MagicButton = React.forwardRef<HTMLButtonElement, MagicButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(MagicButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {variant === "skyrim" && (
          <>
            <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
            <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent to-amber-500/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />
          </>
        )}
        {variant === "violet" && (
          <>
            <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
            <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent to-violet-500/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />
          </>
        )}
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </Comp>
    );
  }
);
MagicButton.displayName = "MagicButton";

// MagicCard bileşeni - minimalist ve Skyrim havası
const MagicCardVariants = cva(
  "relative overflow-hidden rounded-lg border border-white/10 bg-black/20 backdrop-blur-sm transition-all duration-300 hover:border-white/20",
  {
    variants: {
      variant: {
        default: "",
        glowing: "shadow-[0_0_20px_rgba(255,255,255,0.1)]",
skyrim: "border-purple-900/30 bg-gradient-to-br from-purple-950/20 to-purple-900/10 hover:border-purple-700/50 hover:shadow-[0_0_30px_rgba(147,112,219,0.15)]",
        minimal: "border-white/5 bg-black/10 hover:border-white/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface MagicCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof MagicCardVariants> {
  glowColor?: string;
  variant?: "default" | "glowing" | "skyrim" | "minimal";
}

const MagicCard = React.forwardRef<HTMLDivElement, MagicCardProps>(
  ({ className, variant, glowColor, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(MagicCardVariants({ variant }), className)}
      style={glowColor ? { boxShadow: `0 0 20px ${glowColor}` } : undefined}
      {...props}
    >
      {variant === "skyrim" && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      )}
      {children}
    </div>
  )
);
MagicCard.displayName = "MagicCard";

const MagicCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
MagicCardHeader.displayName = "MagicCardHeader";

const MagicCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
MagicCardTitle.displayName = "MagicCardTitle";

const MagicCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
MagicCardDescription.displayName = "MagicCardDescription";

const MagicCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
MagicCardContent.displayName = "MagicCardContent";

const MagicCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
MagicCardFooter.displayName = "MagicCardFooter";

// MagicBadge bileşeni
const MagicBadgeVariants = cva(
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
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface MagicBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof MagicBadgeVariants> {}

const MagicBadge = React.forwardRef<HTMLDivElement, MagicBadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(MagicBadgeVariants({ variant }), className)}
      {...props}
    />
  )
);
MagicBadge.displayName = "MagicBadge";

// NeonButton bileşeni
export const NeonButton = ({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      className={`
        relative px-6 py-3 font-medium text-white transition-all duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-purple-600 before:to-pink-600 before:transition-all before:duration-300 hover:before:scale-105 active:scale-95 ${className}
      `}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
};

// PaginationCapsule bileşeni
export const PaginationCapsule = ({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={`
        inline-flex items-center gap-1 rounded-full bg-black/20 px-4 py-2 backdrop-blur-sm ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

// Parallax bileşeni
export const Parallax = ({ children, speed = 0.5 }: { children: React.ReactNode; speed?: number }) => {
  return (
    <div className="relative overflow-hidden">
      {children}
    </div>
  );
};

export const ParallaxLayer = ({ children, speed, offset }: { children: React.ReactNode; speed: number; offset: number }) => {
  return (
    <div
      className="absolute inset-0"
      style={{
        transform: `translateY(${offset * speed}px)`,
      }}
    >
      {children}
    </div>
  );
};

// LiquidLoader bileşeni
export const LiquidLoader = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}>
      <div className="absolute inset-y-0 left-0 h-full w-1/3 bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse"></div>
    </div>
  );
};

export { MagicCard, MagicCardHeader, MagicCardTitle, MagicCardDescription, MagicCardContent, MagicCardFooter };
export { MagicBadge, MagicBadgeVariants };
export { MagicButton, MagicButtonVariants };
