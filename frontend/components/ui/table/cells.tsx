"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { File01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/common";
import { fmtNum, fmtCurr, fmtDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

// Reference/ID cell with link
export const CellRef = React.memo(function CellRef({
  value,
  href,
  icon,
}: {
  value: string;
  href: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link href={href} className="group flex items-center gap-1.5">
      {icon || (
        <HugeiconsIcon
          icon={File01Icon}
          className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors"
        />
      )}
      <span className="typo-mono-md text-primary hover:text-primary-hover hover:underline transition-colors">
        {value}
      </span>
    </Link>
  );
});

// Number cell (tabular, right-aligned)
export const CellNum = React.memo(function CellNum({
  value,
  align = "right",
  color = "default",
  className,
}: {
  value: number | string | null | undefined;
  align?: "left" | "center" | "right";
  color?: "default" | "success" | "warning" | "error" | "muted" | "primary";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "typo-mono-md",
        color === "default" && "text-foreground",
        color === "success" && "text-success",
        color === "warning" && "text-warning",
        color === "error" && "text-error",
        color === "muted" && "text-muted-foreground",
        color === "primary" && "text-primary",
        align === "left" && "text-left",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
    >
      {fmtNum(Number(value) || 0)}
    </span>
  );
});

// Currency cell
export const CellCurr = React.memo(function CellCurr({
  value,
  align = "right",
  className,
}: {
  value: number;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "typo-mono-md text-foreground",
        align === "left" && "text-left",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
    >
      {fmtCurr(value)}
    </span>
  );
});

// Date cell
export const CellDate = React.memo(function CellDate({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span className={cn("typo-body-md text-foreground", className)}>{fmtDate(value)}</span>
  );
});

// Text cell with optional link and 2-line clamp
export const CellText = React.memo(function CellText({
  value,
  href,
  truncate = false,
  align = "left",
  className,
}: {
  value: string | null | undefined;
  href?: string;
  truncate?: boolean;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  const content = (
    <span
      className={cn(
        "typo-mono-md leading-relaxed",
        href ? "text-primary hover:text-primary-hover hover:underline" : "text-foreground/90",
        align === "left" && "text-left",
        align === "center" && "text-center",
        align === "right" && "text-right",
        truncate && "line-clamp-2",
        className
      )}
      title={value || ""}
    >
      {value || "—"}
    </span>
  );

  return href ? (
    <Link href={href} className="group transition-colors">
      {content}
    </Link>
  ) : (
    content
  );
});

// Unit cell
export const CellUnit = React.memo(function CellUnit({
  value,
  align = "center",
  className,
}: {
  value: string | null | undefined;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "typo-mono-md text-foreground/90",
        align === "left" && "text-left",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
    >
      {value || "NOS"}
    </span>
  );
});

// Material Identity (Description + Sub-details)
export const CellMaterial = React.memo(function CellMaterial({
  code,
  description,
  cat,
  drg,
  children,
}: {
  code?: string | null;
  description?: string | null;
  cat?: string | number | null;
  drg?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="flex items-baseline gap-2 flex-wrap">
        {code && (
          <span className="typo-mono-sm text-primary">{code}</span>
        )}
        <span
          className="typo-body-md text-foreground line-clamp-2 leading-relaxed"
          title={description || ""}
        >
          {description || "Description not found"}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
        {(cat || cat === 0) && (
          <span className="typo-label-sm text-muted-foreground">
            <span className="mr-1 opacity-70">CAT</span>
            <span className="text-foreground">{cat}</span>
          </span>
        )}
        {drg && (
          <span className="typo-label-sm text-muted-foreground">
            <span className="mr-1 opacity-70">DRG</span>
            <span className="text-foreground">{drg}</span>
          </span>
        )}
        {children}
      </div>
    </div>
  );
});

// Status badge cell
export const CellStatus = React.memo(function CellStatus({
  value,
  options,
}: {
  value: string;
  options?: Record<string, "success" | "warning" | "error" | "primary" | "secondary">;
}) {
  const color = options?.[value] || "primary";
  return (
    <Badge variant="soft" color={color} size="sm">
      {value}
    </Badge>
  );
});

// Percentage cell with color coding
export const CellPct = React.memo(function CellPct({
  value,
  thresholds = { good: 90, warning: 50 },
}: {
  value: number;
  thresholds?: { good: number; warning: number };
}) {
  const color =
    value >= thresholds.good ? "text-success" : value >= thresholds.warning ? "text-warning" : "text-error";
  return <span className={cn("typo-mono-md", color)}>{Math.round(value)}%</span>;
});

// Quantity with percentage indicator
export const CellQtyWithPct = React.memo(function CellQtyWithPct({
  value,
  total,
}: {
  value: number;
  total: number;
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="text-right">
      <span className="typo-mono-md text-foreground/90">{fmtNum(value)}</span>
      <span className="typo-mono-sm text-foreground/60 ml-1">({pct}%)</span>
    </div>
  );
});

// Material sub-badge (CAT, DRG)
export const CellBadge = React.memo(function CellBadge({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) return null;
  return (
    <span className={cn("typo-label-sm text-muted-foreground", className)}>
      <span className="mr-1 opacity-70">{label}</span>
      <span className="text-primary">{value}</span>
    </span>
  );
});
