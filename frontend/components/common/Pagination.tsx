"use client";

import { Button } from "./Button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./Select";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon, ArrowLeftDoubleIcon, ArrowRightDoubleIcon } from "@hugeicons/core-free-icons";
import { cn } from '@/lib/utils';
import { fmtNum } from "@/lib/formatters";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    className?: string;
}

export function Pagination({
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    onPageChange,
    onPageSizeChange,
    className,
}: PaginationProps) {
    const startItem = (currentPage - 1) * pageSize + 1;
    const displayStartItem = totalItems === 0 ? 0 : startItem;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return (
        <div className={cn('flex items-center justify-between px-3 py-2 bg-surface-sunken/30', className)}>
            {/* Items count */}
            <span className="typo-body-md">
                <span className="text-foreground tabular-nums">{fmtNum(displayStartItem)}-{fmtNum(endItem)}</span>
                <span className="mx-1">of</span>
                <span className="text-foreground tabular-nums">{fmtNum(totalItems)}</span>
            </span>

            {/* Controls */}
            <div className="flex items-center gap-4">
                {/* Page size selector */}
                <div className="flex items-center gap-2">
                    <span className="typo-body-md hidden sm:inline">Rows</span>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(value) => onPageSizeChange(Number(value))}
                    >
                        <SelectTrigger className="w-16 h-7 typo-body-md">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Page navigation */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="compact"
                        className="h-7 w-7 p-0 text-tertiary hover:text-foreground"
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        aria-label="First page"
                    >
                        <HugeiconsIcon icon={ArrowLeftDoubleIcon} className="w-4 h-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="compact"
                        className="h-7 w-7 p-0 text-tertiary hover:text-foreground"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                    >
                        <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" />
                    </Button>

                    <span className="typo-body-md px-2 min-w-16 text-center">
                        <span className="text-foreground">{currentPage}</span>
                        <span className="mx-1">/</span>
                        <span>{totalPages}</span>
                    </span>

                    <Button
                        variant="ghost"
                        size="compact"
                        className="h-7 w-7 p-0 text-tertiary hover:text-foreground"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={totalPages === 0 || currentPage >= totalPages}
                        aria-label="Next page"
                    >
                        <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="compact"
                        className="h-7 w-7 p-0 text-tertiary hover:text-foreground"
                        onClick={() => onPageChange(totalPages)}
                        disabled={totalPages === 0 || currentPage >= totalPages}
                        aria-label="Last page"
                    >
                        <HugeiconsIcon icon={ArrowRightDoubleIcon} className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
