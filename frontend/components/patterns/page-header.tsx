"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";

interface PageHeaderProps {
  title: string;
  subtitle?: string | React.ReactNode;
  action?: React.ReactNode;
  onBack?: () => void;
  backHref?: string;
}

export const PageHeader = React.memo(function PageHeader({
  title,
  subtitle,
  action,
  onBack,
  backHref,
}: PageHeaderProps) {
  // Button variant for onBack
  const backButtonElement = (
    <button
      onClick={onBack}
      className="p-1.5 rounded-md hover:bg-surface-sunken text-secondary hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
      aria-label="Go back"
    >
      <HugeiconsIcon icon={ArrowLeft02Icon} className="w-4 h-4" />
    </button>
  );

  // Anchor variant for backHref
  const backLinkElement = (
    <Link href={backHref!} className="p-1.5 rounded-md hover:bg-surface-sunken text-secondary hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30">
      <HugeiconsIcon icon={ArrowLeft02Icon} className="w-4 h-4" />
    </Link>
  );

  return (
    <div className="flex items-center justify-between pb-4 border-b border-border">
      <div className="flex items-center gap-3">
        {onBack && backButtonElement}
        {backHref && !onBack && backLinkElement}
        <div>
          <h1 className="typo-headline-lg">{title}</h1>
          {subtitle && (
            <div className="typo-body-sm mt-1">{subtitle}</div>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
});
