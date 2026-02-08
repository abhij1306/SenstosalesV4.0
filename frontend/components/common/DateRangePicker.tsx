"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { format, parseISO, isValid, startOfDay, isBefore, isAfter, addDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Calendar } from "./Calendar";
import { cn } from "@/lib/utils";

interface DateRange {
    from?: string;
    to?: string;
}

interface DateRangePickerProps {
    value?: DateRange;
    onChange?: (value: DateRange) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function DateRangePicker({ value, onChange, placeholder = "Pick a date range", className, disabled }: DateRangePickerProps) {
    const [open, setOpen] = React.useState(false);
    const [selectingRange, setSelectingRange] = React.useState<"from" | "to">("from");

    const fromDate = React.useMemo(() => {
        if (!value?.from) return undefined;
        const parsed = typeof value.from === "string" && value.from.includes("T") ? new Date(value.from) : parseISO(value.from);
        return isValid(parsed) ? parsed : undefined;
    }, [value?.from]);

    const toDate = React.useMemo(() => {
        if (!value?.to) return new Date();
        const parsed = typeof value.to === "string" && value.to.includes("T") ? new Date(value.to) : parseISO(value.to);
        return isValid(parsed) ? parsed : new Date();
    }, [value?.to]);

    const handleSelect = (selectedDate: Date) => {
        const isoString = format(selectedDate, "yyyy-MM-dd");

        if (selectingRange === "from") {
            if (toDate && isBefore(selectedDate, toDate)) {
                onChange?.({ from: isoString, to: undefined });
                setSelectingRange("to");
            } else {
                onChange?.({ ...value, from: isoString });
                if (fromDate && isAfter(selectedDate, fromDate)) {
                    setSelectingRange("to");
                }
            }
        } else {
            if (fromDate && isBefore(selectedDate, fromDate)) {
                onChange?.({ from: format(selectedDate, "yyyy-MM-dd"), to: format(fromDate, "yyyy-MM-dd") });
            } else {
                onChange?.({ ...value, to: isoString });
            }
        }
    };

    const handleQuickSelect = (days: number) => {
        const today = new Date();
        const from = format(startOfDay(addDays(today, -days)), "yyyy-MM-dd");
        const to = format(startOfDay(today), "yyyy-MM-dd");
        onChange?.({ from, to });
        setOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onChange?.({ from: undefined, to: undefined });
        setSelectingRange("from");
    };

    const displayText = React.useMemo(() => {
        if (fromDate && toDate) {
            return `${format(fromDate, "dd MMM yyyy")} ${String.fromCharCode(8594)} ${format(toDate, "dd MMM yyyy")}`;
        }
        if (fromDate) {
            return `${format(fromDate, "dd MMM yyyy")} ${String.fromCharCode(8594)} ...`;
        }
        return placeholder;
    }, [fromDate, toDate, placeholder]);

    return (
        <Popover open={open} onOpenChange={(isOpen) => !disabled && setOpen(isOpen)}>
            <PopoverTrigger asChild>
                <div
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    className={cn(
                        "flex h-9 items-center justify-between rounded-xl border bg-surface px-2 py-1.5 transition-all cursor-pointer",
                        "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        !fromDate && "text-muted-foreground",
                        "border-border/60",
                        className
                    )}
                >
                    <span className="flex items-center gap-1.5 truncate pointer-events-none typo-body-md">
                        <HugeiconsIcon icon={Calendar03Icon} className="h-3.5 w-3.5 opacity-70" />
                        {displayText}
                    </span>
                    {((fromDate || toDate) && !disabled) && (
                        <span
                            role="button"
                            aria-label="Clear date range"
                            onClick={handleClear}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClear(e as unknown as React.MouseEvent); } }}
                            tabIndex={0}
                            className="ml-1.5 rounded-full p-0.5 hover:bg-muted/80 transition-colors pointer-events-auto cursor-pointer"
                        >
                            <HugeiconsIcon icon={ArrowRight01Icon} className="h-3 w-3 opacity-50 hover:opacity-100 rotate-90" />
                        </span>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0 border-border/60 shadow-xl backdrop-blur-sm"
                align="start"
                sideOffset={8}
            >
                <div className="flex">
                    <div className="border-r border-border/40">
                        <div className="p-2 border-b border-border/40 bg-muted/20">
                            <button
                                onClick={() => setSelectingRange("from")}
                                className={cn(
                                    "w-full text-left px-2 py-1 rounded-md typo-body-md hover:bg-muted/50 transition-colors",
                                    selectingRange === "from" && "bg-primary/10 text-primary"
                                )}
                            >
                                From: {fromDate ? format(fromDate, "dd MMM yyyy") : "Select"}
                            </button>
                            <button
                                onClick={() => setSelectingRange("to")}
                                className={cn(
                                    "w-full text-left px-2 py-1 rounded-md typo-body-md hover:bg-muted/50 transition-colors mt-0.5",
                                    toDate && "bg-primary/10 text-primary"
                                )}
                            >
                                To: {format(toDate, "dd MMM yyyy")}
                            </button>
                        </div>
                        <Calendar selected={selectingRange === "from" ? fromDate : toDate} onSelect={handleSelect} />
                    </div>
                    <div className="p-2 min-w-[100px]">
                        <span className="typo-body-sm text-muted-foreground block mb-1">
                            Quick
                        </span>
                        <div className="space-y-0.5">
                            <button
                                onClick={() => handleQuickSelect(7)}
                                className="w-full text-left px-2 py-1 rounded-md typo-body-md hover:bg-muted/50 transition-colors"
                            >
                                Last 7 days
                            </button>
                            <button
                                onClick={() => handleQuickSelect(30)}
                                className="w-full text-left px-2 py-1 rounded-md typo-body-md hover:bg-muted/50 transition-colors"
                            >
                                Last 30 days
                            </button>
                            <button
                                onClick={() => handleQuickSelect(90)}
                                className="w-full text-left px-2 py-1 rounded-md typo-body-md hover:bg-muted/50 transition-colors"
                            >
                                Last 90 days
                            </button>
                            <button
                                onClick={() => handleQuickSelect(365)}
                                className="w-full text-left px-2 py-1 rounded-md typo-body-md hover:bg-muted/50 transition-colors"
                            >
                                Last year
                            </button>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export type { DateRangePickerProps, DateRange };
