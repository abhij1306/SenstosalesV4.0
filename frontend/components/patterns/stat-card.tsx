"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type StatColor = "primary" | "success" | "warning" | "error" | "secondary";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: string; direction: "up" | "down" | "neutral" };
  color?: StatColor;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
}

const colorMap: Record<StatColor, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  secondary: "bg-secondary/10 text-secondary",
};

const activeClasses: Record<StatColor, string> = {
  primary: "ring-2 ring-primary/30 border-primary bg-primary/5",
  success: "ring-2 ring-success/30 border-success bg-success/5",
  warning: "ring-2 ring-warning/30 border-warning bg-warning/5",
  error: "ring-2 ring-error/30 border-error bg-error/5",
  secondary: "ring-2 ring-secondary/30 border-secondary bg-secondary/5",
};

export const StatCard = React.memo(function StatCard({
  title,
  value,
  icon,
  trend,
  color = "primary",
  href,
  onClick,
  isActive = false,
}: StatCardProps) {
  const clickable = !!onClick || !!href;
  const isInteractiveDiv = !!onClick && !href;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isInteractiveDiv && onClick) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }
  };

  const content = (
    <div
      onClick={onClick}
      onKeyDown={isInteractiveDiv ? handleKeyDown : undefined}
      role={isInteractiveDiv ? "button" : undefined}
      tabIndex={isInteractiveDiv ? 0 : undefined}
      className={cn(
        "bg-surface border border-border rounded-lg p-3 transition-colors",
        clickable && "cursor-pointer",
        !isActive && clickable && "hover:border-primary hover:bg-surface-sunken",
        !isActive && !clickable && "hover:border-border-strong",
        isActive && activeClasses[color]
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`p-1.5 rounded-md ${colorMap[color]} w-8 h-8 flex items-center justify-center shrink-0`}>{icon}</div>
          <span className="typo-label-md">
            {title}
          </span>
        </div>
        {trend && (
          <span
            className={cn(
              "typo-label-md",
              trend.direction === "up" && "text-success",
              trend.direction === "down" && "text-error",
              trend.direction === "neutral" && "text-secondary"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
      <div className="mt-2.5">
        <span className="typo-display-sm">
          {value}
        </span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
});

export const StatCardRow = React.memo(function StatCardRow({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{children}</div>;
});
