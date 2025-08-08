"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

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
        skyrim: "bg-gradient-to-r from-amber-900 to-amber-800 border-2 border-amber-600 text-amber-100 hover:from-amber-800 hover:to-amber-700 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300 transform hover:-translate-y-0.5",
        "skyrim-minimal": "border-amber-900/30 bg-amber-950/5 text-amber-200 hover:bg-amber-950/10 hover:border-amber-700/50 transition-all duration-300",
        pink: "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600",
        red: "bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600",
        violet: "bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        skyrim: "h-12 px-6 py-3 text-lg font-bold uppercase tracking-wider border-2 border-amber-600 bg-gradient-to-r from-amber-900 to-amber-800 text-amber-100 hover:from-amber-800 hover:to-amber-700 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300 transform hover:-translate-y-0.5",
        "skyrim-minimal": "h-11 px-5 py-2.5 text-base font-semibold"
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

const MagicButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
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
MagicButton.displayName = "MagicButton";

export { MagicButton, buttonVariants };
