"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

interface ToolbarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  children?: React.ReactNode;
}

export const Toolbar = React.memo(function Toolbar({ search, children }: ToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      {search && (
        <div className="relative max-w-sm flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary"
          />
          <input
            type="text"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder || "Search..."}
            className="w-full h-size-sm pl-9 pr-4 typo-body rounded-md border border-border bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
          />
        </div>
      )}
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
});
