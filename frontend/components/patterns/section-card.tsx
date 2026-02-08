"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export const SectionCard = React.memo(function SectionCard({
  title,
  icon,
  badge,
  children,
  className,
  headerClassName,
}: SectionCardProps) {
  return (
    <div className={cn("form-section", className)}>
      <div className={cn("form-section-header", headerClassName)}>
        <div className="flex items-center gap-2">
          {icon && <span className="text-primary">{icon}</span>}
          <span className="form-label">{title}</span>
        </div>
        {badge && <div>{badge}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
});
