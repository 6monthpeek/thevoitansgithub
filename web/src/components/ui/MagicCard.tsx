"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
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
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

const MagicCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "glowing" | "skyrim-minimal"; glowColor?: string }
>(({ className, variant = "default", glowColor, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border bg-background p-6 relative overflow-hidden",
        variant === "glowing" && "shadow-lg hover:shadow-xl transition-shadow duration-300",
        variant === "skyrim-minimal" && "border-amber-900/30 bg-amber-950/5 hover:bg-amber-950/10 transition-all duration-300",
        className
      )}
      style={
        variant === "glowing"
          ? {
              boxShadow: `0 0 20px ${glowColor || "rgba(139, 71, 137, 0.3)"}`,
            }
          : variant === "skyrim-minimal"
          ? {
              boxShadow: "inset 0 0 0 1px rgba(245, 158, 11, 0.1), 0 4px 20px -2px rgba(0, 0, 0, 0.5)",
            }
          : undefined
      }
      {...props}
    />
  );
});
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

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  MagicCard,
  MagicCardHeader,
  MagicCardFooter,
  MagicCardContent,
};
