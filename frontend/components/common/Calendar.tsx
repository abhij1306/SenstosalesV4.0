"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    eachDayOfInterval,
    isToday,
    startOfDay,
    getMonth,
    getYear,
    eachYearOfInterval,
    isBefore,
    isAfter,
} from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarProps {
    selected?: Date;
    onSelect?: (date: Date) => void;
    className?: string;
    mode?: "single" | "range";
    range?: { from?: Date; to?: Date };
    onRangeChange?: (range: { from?: Date; to?: Date }) => void;
}

interface DateRange {
    from?: Date;
    to?: Date;
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function Calendar({ selected, onSelect, className, mode = "single", range, onRangeChange }: CalendarProps): React.ReactNode {
    const [currentMonth, setCurrentMonth] = React.useState(selected || range?.from || new Date());
    const [showYearPicker, setShowYearPicker] = React.useState(false);
    const [showMonthPicker, setShowMonthPicker] = React.useState(false);
    const [hoverDate, setHoverDate] = React.useState<Date | undefined>(undefined);

    const selectedDate = selected ? startOfDay(selected) : undefined;
    const rangeFrom = range?.from ? startOfDay(range.from) : undefined;
    const rangeTo = range?.to ? startOfDay(range.to) : undefined;

    const currentYear = getYear(currentMonth);
    const currentMonthIndex = getMonth(currentMonth);

    const years = React.useMemo(() => {
        const now = new Date();
        const start = now.getFullYear() - 50;
        const end = now.getFullYear() + 50;
        return eachYearOfInterval({ start: new Date(start, 0, 1), end: new Date(end, 11, 31) });
    }, []);

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const handleYearSelect = (year: number) => {
        setCurrentMonth(new Date(year, currentMonthIndex, 1));
        setShowYearPicker(false);
    };
    const handleMonthSelect = (monthIndex: number) => {
        setCurrentMonth(new Date(currentYear, monthIndex, 1));
        setShowMonthPicker(false);
    };

    const handleDateSelect = (day: Date) => {
        if (mode === "single") {
            onSelect?.(day);
        } else if (mode === "range" && onRangeChange) {
            if (!rangeFrom || (rangeFrom && rangeTo)) {
                onRangeChange({ from: day, to: undefined });
            } else if (rangeFrom && !rangeTo) {
                if (isBefore(day, rangeFrom)) {
                    onRangeChange({ from: day, to: rangeFrom });
                } else if (isSameDay(day, rangeFrom)) {
                    onRangeChange({ from: day, to: undefined });
                } else {
                    onRangeChange({ from: rangeFrom, to: day });
                }
            }
        }
    };

    const isInRange = (day: Date) => {
        if (mode === "range" && rangeFrom && rangeTo) {
            return isAfter(day, rangeFrom) && isBefore(day, rangeTo);
        }
        if (mode === "range" && rangeFrom && !rangeTo && hoverDate && isAfter(hoverDate, rangeFrom)) {
            return isAfter(day, rangeFrom) && isBefore(day, hoverDate);
        }
        return false;
    };

    const isRangeStart = (day: Date) => {
        if (mode === "range" && rangeFrom) {
            return isSameDay(day, rangeFrom);
        }
        return false;
    };

    const isRangeEnd = (day: Date) => {
        if (mode === "range" && rangeTo) {
            return isSameDay(day, rangeTo);
        }
        if (mode === "range" && rangeFrom && !rangeTo && hoverDate && isAfter(hoverDate, rangeFrom)) {
            return isSameDay(day, hoverDate);
        }
        return false;
    };

    const renderYearPicker = () => (
        <div className="grid grid-cols-4 gap-px p-1 max-h-32 overflow-y-auto">
            {years.map((year) => (
                <button
                    key={year.getFullYear()}
                    onClick={() => handleYearSelect(year.getFullYear())}
                    className={cn(
                        "h-7 typo-label-md rounded transition-colors",
                        year.getFullYear() === currentYear
                            ? "bg-primary text-primary-contrast"
                            : "hover:bg-surface-sunken text-foreground"
                    )}
                >
                    {year.getFullYear()}
                </button>
            ))}
        </div>
    );

    const renderMonthPicker = () => (
        <div className="grid grid-cols-3 gap-px p-1">
            {MONTHS.map((month, index) => (
                <button
                    key={month}
                    onClick={() => handleMonthSelect(index)}
                    className={cn(
                        "h-7 typo-label-md rounded transition-colors truncate px-1",
                        index === currentMonthIndex
                            ? "bg-primary text-primary-contrast"
                            : "hover:bg-surface-sunken text-foreground"
                    )}
                >
                    {month.substring(0, 3)}
                </button>
            ))}
        </div>
    );

    const renderHeader = () => (
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
            <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-md hover:bg-surface-sunken transition-colors"
                aria-label="Previous month"
            >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4 text-secondary" />
            </button>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false); }}
                    className="typo-body-md text-foreground flex items-center gap-1 hover:bg-surface-sunken/50 rounded-md px-2 py-1 transition-colors"
                >
                    {format(currentMonth, "MMM")}
                    <HugeiconsIcon icon={ArrowDown01Icon} className={cn("w-3 h-3 transition-transform", showMonthPicker && "rotate-180")} />
                </button>
                <button
                    onClick={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false); }}
                    className="typo-body-md text-foreground flex items-center gap-1 hover:bg-surface-sunken/50 rounded-md px-2 py-1 transition-colors"
                >
                    {currentYear}
                    <HugeiconsIcon icon={ArrowDown01Icon} className={cn("w-3 h-3 transition-transform", showYearPicker && "rotate-180")} />
                </button>
            </div>

            <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-md hover:bg-surface-sunken transition-colors"
                aria-label="Next month"
            >
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 text-secondary" />
            </button>
        </div>
    );

    const renderDaysHeader = () => (
        <div className="grid grid-cols-7 px-1 py-2 border-b border-border/30">
            {DAYS.map((day, i) => (
                <div
                    key={i}
                    className="h-5 flex items-center justify-center typo-body-sm text-tertiary"
                >
                    {day}
                </div>
            ))}
        </div>
    );

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div
                className="grid grid-cols-7 gap-0.5 px-1 py-1"
                onMouseLeave={() => setHoverDate(undefined)}
            >
                {calendarDays.map((day) => {
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isOutsideMonth = !isSameMonth(day, monthStart);
                    const isCurrentToday = isToday(day);
                    const inRange = isInRange(day);
                    const rangeStart = isRangeStart(day);
                    const rangeEnd = isRangeEnd(day);
                    const isRangeEdge = rangeStart || rangeEnd;

                    return (
                        <button
                            key={day.toISOString()}
                            onClick={(e) => {
                                e.preventDefault();
                                handleDateSelect(day);
                            }}
                            onMouseEnter={() => mode === "range" && setHoverDate(day)}
                            className={cn(
                                "h-7 w-7 flex items-center justify-center typo-label-md rounded-md transition-all relative",
                                "hover:bg-surface-sunken",
                                isOutsideMonth && "text-tertiary/40",
                                !isOutsideMonth && !inRange && !isSelected && "text-foreground",
                                isCurrentToday && !isSelected && !inRange && !rangeStart && !rangeEnd && "text-primary",
                                isSelected && "bg-primary text-white shadow-sm",
                                inRange && !isRangeEdge && "bg-primary-muted/30 rounded-none",
                                (rangeStart || rangeEnd) && "bg-primary-muted/50 rounded-full",
                                rangeStart && !rangeEnd && "rounded-r-none",
                                rangeEnd && !rangeStart && "rounded-l-none"
                            )}
                        >
                            {format(day, "d")}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className={cn("w-56 select-none bg-surface rounded-xl border border-border shadow-md overflow-hidden", className)}>
            {renderHeader()}
            {showYearPicker ? renderYearPicker() : showMonthPicker ? renderMonthPicker() : (
                <>
                    {renderDaysHeader()}
                    {renderCells()}
                </>
            )}
        </div>
    );
}

export type { CalendarProps, DateRange };
