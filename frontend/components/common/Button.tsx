"use client";

import React, { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";


/* ==========================================================================
   BUTTON COMPONENT - Aether Design System
   
   Standard Variants:
   - primary: Main action, high emphasis
   - secondary: Alternative action, medium emphasis
   - outline: Low emphasis action
   - ghost: Minimal emphasis, subtle
   - destructive: Dangerous actions
   
   Sizes:
   - sm, md, lg: Standard sizes
   ========================================================================== */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 
    | "primary" 
    | "secondary" 
    | "outline" 
    | "ghost" 
    | "destructive";
  size?: "sm" | "md" | "lg" | "compact";
  asChild?: boolean;
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// Standard variant styles using design tokens
const variantStyles = {
  // Standard variants
  primary: [
    "bg-primary text-white !text-white",
    "hover:bg-primary-hover",
    "active:bg-primary-active",
    "shadow-md shadow-primary-muted",
    "hover:shadow-lg hover:shadow-primary-muted",
  ],
  secondary: [
    "bg-secondary text-secondary-foreground",
    "hover:bg-secondary-hover",
    "shadow-md shadow-secondary-muted",
  ],
  outline: [
    "bg-transparent border-2 border-border text-foreground",
    "hover:bg-surface-sunken hover:border-border-strong",
  ],
  ghost: [
    "bg-transparent text-secondary",
    "hover:bg-surface-sunken hover:text-foreground",
  ],
  destructive: [
    "bg-error text-white !text-white",
    "hover:opacity-90",
    "shadow-md shadow-error-muted",
  ],
};

// Size styles using design tokens (typo classes removed to prevent color override)
const sizeStyles = {
  sm: "h-8 px-3 text-sm rounded-md gap-1.5",
  md: "h-10 px-4 text-base rounded-lg gap-2",
  lg: "h-12 px-6 text-lg rounded-xl gap-2.5",
  compact: "h-7 px-2.5 text-sm rounded-md gap-1.5",
};

// Loading spinner component
const LoadingSpinner = () => (
  <span className="flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  </span>
);

export const Button = React.memo(
  forwardRef<HTMLButtonElement, ButtonProps>(
    (
      {
        variant = "primary",
        size = "md",
        className,
        asChild = false,
        loading = false,
        disabled,
        children,
        ...props
      },
      ref
    ) => {
      const isDisabled = disabled || loading;

      const buttonContent = (
        <>
          {loading && <LoadingSpinner />}
          <span className="relative z-10 flex items-center gap-2">
            {children}
          </span>
        </>
      );

      const baseClasses = cn(
        // Layout
        "inline-flex items-center justify-center",
        "whitespace-nowrap",
        
        // States
        "transition-all duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none",
        
        // Interactive (CSS-only, replaces Framer Motion)
        "hover:scale-[1.02] active:scale-[0.98]",
        "hover:-translate-y-0.5 active:translate-y-0",
        
        // Variants & Sizes
        variantStyles[variant],
        sizeStyles[size],
        className
      );

      if (asChild) {
        return (
          <Slot
            ref={ref}
            className={baseClasses}
            {...props}
          >
            {children}
          </Slot>
        );
      }

      return (
        <button
          ref={ref}
          className={baseClasses}
          disabled={isDisabled}
          {...(props as any)}
        >
          {buttonContent}
        </button>
      );
    }
  )
);

Button.displayName = "Button";

// Convenience exports for common button patterns
export const ButtonPrimary = (props: Omit<ButtonProps, "variant">) => (
  <Button variant="primary" {...props} />
);

export const ButtonSecondary = (props: Omit<ButtonProps, "variant">) => (
  <Button variant="secondary" {...props} />
);

export const ButtonOutline = (props: Omit<ButtonProps, "variant">) => (
  <Button variant="outline" {...props} />
);

export const ButtonGhost = (props: Omit<ButtonProps, "variant">) => (
  <Button variant="ghost" {...props} />
);

export const ButtonDestructive = (props: Omit<ButtonProps, "variant">) => (
  <Button variant="destructive" {...props} />
);
