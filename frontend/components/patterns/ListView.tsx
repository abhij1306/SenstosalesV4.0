"use client";

import React, { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { Column } from "@/components/common/DataTable";
import type { PaginatedResponse } from "@/lib/api";
import { useTableState } from "@/hooks/useTableState";
import { DataTable, Button } from "@/components/common";
import { PageHeader, Layout } from "@/components/patterns";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon as Plus, Download01Icon as Download } from "@hugeicons/core-free-icons";

// ============================================================================
// TYPES
// ============================================================================

interface ListViewProps<T> {
    // Header
    title: string;
    subtitle?: string;
    
    // Data
    initialData: PaginatedResponse<T>;
    fetchData: (params: {
        limit: number;
        offset: number;
        sort_by: string;
        order: "asc" | "desc";
        search: string;
    }) => Promise<PaginatedResponse<T>>;
    
    // Table
    columns: Column<T>[];
    keyField: keyof T | string;
    defaultSortBy: string;
    defaultSortOrder?: "asc" | "desc";
    defaultLimit?: number;
    
    // Toolbar
    searchPlaceholder?: string;
    createButton?: {
        label: string;
        href: string;
        icon?: typeof Plus;
    };
    exportButton?: {
        label: string;
        onClick: () => void;
        loading?: boolean;
    };
    customToolbar?: ReactNode;
    
    // Row interaction
    onRowClick?: (row: T) => void;
    
    // Selection
    selectable?: boolean;
    selectedRows?: string[];
    onSelectionChange?: (selected: string[]) => void;
    
    // Stats
    stats?: ReactNode;
    
    // Styling
    className?: string;
}

// ============================================================================
// UNIFIED LIST VIEW COMPONENT
// ============================================================================

export function ListView<T extends Record<string, any>>({
    title,
    subtitle,
    initialData,
    fetchData,
    columns,
    keyField,
    defaultSortBy,
    defaultSortOrder = "desc",
    defaultLimit = 10,
    searchPlaceholder = "Search...",
    createButton,
    exportButton,
    customToolbar,
    onRowClick,
    selectable,
    stats,
    selectedRows,
    onSelectionChange,
    className,
}: ListViewProps<T>) {
    // Use table state WITHOUT URL sync (prevents flicker)
    const table = useTableState({
        defaultLimit,
        defaultSortBy,
        defaultSortOrder,
        syncUrl: false, // Always disabled for smooth UX
    });

    // Data state
    const [data, setData] = useState<PaginatedResponse<T>>(initialData);
    const [loading, setLoading] = useState(false);
    const isFirstLoad = useRef(true);
    const requestIdRef = useRef(0);

    // Build query params
    const queryParams = useMemo(() => ({
        limit: table.limit,
        offset: table.offset,
        sort_by: table.sortBy,
        order: table.sortOrder,
        search: table.search,
    }), [table.limit, table.offset, table.sortBy, table.sortOrder, table.search]);

    // Fetch data on param changes (and initial load if no data)
    useEffect(() => {
        if (table.isInitialLoading) return;
        
        // Skip only if we have data AND this is the first load
        if (isFirstLoad.current && data.items.length > 0) {
            isFirstLoad.current = false;
            return;
        }
        isFirstLoad.current = false;

        const localRequestId = ++requestIdRef.current;

        const doFetch = async () => {
            setLoading(true);
            try {
                const result = await fetchData(queryParams);
                // Only update if this is still the most recent request
                if (requestIdRef.current === localRequestId) {
                    setData(result);
                }
            } catch (err: any) {
                if (err.name === "AbortError") return;
                console.error("ListView fetch error:", err);
            } finally {
                if (requestIdRef.current === localRequestId) {
                    setLoading(false);
                }
            }
        };

        doFetch();
    }, [queryParams, table.isInitialLoading, fetchData]);

    // Handle row click
    const handleRowClick = useMemo(() => {
        if (!onRowClick) return undefined;
        return (row: T) => onRowClick(row);
    }, [onRowClick]);

    return (
        <div className={cn("h-full flex flex-col", Layout.colGap, className)}>
            {/* Header */}
            <PageHeader
                title={title}
                subtitle={subtitle}
                action={
                    <div className="flex items-center gap-2">
                        {exportButton && (
                            <Button
                                variant="outline"
                                size="compact"
                                onClick={exportButton.onClick}
                                disabled={exportButton.loading}
                            >
                                <HugeiconsIcon 
                                    icon={Download} 
                                    className={cn("w-4 h-4", exportButton.loading && "animate-spin")} 
                                />
                                <span className="hidden sm:inline">{exportButton.label}</span>
                            </Button>
                        )}
                        {createButton && (
                            <Button onClick={() => window.location.href = createButton.href} size="compact">
                                <HugeiconsIcon icon={createButton.icon || Plus} className="w-4 h-4" />
                                <span className="hidden sm:inline">{createButton.label}</span>
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Stats */}
            {stats && <div className="mb-2">{stats}</div>}

            {/* Toolbar */}
            <div className={cn(
                "flex items-center gap-3 px-3 py-2.5",
                "bg-surface border border-border rounded-xl"
            )}>
                <div className="flex-1 max-w-md">
                    <input
                        type="text"
                        value={table.search}
                        onChange={(e) => table.setSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        className={cn(
                            "w-full h-9 px-4 typo-body-md",
                            "rounded-lg border border-border bg-surface-sunken",
                            "focus:border-primary focus:ring-2 focus:ring-primary/20",
                            "outline-none transition-colors"
                        )}
                    />
                </div>
                {customToolbar && (
                    <div className="flex items-center gap-2">
                        {customToolbar}
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-hidden border border-border rounded-xl bg-surface">
                <DataTable
                    columns={columns as Column<Record<string, any>>[]}
                    data={data.items}
                    keyField={keyField as string}
                    page={table.page}
                    pageSize={table.limit}
                    totalItems={data.metadata.total_count}
                    onPageChange={table.setPage}
                    onPageSizeChange={table.setLimit}
                    sortKey={table.sortBy}
                    sortDirection={table.sortOrder}
                    onSort={table.setSort}
                    loading={loading && data.items.length === 0}
                    selectable={selectable}
                    selectedRows={selectedRows}
                    onSelectionChange={onSelectionChange}
                    onRowClick={handleRowClick as ((record: Record<string, any>) => void) | undefined}
                    density="compact"
                    className="h-full"
                />
            </div>
        </div>
    );
}

// ============================================================================
// SIMPLER HOOK VERSION (for custom layouts)
// ============================================================================

interface UseListViewOptions<T> {
    initialData: PaginatedResponse<T>;
    fetchData: (params: {
        limit: number;
        offset: number;
        sort_by: string;
        order: "asc" | "desc";
        search: string;
    }) => Promise<PaginatedResponse<T>>;
    defaultSortBy: string;
    defaultSortOrder?: "asc" | "desc";
    defaultLimit?: number;
}

export function useListView<T>(options: UseListViewOptions<T>) {
    const {
        initialData,
        fetchData,
        defaultSortBy,
        defaultSortOrder = "desc",
        defaultLimit = 10,
    } = options;

    const table = useTableState({
        defaultLimit,
        defaultSortBy,
        defaultSortOrder,
        syncUrl: false,
    });

    const [data, setData] = useState<PaginatedResponse<T>>(initialData);
    const [loading, setLoading] = useState(false);
    const isFirstLoad = useRef(true);
    const requestIdRef = useRef(0);

    const queryParams = useMemo(() => ({
        limit: table.limit,
        offset: table.offset,
        sort_by: table.sortBy,
        order: table.sortOrder,
        search: table.search,
    }), [table.limit, table.offset, table.sortBy, table.sortOrder, table.search]);

    useEffect(() => {
        if (table.isInitialLoading) return;
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            return;
        }

        const controller = new AbortController();
        const localRequestId = ++requestIdRef.current;

        const doFetch = async () => {
            setLoading(true);
            try {
                const result = await fetchData(queryParams);
                if (requestIdRef.current === localRequestId) {
                    setData(result);
                }
            } catch (err: any) {
                if (err.name === "AbortError") return;
                throw err;
            } finally {
                if (requestIdRef.current === localRequestId) {
                    setLoading(false);
                }
            }
        };

        doFetch();
        return () => controller.abort();
    }, [queryParams, table.isInitialLoading, fetchData]);

    return {
        table,
        data,
        setData,
        loading,
        queryParams,
    };
}

export default ListView;
