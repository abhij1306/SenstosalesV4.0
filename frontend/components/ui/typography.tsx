"use client";

/**
 * Typography Component System
 * 
 * Standardized typography components to eliminate inconsistent
 * text colors, weights, and spacing across the application.
 * 
 * Usage:
 * - <Text /> - Body text
 * - <Text muted /> - Secondary text
 * - <Text subtle /> - Tertiary text
 * - <Label /> - Form labels
 * - <Heading /> - Section headings
 * - <Title /> - Page titles
 * - <Mono /> - Monospace numbers
 */

import React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// TEXT COMPONENT - Body text with semantic variants
// ============================================================================

export interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Text size variant */
  size?: "xs" | "sm" | "base" | "md";
  /** Text color variant - semantic naming */
  variant?: "default" | "muted" | "subtle" | "inverse";
  /** Font weight */
  weight?: "normal" | "medium" | "semibold";
  /** Monospace for numbers */
  mono?: boolean;
  /** Allow truncation */
  truncate?: boolean;
  /** Line clamp for multi-line truncation */
  lineClamp?: 1 | 2 | 3;
}

export const Text = React.memo(function Text({
  size = "base",
  variant = "default",
  weight = "normal",
  mono = false,
  truncate = false,
  lineClamp,
  className,
  children,
  ...props
}: TextProps) {
  return (
    <span
      className={cn(
        // Size - v3.0 typography system
        size === "xs" && "typo-body-sm",
        size === "sm" && "typo-body-md",
        size === "base" && "typo-body-md",
        size === "md" && "typo-body-lg",
        
        // Color - semantic mapping
        variant === "default" && "text-foreground",
        variant === "muted" && "text-muted",      // Secondary text
        variant === "subtle" && "text-subtle",    // Tertiary text
        variant === "inverse" && "text-inverse",
        
        // Weight - removed, handled by typography system
        
        // Font family - v3.0 mono system
        mono && "typo-mono-md",
        
        // Truncation
        truncate && "truncate",
        lineClamp === 1 && "line-clamp-1",
        lineClamp === 2 && "line-clamp-2",
        lineClamp === 3 && "line-clamp-3",
        
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
});

// ============================================================================
// LABEL COMPONENT - Form labels and captions
// ============================================================================

export interface LabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Label size */
  size?: "sm" | "xs" | "2xs";
  /** Whether this is a form field label */
  field?: boolean;
}

export const Label = React.memo(function Label({
  size = "xs",
  field = false,
  className,
  children,
  ...props
}: LabelProps) {
  return (
    <span
      className={cn(
        // Size - v3.0 typography system
        size === "2xs" && "typo-label-sm",
        size === "xs" && "typo-label-md",
        size === "sm" && "typo-body-md",
        
        // Style - all labels use muted color, typography handles weight
        "text-muted",
        
        // Field labels get uppercase treatment (tracking removed, handled by typo)
        field && "uppercase",
        
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
});

// ============================================================================
// HEADING COMPONENT - Section headings
// ============================================================================

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Heading level affects size */
  as?: "h1" | "h2" | "h3" | "h4";
}

export const Heading = React.memo(function Heading({
  as: Component = "h2",
  className,
  children,
  ...props
}: HeadingProps) {
  return (
    <Component
      className={cn(
        // Sizes based on heading level - v3.0 typography system
        Component === "h1" && "typo-heading-xl",
        Component === "h2" && "typo-heading-lg",
        Component === "h3" && "typo-heading-md",
        Component === "h4" && "typo-heading-sm",
        
        // All headings use foreground color
        "text-foreground",
        
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});

// ============================================================================
// TITLE COMPONENT - Page titles (H1 only)
// ============================================================================

export interface TitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Subtitle text */
  subtitle?: React.ReactNode;
}

export const Title = React.memo(function Title({
  subtitle,
  className,
  children,
  ...props
}: TitleProps) {
  return (
    <div className={className}>
      <h1 className="typo-heading-xl text-foreground/90">
        {children}
      </h1>
      {subtitle && (
        <p className="typo-body-md text-muted mt-1">{subtitle}</p>
      )}
    </div>
  );
});

// ============================================================================
// MONO COMPONENT - Monospace numbers and codes
// ============================================================================

export interface MonoProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Number formatting - aligns right for numbers */
  align?: "left" | "right";
  /** Size variant */
  size?: "xs" | "sm" | "base";
}

export const Mono = React.memo(function Mono({
  align = "left",
  size = "sm",
  className,
  children,
  ...props
}: MonoProps) {
  return (
    <span
      className={cn(
        // Font - v3.0 mono typography system
        "text-foreground",
        
        // Size
        size === "xs" && "typo-mono-sm",
        size === "sm" && "typo-mono-md",
        size === "base" && "typo-mono-lg",
        
        // Alignment
        align === "right" && "text-right",
        
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
});

// ============================================================================
// LINK TEXT COMPONENT
// ============================================================================

export interface LinkTextProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href: string;
  /** Whether to show underline */
  underline?: boolean;
  /** External link */
  external?: boolean;
}

export const LinkText = React.memo(function LinkText({
  href,
  underline = true,
  external = false,
  className,
  children,
  ...props
}: LinkTextProps) {
  return (
    <a
      href={href}
      className={cn(
        "text-primary hover:text-primary-hover transition-colors",
        underline && "hover:underline",
        className
      )}
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
      {...props}
    >
      {children}
    </a>
  );
});

// ============================================================================
// HELPER EXPORTS - Semantic shortcuts
// ============================================================================

/** Muted text - for secondary information */
export const Muted = React.memo(function Muted({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return <Text variant="muted" className={className}>{children}</Text>;
});

/** Subtle text - for tertiary/de-emphasized information */
export const Subtle = React.memo(function Subtle({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return <Text variant="subtle" className={className}>{children}</Text>;
});
