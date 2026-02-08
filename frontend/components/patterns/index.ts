"use client";

// Page patterns
export { PageHeader } from "./page-header";
export { StatCard, StatCardRow } from "./stat-card";
export { SectionCard } from "./section-card";
export { Toolbar } from "./toolbar";
export { ButtonGroup } from "./button-group";
export { ListView, useListView } from "./ListView";

// Re-export formatters for backward compatibility during migration
export { fmtNum, fmtCurr, fmtDate } from "@/lib/formatters";

// Layout utilities (temporary - migrate to Tailwind classes)
export const Layout = {
  row: "flex items-center",
  rowBetween: "flex items-center justify-between",
  rowGap: "flex items-center gap-2",
  col: "flex flex-col",
  colGap: "flex flex-col gap-2",
  grid4: "grid grid-cols-2 lg:grid-cols-4 gap-3",
  grid3: "grid grid-cols-1 lg:grid-cols-3 gap-4",
  grid12: "grid grid-cols-1 lg:grid-cols-12 gap-4",
} as const;

// Typography utilities - Standard design system tokens
export const Typography = {
  label: "typo-label-md",
  value: "typo-body-md",
  valueLarge: "typo-headline-sm text-primary",
  caption: "typo-body-sm",
  mono: "typo-body-md font-mono",
} as const;

// Size tokens - Standard dimensions
export const Size = {
  compact: "h-size-compact w-size-compact",
  sm: "h-size-sm w-size-sm",
  md: "h-size-md w-size-md",
  lg: "h-size-lg w-size-lg",
} as const;

// Form input widths
export const Input = {
  xs: "w-input-xs",
  sm: "w-input-sm",
  md: "w-input-md",
  lg: "w-input-lg",
} as const;
