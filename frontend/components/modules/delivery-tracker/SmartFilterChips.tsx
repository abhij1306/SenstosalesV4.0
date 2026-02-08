"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/common";

export interface SmartFilterChip {
    id: string;
    label: string;
    count?: number;
    color?: "default" | "primary" | "warning" | "error" | "success";
}

interface SmartFilterChipsProps {
    chips: SmartFilterChip[];
    activeChips: string[];
    onToggle: (chipId: string) => void;
    onClear: () => void;
    className?: string;
}

export function SmartFilterChips({
    chips,
    activeChips,
    onToggle,
    onClear,
    className,
}: SmartFilterChipsProps) {
    const hasActiveFilters = activeChips.length > 0;

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {chips.map((chip) => {
                    const isActive = activeChips.includes(chip.id);
                    const colorStyles = {
                        default: isActive
                            ? "bg-surface-sunken text-foreground border-primary"
                            : "bg-surface text-secondary border-border hover:border-primary/50",
                        primary: isActive
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20",
                        warning: isActive
                            ? "bg-warning text-warning-foreground border-warning"
                            : "bg-warning/10 text-warning border-warning/30 hover:bg-warning/20",
                        error: isActive
                            ? "bg-error text-error-foreground border-error"
                            : "bg-error/10 text-error border-error/30 hover:bg-error/20",
                        success: isActive
                            ? "bg-success text-success-foreground border-success"
                            : "bg-success/10 text-success border-success/30 hover:bg-success/20",
                    };

                    return (
                        <button
                            key={chip.id}
                            onClick={() => onToggle(chip.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all shrink-0",
                                "typo-body-sm font-medium whitespace-nowrap",
                                colorStyles[chip.color || "default"]
                            )}
                        >
                            <span>{chip.label}</span>
                            {chip.count !== undefined && chip.count > 0 && (
                                <span
                                    className={cn(
                                        "px-1.5 py-0.5 rounded-full text-xs",
                                        isActive
                                            ? "bg-white/20"
                                            : chip.color === "error"
                                                ? "bg-error/20"
                                                : chip.color === "warning"
                                                    ? "bg-warning/20"
                                                    : chip.color === "success"
                                                        ? "bg-success/20"
                                                        : chip.color === "primary"
                                                            ? "bg-primary/20"
                                                            : "bg-surface-sunken"
                                    )}
                                >
                                    {chip.count}
                                </span>
                            )}
                        </button>
                    );
                })}

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="compact"
                        onClick={onClear}
                        className="shrink-0 text-tertiary hover:text-foreground"
                    >
                        Clear all
                    </Button>
                )}
            </div>
        </div>
    );
}

// Helper to calculate date ranges
export function getDateRange(days: number): { from: string; to: string } {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + days);
    
    return {
        from: today.toISOString().split("T")[0],
        to: future.toISOString().split("T")[0],
    };
}

export function getToday(): string {
    return new Date().toISOString().split("T")[0];
}

export function getTomorrow(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
}
