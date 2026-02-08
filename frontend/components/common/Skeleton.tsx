"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  className?: string;
  animation?: "pulse" | "wave" | "none";
}

export const Skeleton = React.memo(({
  variant = "text",
  width,
  height,
  className,
  animation = "pulse",
}: SkeletonProps) => {
  const baseClasses = "bg-surface-sunken";
  
  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-shimmer",
    none: "",
  };
  
  const variantClasses = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-none",
    rounded: "rounded-md",
  };

  const styles: React.CSSProperties = {};
  if (width) styles.width = typeof width === "number" ? `${width}px` : width;
  if (height) styles.height = typeof height === "number" ? `${height}px` : height;

  return (
    <span
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        "block",
        className
      )}
      style={styles}
      aria-hidden="true"
    />
  );
});
Skeleton.displayName = "Skeleton";

// Pre-configured skeleton patterns for common use cases

export const SkeletonText = React.memo(({ 
  lines = 1,
  width = "100%",
  className 
}: { 
  lines?: number; 
  width?: string | number;
  className?: string;
}) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton 
        key={i} 
        variant="text" 
        width={typeof width === "string" && lines > 1 && i === lines - 1 ? "75%" : width} 
        height={16}
      />
    ))}
  </div>
));
SkeletonText.displayName = "SkeletonText";

export const SkeletonAvatar = React.memo(({ 
  size = 40,
  className 
}: { 
  size?: number;
  className?: string;
}) => (
  <Skeleton 
    variant="circular" 
    width={size} 
    height={size} 
    className={className}
  />
));
SkeletonAvatar.displayName = "SkeletonAvatar";

export const SkeletonCard = React.memo(({ 
  header = true,
  lines = 3,
  className 
}: { 
  header?: boolean;
  lines?: number;
  className?: string;
}) => (
  <div className={cn("bg-surface border border-border rounded-lg p-4 space-y-4", className)}>
    {header && (
      <div className="flex items-center gap-3">
        <SkeletonAvatar size={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width={120} height={16} />
          <Skeleton variant="text" width={80} height={12} />
        </div>
      </div>
    )}
    <SkeletonText lines={lines} />
  </div>
));
SkeletonCard.displayName = "SkeletonCard";

export const SkeletonTable = React.memo(({ 
  rows = 5,
  columns = 4,
  className 
}: { 
  rows?: number;
  columns?: number;
  className?: string;
}) => (
  <div className={cn("bg-surface border border-border rounded-lg overflow-hidden", className)}>
    {/* Header */}
    <div className="px-3 py-2 border-b border-border bg-surface-sunken/30">
      <div className="flex gap-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" width={`${80 + (i % 2) * 40}px`} height={14} />
        ))}
      </div>
    </div>
    {/* Rows */}
    <div className="divide-y divide-border/40">
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="px-3 py-2 flex gap-3 items-center">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton 
              key={colIdx} 
              variant="text" 
              width={`${60 + (colIdx % 3) * 30}px`} 
              height={14}
            />
          ))}
        </div>
      ))}
    </div>
  </div>
));
SkeletonTable.displayName = "SkeletonTable";

export const SkeletonStatCard = React.memo(({ 
  className 
}: { 
  className?: string;
}) => (
  <div className={cn("bg-surface border border-border rounded-lg p-3", className)}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Skeleton variant="rounded" width={32} height={32} />
        <Skeleton variant="text" width={80} height={12} />
      </div>
    </div>
    <div className="mt-2">
      <Skeleton variant="text" width={100} height={28} />
    </div>
  </div>
));
SkeletonStatCard.displayName = "SkeletonStatCard";
