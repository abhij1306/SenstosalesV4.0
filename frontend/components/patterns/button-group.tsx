"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ButtonGroupOption {
  id: string;
  label: string;
  disabled?: boolean;
}

interface ButtonGroupProps {
  options: ButtonGroupOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
}

export const ButtonGroup = React.memo(function ButtonGroup({
  options,
  value,
  onChange,
  size = "md",
}: ButtonGroupProps) {
  return (
    <div className="flex items-center p-0.5 rounded-md bg-surface-sunken border border-border">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => !opt.disabled && onChange(opt.id)}
          disabled={opt.disabled}
          className={cn(
            "px-3 rounded transition-colors",
            size === "sm" && "py-1 typo-label-md",
            size === "md" && "py-1.5 typo-label-md",
            value === opt.id
              ? "bg-primary text-primary-contrast"
              : "text-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
});
