"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

/* ==========================================================================
   BADGE COMPONENT - Aether Design System
   
   Standard Variants:
   - default: Subtle background with border
   - solid: Strong background with contrast text
   - outline: Bordered, transparent background
   - soft: Lighter background, no border
   
   Legacy Variants:
   - primary, secondary, success, warning, error, info, neutral
   
   Standard Colors:
   - primary, secondary, success, warning, error, info, neutral
   
   Sizes:
   - sm, md, lg
   ========================================================================== */

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
  | "default"
  | "solid"
  | "outline"
  | "soft"
  // Legacy variant names mapped
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral";
  color?: "primary" | "secondary" | "success" | "warning" | "error" | "info" | "neutral";
  size?: "sm" | "md" | "lg";
}

// Standard variant + color combinations
const variantColorStyles = {
  default: {
    primary: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary/10 text-secondary border-secondary/20",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    error: "bg-error/10 text-error border-error/20",
    info: "bg-info/10 text-info border-info/20",
    neutral: "bg-surface-sunken text-secondary border-border",
  },
  solid: {
    primary: "bg-primary text-white border-primary",
    secondary: "bg-secondary text-white border-secondary",
    success: "bg-success text-white border-success",
    warning: "bg-warning text-warning-contrast border-warning",
    error: "bg-error text-white border-error",
    info: "bg-info text-white border-info",
    neutral: "bg-text-primary text-white border-text-primary",
  },
  outline: {
    primary: "bg-transparent text-primary border-primary",
    secondary: "bg-transparent text-secondary border-secondary",
    success: "bg-transparent text-success border-success",
    warning: "bg-transparent text-warning border-warning",
    error: "bg-transparent text-error border-error",
    info: "bg-transparent text-info border-info",
    neutral: "bg-transparent text-muted border-border-strong",
  },
  soft: {
    primary: "bg-primary/5 text-primary border-transparent",
    secondary: "bg-secondary/5 text-secondary border-transparent",
    success: "bg-success/5 text-success border-transparent",
    warning: "bg-warning/5 text-warning border-transparent",
    error: "bg-error/5 text-error border-transparent",
    info: "bg-info/5 text-info border-transparent",
    neutral: "bg-surface-sunken text-muted border-transparent",
  },
};

const sizeStyles = {
  sm: "px-1.5 py-0.5 typo-label-md gap-1 uppercase",
  md: "px-2 py-0.5 typo-label-md gap-1.5 uppercase",
  lg: "px-2.5 py-1 typo-body-md gap-1.5",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = "default",
      color = "neutral",
      size = "md",
      children,
      ...props
    },
    ref
  ) => {
    // Map legacy variant names that are actually colors
    const isColorVariant = ["primary", "secondary", "success", "warning", "error", "info", "neutral"].includes(variant);
    const effectiveVariant: "default" | "solid" | "outline" | "soft" = isColorVariant
      ? "default"
      : (variant as "default" | "solid" | "outline" | "soft");
    const effectiveColor = isColorVariant
      ? (variant as Exclude<BadgeProps["color"], undefined>)
      : (color ?? "neutral");

    return (
      <span
        ref={ref}
        className={cn(
          // Layout
          "inline-flex items-center justify-center",
          "whitespace-nowrap",

          // Appearance
          "rounded-full border",

          // Variants
          variantColorStyles[effectiveVariant][effectiveColor!],
          sizeStyles[size],

          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

// Status Badge - Pre-configured for status indicators
interface StatusBadgeProps extends Omit<BadgeProps, "color" | "variant"> {
  status: "success" | "warning" | "error" | "info" | "neutral" | "pending";
  dot?: boolean;
}

const statusConfig = {
  success: { color: "success" as const, label: "Active" },
  warning: { color: "warning" as const, label: "Pending" },
  error: { color: "error" as const, label: "Error" },
  info: { color: "info" as const, label: "Info" },
  neutral: { color: "neutral" as const, label: "Inactive" },
  pending: { color: "warning" as const, label: "Pending" },
};

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, dot = true, children, ...props }, ref) => {
    // Fallback to neutral if status is not recognized
    const config = statusConfig[status] || { color: "neutral" as const, label: String(status || "Unknown") };

    return (
      <Badge
        ref={ref}
        variant="default"
        color={config.color}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              status === "success" && "bg-success",
              status === "warning" && "bg-warning",
              status === "error" && "bg-error",
              status === "info" && "bg-info",
              status === "neutral" && "bg-text-tertiary",
              status === "pending" && "bg-warning animate-pulse",
              !statusConfig[status] && "bg-text-tertiary",
            )}
          />
        )}
        {children || config.label}
      </Badge>
    );
  }
);

StatusBadge.displayName = "StatusBadge";
