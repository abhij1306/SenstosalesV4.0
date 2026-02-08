"use client";

import React from 'react';
import useSWR from 'swr';
import { HugeiconsIcon } from "@hugeicons/react";
import { PackageIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/common/index";
import Link from "next/link";

export function HeaderActions() {
    return (
        <TooltipProvider>
            <div className="flex items-center gap-2">
                <DeliveryTrackerIcon />
            </div>
        </TooltipProvider>
    );
}

function DeliveryTrackerIcon() {
    const fetcher = (url: string) => fetch(url).then(res => res.json());
    const { data } = useSWR<{ total_alerts: number; overdue_count: number; due_soon_count: number }>(
        '/api/delivery-tracker/alerts',
        fetcher,
        { refreshInterval: 60000, dedupingInterval: 30000 }
    );

    const totalAlerts = data?.total_alerts || 0;
    const hasAlerts = totalAlerts > 0;
    const hasOverdue = (data?.overdue_count || 0) > 0;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link
                    href="/delivery-tracker"
                    className={cn(
                        "relative p-2 rounded-lg transition-colors",
                        hasOverdue
                            ? "text-error hover:bg-error/10"
                            : hasAlerts
                                ? "text-warning hover:bg-warning/10"
                                : "text-muted hover:text-foreground hover:bg-surface-sunken"
                    )}
                >
                    <HugeiconsIcon icon={PackageIcon} className="w-5 h-5" />
                    {hasAlerts && (
                        <span className={cn(
                            "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center typo-label-md rounded-full px-1 text-white",
                            hasOverdue ? "bg-error" : "bg-warning"
                        )}>
                            {totalAlerts > 99 ? "99+" : totalAlerts}
                        </span>
                    )}
                </Link>
            </TooltipTrigger>
            <TooltipContent>
                {hasOverdue
                    ? `${data?.overdue_count} overdue deliveries`
                    : hasAlerts
                        ? `${data?.due_soon_count} deliveries due soon`
                        : "Delivery Tracker"}
            </TooltipContent>
        </Tooltip>
    );
}
