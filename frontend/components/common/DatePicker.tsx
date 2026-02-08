"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { format, parseISO, isValid } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Calendar } from "./Calendar";
import { cn } from "@/lib/utils";

interface DatePickerProps {
    value?: string; // ISO string or YYYY-MM-DD
    onChange?: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    error?: boolean;
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", className, disabled, error }: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    // Parse the incoming value string into a Date object
    const date = React.useMemo(() => {
        if (!value) return undefined;
        const parsed = typeof value === "string" && value.includes("T") ? new Date(value) : parseISO(value);
        return isValid(parsed) ? parsed : undefined;
    }, [value]);

    const handleSelect = (selectedDate: Date) => {
        const isoString = format(selectedDate, "yyyy-MM-dd");
        onChange?.(isoString);
        setOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onChange?.("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            setOpen(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={(isOpen) => !disabled && setOpen(isOpen)}>
            <PopoverTrigger asChild>
                <div
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    onKeyDown={handleKeyDown}
                    className={cn(
                        "flex h-size-sm items-center justify-between rounded-xl border bg-surface px-3 py-2 transition-all cursor-pointer",
                        "hover:bg-surface-sunken focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        error && "border-destructive focus:ring-destructive/20",
                        !date && "text-secondary",
                        !error && "border-border/60",
                        className
                    )}
                >
                    <span className="flex items-center gap-1.5 truncate pointer-events-none typo-body-md">
                        <HugeiconsIcon icon={Calendar03Icon} className="h-3.5 w-3.5 opacity-70" />
                        {date ? format(date, "dd MMM yyyy") : placeholder}
                    </span>
                    {date && !disabled && (
                        <span
                            role="button"
                            aria-label="Clear date"
                            onClick={handleClear}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClear(e as unknown as React.MouseEvent); } }}
                            tabIndex={0}
                            className="ml-1.5 rounded-full p-0.5 hover:bg-surface-sunken transition-colors pointer-events-auto cursor-pointer"
                        >
                            <HugeiconsIcon icon={Cancel01Icon} className="h-3 w-3 opacity-50 hover:opacity-100" />
                        </span>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0 border-border/60 shadow-xl backdrop-blur-sm"
                align="start"
                sideOffset={8}
            >
                <Calendar selected={date} onSelect={handleSelect} />
            </PopoverContent>
        </Popover>
    );
}

// Compact version for use in tables and forms
interface DatePickerCompactProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function DatePickerCompact({ value, onChange, placeholder = "Select date", className, disabled }: DatePickerCompactProps) {
    const [open, setOpen] = React.useState(false);

    const date = React.useMemo(() => {
        if (!value) return undefined;
        const parsed = typeof value === "string" && value.includes("T") ? new Date(value) : parseISO(value);
        return isValid(parsed) ? parsed : undefined;
    }, [value]);

    const handleSelect = (selectedDate: Date) => {
        const isoString = format(selectedDate, "yyyy-MM-dd");
        onChange?.(isoString);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={(isOpen) => !disabled && setOpen(isOpen)}>
            <PopoverTrigger asChild>
                <div
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    className={cn(
                        "flex h-size-xs items-center justify-between rounded-lg border bg-surface px-2 py-1 transition-all cursor-pointer",
                        "hover:bg-surface-sunken focus:outline-none focus:ring-2 focus:ring-primary/20",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        !date && "text-muted-foreground",
                        className
                    )}
                >
                    <span className="flex items-center gap-1 truncate pointer-events-none typo-body-md">
                        <HugeiconsIcon icon={Calendar03Icon} className="h-3 w-3 opacity-70" />
                        {date ? format(date, "dd MMM yyyy") : placeholder}
                    </span>
                </div>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0 border-border/60 shadow-xl backdrop-blur-sm"
                align="start"
                sideOffset={4}
            >
                <Calendar selected={date} onSelect={handleSelect} />
            </PopoverContent>
        </Popover>
    );
}

export type { DatePickerProps, DatePickerCompactProps };
