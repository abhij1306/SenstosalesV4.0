"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

/* ==========================================================================
   CARD COMPONENT - Aether Design System
   
   Standard Variants:
   - default: Standard card with border
   - elevated: Card with shadow for emphasis
   - glass: Translucent glassmorphism effect
   - flat: No border, subtle background
   - outlined: Transparent with border
   
   Padding Sizes:
   - none, sm, md, lg, xl
   ========================================================================== */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 
    | "default" 
    | "elevated" 
    | "glass" 
    | "flat" 
    | "outlined";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  asChild?: boolean;
}

const variantStyles = {
  // Standard variants
  default: [
    "bg-surface",
    "border border-border",
    "rounded-xl",
    "shadow-sm",
  ],
  elevated: [
    "bg-surface",
    "border border-border",
    "rounded-xl",
    "shadow-md",
    "hover:shadow-lg",
    "transition-shadow duration-200",
  ],
  glass: [
    "glass",
    "rounded-xl",
  ],
  flat: [
    "bg-surface-sunken",
    "rounded-xl",
  ],
  outlined: [
    "bg-transparent",
    "border-2 border-border",
    "rounded-xl",
  ],
};

const paddingStyles = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
  xl: "p-8",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "default",
      padding = "md",
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "div";

    return (
      <Comp
        ref={ref}
        className={cn(
          variantStyles[variant],
          paddingStyles[padding],
          "transition-all duration-200",
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

Card.displayName = "Card";

// Card Header
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref}
        className={cn("flex flex-col gap-1.5 pb-4", className)}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

CardHeader.displayName = "CardHeader";

// Card Title
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  asChild?: boolean;
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "h3";
    return (
      <Comp
        ref={ref}
        className={cn(
          "typo-title-lg text-foreground",
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

CardTitle.displayName = "CardTitle";

// Card Description
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  asChild?: boolean;
}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "p";
    return (
      <Comp
        ref={ref}
        className={cn("typo-body-md text-secondary", className)}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

CardDescription.displayName = "CardDescription";

// Card Content
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return (
      <Comp ref={ref} className={className} {...props}>
        {children}
      </Comp>
    );
  }
);

CardContent.displayName = "CardContent";

// Card Footer
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref}
        className={cn("flex items-center gap-3 pt-4 mt-auto", className)}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

CardFooter.displayName = "CardFooter";
