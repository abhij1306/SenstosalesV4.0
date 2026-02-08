"use client";

import React from "react";
import * as ReactWindow from "react-window";
const List: any = (ReactWindow as any).FixedSizeList ||
    (ReactWindow as any).default?.FixedSizeList ||
    (ReactWindow as any).default ||
    ((ReactWindow as any).default && (ReactWindow as any).default.FixedSizeList);
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowRight01Icon, Sorting01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { useState, useMemo, useRef, useEffect } from "react";
import { Pagination } from "./Pagination";
import { Input } from "./Input";
import { fmtNum } from "@/lib/formatters";

export interface Column<T> {
    key: keyof T;
    label: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render?: (value: any, record: T, index: number) => React.ReactNode;
    sortable?: boolean;

}

export interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    keyField: keyof T;
    className?: string;
    onRowClick?: (record: T) => void;
    rowClassName?: (record: T) => string;
    loading?: boolean;
    emptyMessage?: string;
    virtualized?: boolean;
    maxHeight?: number | string;
    rowHeight?: number;
    density?: 'normal' | 'compact';
    page?: number;
    pageSize?: number;
    totalItems?: number;
    onPageChange?: (page: number) => void;
    sortKey?: string;
    sortDirection?: "asc" | "desc";
    onSort?: (key: string) => void;
    selectable?: boolean;
    selectedRows?: string[];
    onSelectionChange?: (selected: string[]) => void;

    onPageSizeChange?: (size: number) => void;
    error?: string;
    emptyIcon?: React.ReactNode;
    renderSubRow?: (row: T) => React.ReactNode;
    onRowExpand?: (row: T, isExpanded: boolean) => void;
    no_subrow_padding?: boolean;
    hideHeader?: boolean;
}

const VirtualizedRow = React.memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: any }) => {
    const { items, columns, onRowClick } = data;
    const row = items[index];

    return (
        <div
            style={style}
            onClick={() => onRowClick?.(row)}
            className={cn(
                "flex items-center group relative transition-colors",
                "cursor-pointer hover:bg-surface-sunken/50",
                index % 2 === 1 && "bg-surface-sunken/20"
            )}
        >
            {columns.map((column: Column<any>) => (
                <div
                    key={column.key as string}
                    className={cn(
                        "px-3 py-2 typo-body-mono text-foreground/90",
                        column.align === 'left' && 'text-left',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right tabular-nums'
                    )}
                    style={{ width: column.width || `${100 / columns.length}%` }}
                >
                    {column.render ? column.render(row[column.key], row, index) : (row[column.key] ?? "—")}
                </div>
            ))}
        </div>
    );
});
VirtualizedRow.displayName = 'VirtualizedRow';

export const DataTable = React.memo(<T extends Record<string, any>>({
    columns,
    data,
    className,
    keyField = "id",
    onRowClick,
    loading = false,
    emptyMessage = "No data available",
    rowHeight: propRowHeight = 40,
    virtualized = true,
    maxHeight = 800,
    density = "compact",
    page,
    pageSize,
    totalItems,
    onPageChange,
    sortKey,
    sortDirection,
    onSort,
    selectable,
    selectedRows,
    onSelectionChange,

    error,
    emptyIcon,
    renderSubRow,
    onRowExpand,
    no_subrow_padding,
    onPageSizeChange,
    hideHeader,
}: DataTableProps<T>) => {
    const actualRowHeight = density === 'compact' ? 32 : 44;
    const headerHeight = density === 'compact' ? 32 : 40;
    const cellPadding = density === 'compact' ? 'px-3 py-1' : 'px-3 py-2';
    const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());

    const shouldVirtualize = !!virtualized;

    const hasWarnedRef = useRef(false);

    // One-time validation: warn if sub-row expansion is used with virtualization
    useEffect(() => {
        if (!hasWarnedRef.current && shouldVirtualize && (renderSubRow || onRowExpand)) {
            console.warn(
                "DataTable: Sub-row expansion (renderSubRow, onRowExpand) is not supported when virtualized={true}. " +
                "Either disable virtualization or remove sub-row expansion props."
            );
            hasWarnedRef.current = true;
        }
    }, [shouldVirtualize, renderSubRow, onRowExpand]);
    // For server-sorted data, skip local sorting
    // Parent should handle sorting when onSort is provided
    const sortedData = data;

    const paginatedData = useMemo(() => {
        if (onPageChange || !page || !pageSize || !sortedData) return sortedData || [];
        const isServerPaginated = totalItems !== undefined && totalItems > sortedData.length;
        if (isServerPaginated) return sortedData;
        const start = (page - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, page, pageSize, totalItems, onPageChange]);

    const effectiveColumns = useMemo(() => {
        if (!selectable) return columns;
        const selectionColumn: Column<T> = {
            key: "__selection__" as keyof T,
            label: "",
            width: "40px",
            align: "center",
            render: (_v, row) => {
                const isSelected = selectedRows?.includes(String(row[keyField] ?? ""));
                return (
                    <Input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                            e.stopPropagation();
                            if (!onSelectionChange || !selectedRows) return;
                            const id = String(row[keyField] ?? "");
                            if (e.target.checked) {
                                onSelectionChange([...selectedRows, id]);
                            } else {
                                onSelectionChange(selectedRows.filter(r => r !== id));
                            }
                        }}
                        className="w-4 h-4 rounded border-border"
                    />
                );
            }
        };
        return [selectionColumn, ...columns];
    }, [columns, selectable, selectedRows, onSelectionChange, keyField]);

    const handleSelectAll = React.useCallback(() => {
        if (!onSelectionChange || !data || !selectedRows) return;
        const allIds = data.map(d => String(d[keyField] ?? ""));
        const areAllSelected = allIds.every(id => selectedRows.includes(id));
        if (areAllSelected) {
            const newSelection = selectedRows.filter(id => !allIds.includes(id));
            onSelectionChange(newSelection);
        } else {
            const newSelection = [...new Set([...selectedRows, ...allIds])];
            onSelectionChange(newSelection);
        }
    }, [data, keyField, onSelectionChange, selectedRows]);

    const isVirtualizationAvailable = shouldVirtualize && typeof List === 'function';
    
    // Use memoized itemData for react-window to detect changes properly
    const itemData = useMemo(() => ({
        items: paginatedData || [],
        columns: effectiveColumns,
        onRowClick
    }), [paginatedData, effectiveColumns, onRowClick]);

    const showEmptyState = (!data || data.length === 0) && !loading;
    const showInitialLoading = loading && (!data || data.length === 0);

    if (showInitialLoading) {
        return (
            <div className="w-full flex justify-center py-16 bg-surface-sunken/30 rounded-lg border border-dashed border-border">
                <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                    <span className="typo-label-md uppercase text-tertiary">Loading...</span>
                </div>
            </div>
        );
    }

    if (showEmptyState) {
        return (
            <div className="p-8 text-center bg-surface-sunken/20 rounded-lg border border-dashed border-border">
                <span className="typo-body-md">{emptyMessage}</span>
            </div>
        );
    }

    if (isVirtualizationAvailable) {
        const vHeight = typeof maxHeight === 'number' ? Math.min(maxHeight, paginatedData.length * actualRowHeight) : 800;
        return (
            <div className={cn("flex flex-col w-full bg-surface border border-border rounded-lg overflow-hidden", className)}>
                {!hideHeader && (
                    <div className="overflow-hidden" style={{ width: '100%' }}>
                        <div className="flex bg-surface-sunken/50 border-b border-border" style={{ width: 'max-content', minWidth: '100%' }}>
                            {effectiveColumns.map((column) => {
                                const isSorted = sortKey === (column.key as string);
                                return (
                                    <div
                                        key={column.key as string}
                                        onClick={() => column.sortable && onSort?.(column.key as string)}
                                        className={cn(
                                            "px-3 flex items-center select-none",
                                            "typo-label-md uppercase whitespace-nowrap transition-colors",
                                            column.sortable && "cursor-pointer hover:text-foreground",
                                            column.align === 'left' && 'justify-start',
                                            column.align === 'center' && 'justify-center',
                                            column.align === 'right' && 'justify-end'
                                        )}
                                        style={{ width: column.width || '150px', height: headerHeight }}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {column.key === "__selection__" ? (
                                                <Input
                                                    type="checkbox"
                                                    checked={data.length > 0 && data.every(d => selectedRows?.includes(String(d[keyField] ?? "")))}
                                                    onChange={(e) => { e.stopPropagation(); handleSelectAll(); }}
                                                    className="w-4 h-4 rounded border-border"
                                                />
                                            ) : (
                                                <span>{column.label}</span>
                                            )}
                                            {column.sortable && (
                                                <span className={cn("text-tertiary", isSorted && "text-primary")}>
                                                    {isSorted ? (
                                                        sortDirection === "asc" ? <HugeiconsIcon icon={ArrowUp01Icon} className="w-3 h-3" /> : <HugeiconsIcon icon={ArrowDown01Icon} className="w-3 h-3" />
                                                    ) : (
                                                        <HugeiconsIcon icon={Sorting01Icon} className="w-3 h-3 opacity-50" />
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div className="overflow-hidden flex-1 relative">
                    <List
                        height={vHeight}
                        itemCount={paginatedData.length}
                        itemSize={actualRowHeight}
                        itemData={itemData}
                        width="100%"
                    >
                        {VirtualizedRow}
                    </List>
                </div>
                {page && pageSize && totalItems !== undefined && onPageChange && (totalItems > pageSize || (pageSize && pageSize > 10)) && (
                    <Pagination
                        currentPage={page}
                        totalPages={Math.ceil(totalItems / pageSize)}
                        pageSize={pageSize}
                        totalItems={totalItems}
                        onPageChange={onPageChange}
                        onPageSizeChange={onPageSizeChange || (() => { })}
                        className="border-t border-border"
                    />
                )}
            </div >
        );
    }

    return (
        <div className={cn("flex flex-col w-full bg-surface border border-border rounded-lg overflow-hidden", className)}>
            <div className="flex-1 relative w-full overflow-auto">
                <table className="w-full border-collapse text-left">
                    {!hideHeader && (
                        <thead className="sticky top-0 z-30 bg-surface-sunken/50">
                            <tr className="border-b border-border">
                                {effectiveColumns.map((column) => {
                                    const isSorted = sortKey === (column.key as string);
                                    return (
                                        <th
                                            key={column.key as string}
                                            onClick={() => column.sortable && onSort?.(column.key as string)}
                                            className={cn(
                                                `select-none transition-colors ${cellPadding}`,
                                                "typo-label-md uppercase whitespace-nowrap",
                                                column.sortable && "cursor-pointer hover:text-foreground",
                                                column.align === 'left' && 'text-left',
                                                column.align === 'center' && 'text-center',
                                                column.align === 'right' && 'text-right'
                                            )}
                                            style={{ width: column.width, height: headerHeight }}
                                        >
                                            <div className={cn(
                                                "flex items-center gap-1",
                                                column.align === 'left' && 'justify-start',
                                                column.align === 'center' && 'justify-center',
                                                column.align === 'right' && 'justify-end'
                                            )}>
                                                {column.key === "__selection__" ? (
                                                    <Input
                                                        type="checkbox"
                                                        checked={data.length > 0 && data.every(d => selectedRows?.includes(String(d[keyField] ?? "")))}
                                                        onChange={(e) => { e.stopPropagation(); handleSelectAll(); }}
                                                        className="w-4 h-4 rounded border-border"
                                                    />
                                                ) : (
                                                    <span className="typo-body-mono">{column.label}</span>
                                                )}
                                                {column.sortable && (
                                                    <span className={cn("text-tertiary", isSorted && "text-primary")}>
                                                        {isSorted ? (
                                                            sortDirection === "asc" ? <HugeiconsIcon icon={ArrowUp01Icon} className="w-3 h-3" /> : <HugeiconsIcon icon={ArrowDown01Icon} className="w-3 h-3" />
                                                        ) : (
                                                            <HugeiconsIcon icon={Sorting01Icon} className="w-3 h-3 opacity-50" />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                    )}
                    <tbody>
                        {paginatedData.map((row, rowIndex) => {
                            const rowId = row[keyField] ?? rowIndex;
                            const isExpanded = renderSubRow && expandedRows.has(rowId);

                            return (
                                <React.Fragment key={rowId}>
                                    <tr
                                        onClick={() => {
                                            if (renderSubRow) {
                                                const newExpanded = new Set(expandedRows);
                                                if (newExpanded.has(rowId)) {
                                                    newExpanded.delete(rowId);
                                                    onRowExpand?.(row, false);
                                                } else {
                                                    newExpanded.add(rowId);
                                                    onRowExpand?.(row, true);
                                                }
                                                setExpandedRows(newExpanded);
                                            }
                                            onRowClick?.(row);
                                        }}
                                        className={cn(
                                            "border-b border-border/50 transition-colors",
                                            "hover:bg-surface-sunken/50",
                                            selectedRows?.includes(String(row[keyField] ?? "")) && "bg-primary/5"
                                        )}
                                    >
                                        {effectiveColumns.map((column) => (
                                            <td
                                                key={column.key as string}
                                                className={cn(
                                                    `${cellPadding} typo-body-mono text-foreground/90`,
                                                    column.align === 'left' && 'text-left',
                                                    column.align === 'center' && 'text-center',
                                                    column.align === 'right' && 'text-right tabular-nums'
                                                )}
                                                style={{ height: actualRowHeight }}
                                            >
                                                <div className={cn(
                                                    "flex items-center gap-2",
                                                    column.align === 'left' && 'justify-start',
                                                    column.align === 'right' && 'justify-end',
                                                    column.align === 'center' && 'justify-center'
                                                )}>
                                                    {column.key === columns[0].key && renderSubRow && (
                                                        <button
                                                            className="text-tertiary inline-flex items-center justify-center transition-transform"
                                                            aria-label={isExpanded ? "Collapse row" : "Expand row"}
                                                            aria-expanded={isExpanded}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newExpanded = new Set(expandedRows);
                                                                if (newExpanded.has(rowId)) {
                                                                    newExpanded.delete(rowId);
                                                                    onRowExpand?.(row, false);
                                                                } else {
                                                                    newExpanded.add(rowId);
                                                                    onRowExpand?.(row, true);
                                                                }
                                                                setExpandedRows(newExpanded);
                                                            }}
                                                        >
                                                            {isExpanded ? <HugeiconsIcon icon={ArrowDown01Icon} className="w-4 h-4" /> : <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                    {column.render
                                                        ? column.render(row[column.key], row, rowIndex)
                                                        : (row[column.key] ?? "—")
                                                    }
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                    {isExpanded && renderSubRow && (
                                        <tr className="bg-surface-sunken border-none">
                                            <td colSpan={effectiveColumns.length} className={cn("p-0", no_subrow_padding ? "" : "px-8 py-4")}>
                                                {renderSubRow(row)}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {page && pageSize && totalItems !== undefined && onPageChange && (totalItems > pageSize || (pageSize && pageSize > 10)) && (
                <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(totalItems / pageSize)}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange || (() => { })}
                    className="border-t border-border"
                />
            )}
        </div>
    );
});

DataTable.displayName = "DataTable";
