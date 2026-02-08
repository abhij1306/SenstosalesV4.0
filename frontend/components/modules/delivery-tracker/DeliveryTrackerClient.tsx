"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
    Alert02Icon as AlertTriangle,
    Calendar03Icon as Calendar,
    Time01Icon as Clock,
    TradeDownIcon as TrendingDown,
    FilterHorizontalIcon as Filter,
    Search01Icon as Search,
    LinkSquare02Icon as ExternalLink,
    Add01Icon as Plus,
    Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn, formatIndianCurrency } from "@/lib/utils";
import { fmtNum, PageHeader, StatCard, StatCardRow, Layout } from "@/components/patterns";
import { CellMaterial, CellNum, CellDate } from "@/components/ui/table";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Button } from "@/components/common/Button";
import { DatePicker } from "@/components/common/index";
import { api } from "@/lib/api";
import { useToast } from "@/components/common/Toast";
import { SmartFilterChips, getDateRange, getToday, getTomorrow } from "./SmartFilterChips";

interface DeliveryItem {
    id: string;
    po_number: string;
    po_item_no: number;
    material_code: string;
    material_description: string;
    mtrl_cat: string | null;
    drg_no: string | null;
    unit: string;
    po_rate: number;
    lot_no: number;
    ord_qty: number;
    dsp_qty: number;
    rcd_qty: number;
    dely_date: string;
    entry_allow_date: string | null;
    dest_code: number | null;
    item_value: number;
    balance_qty: number;
    delivery_status: "overdue" | "due_soon" | "pending" | "dispatched";
    days_diff: number;
}

interface TrackerResponse {
    items: DeliveryItem[];
    metadata: {
        total_count: number;
        page: number;
        limit: number;
        overdue_count: number;
        due_soon_count: number;
        dispatched_count: number;
        pending_count: number;
        due_this_month_count: number;
        filtered_value: number;
        total_value: number;
        overdue_value: number;
    };
}

interface DeliveryTrackerClientProps {
    initialData?: TrackerResponse;
}

type StatusFilter = "all" | "overdue" | "due_soon" | "due_this_month";

export function DeliveryTrackerClient({ initialData }: DeliveryTrackerClientProps = {}) {
    const { toast } = useToast();

    // Data State
    const [data, setData] = useState<TrackerResponse | null>(initialData || null);
    const [isLoading, setIsLoading] = useState(false);

    // Track if we've used initial data
    const initialDataUsed = useRef(initialData ? false : true);
    
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const requestIdRef = useRef(0);

    // Filter State - all in one object
    const [filters, setFilters] = useState({
        page: 1,
        limit: 10,
        sort: "dely_date",
        order: "ASC" as "ASC" | "DESC",
        status: "all" as StatusFilter,
        search: "",
        dueDateFrom: "",
        dueDateTo: "",
        entryDateFrom: "",
        entryDateTo: "",
        valueMin: "",
        valueMax: "",
        smartChips: [] as string[]
    });
    
    // Local search input state for uncontrolled input (prevents lag)
    const [searchInput, setSearchInput] = useState(filters.search);

    // Single effect for all data fetching
    useEffect(() => {
        // Skip initial fetch if we have initialData and haven't used it yet
        if (initialData && !initialDataUsed.current) {
            initialDataUsed.current = true;
            return;
        }

        const controller = new AbortController();
        const currentRequestId = ++requestIdRef.current;
        
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await api.listDeliveryItems({
                    page: filters.page,
                    limit: filters.limit,
                    sort: filters.sort,
                    order: filters.order,
                    search: filters.search || undefined,
                    status: filters.status,
                    due_date_from: filters.dueDateFrom,
                    due_date_to: filters.dueDateTo,
                    entry_date_from: filters.entryDateFrom,
                    entry_date_to: filters.entryDateTo,
                    value_min: filters.valueMin,
                    value_max: filters.valueMax,
                    signal: controller.signal,
                });

                // Only update if this is still the latest request
                if (requestIdRef.current === currentRequestId) {
                    setData(response);
                    setIsLoading(false);
                }
            } catch (error: any) {
                // Only show error if this is still the latest request and not aborted
                if (requestIdRef.current === currentRequestId && error.name !== 'AbortError') {
                    toast("Error", `Failed to load items: ${error.message || "Unknown error"}`, "error");
                    setIsLoading(false);
                }
            }
        };

        fetchData();

        return () => controller.abort();
    }, [filters]);

    // Update filter helper
    const updateFilter = useCallback((key: keyof typeof filters, value: any) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            // Reset page when changing filters (except page itself)
            ...(key !== 'page' && key !== 'limit' && key !== 'sort' && key !== 'order' ? { page: 1 } : {})
        }));
    }, []);

    // Handlers
    const handleSetStatus = useCallback((newStatus: StatusFilter) => {
        setFilters(prev => ({
            ...prev,
            status: prev.status === newStatus ? "all" : newStatus,
            page: 1
        }));
    }, []);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const handleSetSearch = useCallback((value: string) => {
        // Update local state immediately for responsive input
        setSearchInput(value);
        // Debounce syncing to filters
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            setFilters(prev => ({ ...prev, search: value, page: 1 }));
        }, 300);
    }, []);

    const handleClearSearch = useCallback(() => {
        setFilters(prev => ({ ...prev, search: "", page: 1 }));
    }, []);

    // Direct sort handler - no throttle needed (AbortController handles cancellation)
    const handleSetSort = useCallback((key: string) => {
        setFilters(prev => ({
            ...prev,
            sort: key,
            order: prev.sort === key ? (prev.order === "ASC" ? "DESC" : "ASC") : "DESC",
            page: 1
        }));
    }, []);

    const handleSetPage = useCallback((page: number) => {
        setFilters(prev => ({ ...prev, page }));
    }, []);

    const handleSetLimit = useCallback((limit: number) => {
        setFilters(prev => ({ ...prev, limit, page: 1 }));
    }, []);

    const handleClearFilters = useCallback(() => {
        setFilters({
            page: 1,
            limit: 10,
            sort: "dely_date",
            order: "ASC",
            status: "all",
            search: "",
            dueDateFrom: "",
            dueDateTo: "",
            entryDateFrom: "",
            entryDateTo: "",
            valueMin: "",
            valueMax: "",
            smartChips: []
        });
        setSearchInput("");
    }, []);

    // Smart chip toggle handler
    const handleChipToggle = useCallback((chipId: string) => {
        setFilters(prev => {
            const isActive = prev.smartChips.includes(chipId);
            let newChips = isActive
                ? prev.smartChips.filter(c => c !== chipId)
                : [...prev.smartChips, chipId];

            // Calculate date filters based on active chips
            let dueDateFrom = "";
            let dueDateTo = "";
            let valueMin = "";
            let valueMax = "";

            // Date range chips (mutually exclusive - use the most restrictive)
            if (newChips.includes("today")) {
                dueDateFrom = getToday();
                dueDateTo = getToday();
            } else if (newChips.includes("tomorrow")) {
                dueDateFrom = getTomorrow();
                dueDateTo = getTomorrow();
            } else if (newChips.includes("this_week")) {
                const range = getDateRange(7);
                dueDateFrom = range.from;
                dueDateTo = range.to;
            } else if (newChips.includes("next_week")) {
                const start = new Date();
                start.setDate(start.getDate() + 7);
                const end = new Date();
                end.setDate(end.getDate() + 14);
                dueDateFrom = start.toISOString().split("T")[0];
                dueDateTo = end.toISOString().split("T")[0];
            }

            // Value chips
            if (newChips.includes("high_value")) {
                valueMin = "100000";
            } else if (newChips.includes("critical_value")) {
                valueMin = "1000000";
            }

            return {
                ...prev,
                smartChips: newChips,
                page: 1,
                dueDateFrom,
                dueDateTo,
                valueMin,
                valueMax
            };
        });
    }, []);

    // Clear only smart chips
    const handleClearChips = useCallback(() => {
        setFilters(prev => ({
            ...prev,
            smartChips: [],
            page: 1,
            dueDateFrom: "",
            dueDateTo: "",
            valueMin: "",
            valueMax: ""
        }));
    }, []);

    const columns: Column<DeliveryItem>[] = useMemo(() => [
        {
            label: "PO / Material",
            key: "po_number",
            sortable: true,
            render: (_val, item) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Link href={`/po/${item.po_number}`} className="text-primary hover:underline typo-body-md flex items-center gap-1">
                            {item.po_number}
                            <HugeiconsIcon icon={ExternalLink} className="w-3 h-3" />
                        </Link>
                        <Button variant="primary" size="compact" className="h-size-compact w-size-compact p-0 rounded-full bg-primary/10 text-primary border-none hover:bg-primary/20 shadow-none hover:transform-none" asChild>
                            <Link href={`/dc/create?po=${item.po_number}&item=${item.po_item_no}`}>
                                <HugeiconsIcon icon={Plus} className="w-3 h-3" />
                            </Link>
                        </Button>
                    </div>
                    <CellMaterial code={item.material_code} description={item.material_description} cat={item.mtrl_cat} drg={item.drg_no} />
                </div>
            )
        },
        {
            label: "Lot",
            key: "lot_no",
            sortable: true,
            align: "center",
            render: (_val, item) => <span className="typo-body-sm bg-surface-sunken px-2 py-1 rounded">L{item.lot_no}</span>
        },
        {
            label: "Due Date",
            key: "dely_date",
            sortable: true,
            align: "center",
            render: (_val, item) => <CellDate value={item.dely_date} />
        },
        {
            label: "Entry Date",
            key: "entry_allow_date",
            sortable: true,
            align: "center",
            render: (_val, item) => item.entry_allow_date ? <CellDate value={item.entry_allow_date} /> : <span className="typo-body-sm">—</span>
        },
        {
            label: "Ord Qty",
            key: "ord_qty",
            sortable: true,
            align: "right",
            render: (_val, item) => <CellNum value={item.ord_qty} />
        },
        {
            label: "Dsp Qty",
            key: "dsp_qty",
            sortable: true,
            align: "right",
            render: (_val, item) => <CellNum value={item.dsp_qty || 0} />
        },
        {
            label: "Rcd Qty",
            key: "rcd_qty",
            sortable: true,
            align: "right",
            render: (_val, item) => <CellNum value={item.rcd_qty || 0} />
        },
        {
            label: "Bal Qty",
            key: "balance_qty",
            sortable: true,
            align: "right",
            render: (_val, item) => <CellNum value={item.balance_qty} color={item.balance_qty > 0 ? "warning" : "success"} />
        },
        {
            label: "Value",
            key: "item_value",
            sortable: true,
            align: "right",
            render: (_val, item) => <span className="typo-mono-md">{formatIndianCurrency(item.item_value)}</span>
        },
        {
            label: "Days Overdue",
            key: "days_diff",
            sortable: true,
            align: "center",
            render: (_val, item) => (
                item.days_diff != null ? (
                    <span className={cn(item.days_diff < 0 ? "text-error" : item.days_diff > 0 ? "text-warning" : "text-success")}>
                        {item.days_diff < 0 ? `${Math.abs(Math.round(item.days_diff))} days`
                            : item.days_diff > 0 ? `Due in ${Math.round(item.days_diff)} days`
                                : "Today"}
                    </span>
                ) : <span className="text-tertiary">—</span>
            )
        }
    ], []);

    const hasActiveFilters = filters.search || filters.dueDateFrom || filters.dueDateTo ||
        filters.entryDateFrom || filters.entryDateTo || filters.valueMin || filters.valueMax ||
        filters.status !== "all" || filters.smartChips.length > 0;

    return (
        <div className={Layout.colGap}>
            <PageHeader
                title="Delivery Tracker"
                subtitle="Monitor delivery schedules, track overdue items, and manage upcoming due dates"
                action={
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 max-w-md">
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => handleSetSearch(e.target.value)}
                                placeholder="Search POs, materials..."
                                className="w-full h-9 px-4 typo-body-md rounded-lg border border-border bg-surface-sunken focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                            />
                            {searchInput && (
                                <button 
                                    onClick={handleClearSearch} 
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary transition-colors"
                                    title="Clear search"
                                >
                                    <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                }
            />

            {/* Stats Row - Click to filter */}
            <StatCardRow>
                <StatCard
                    title="Overdue"
                    value={fmtNum(data?.metadata.overdue_count ?? 0)}
                    icon={<HugeiconsIcon icon={AlertTriangle} className="w-4 h-4" />}
                    color="error"
                    onClick={() => handleSetStatus("overdue")}
                    isActive={filters.status === "overdue"}
                />
                <StatCard
                    title="Due This Week"
                    value={fmtNum(data?.metadata.due_soon_count ?? 0)}
                    icon={<HugeiconsIcon icon={Clock} className="w-4 h-4" />}
                    color="warning"
                    onClick={() => handleSetStatus("due_soon")}
                    isActive={filters.status === "due_soon"}
                />
                <StatCard
                    title="Due This Month"
                    value={fmtNum(data?.metadata.due_this_month_count ?? 0)}
                    icon={<HugeiconsIcon icon={Calendar} className="w-4 h-4" />}
                    color="primary"
                    onClick={() => handleSetStatus("due_this_month")}
                    isActive={filters.status === "due_this_month"}
                />
                <StatCard
                    title={filters.status === "all" ? "Total Value" : "Filtered Value"}
                    value={formatIndianCurrency(data?.metadata.filtered_value ?? 0)}
                    icon={<HugeiconsIcon icon={TrendingDown} className="w-4 h-4" />}
                    color="primary"
                />
            </StatCardRow>

            {/* Smart Filter Chips */}
            <SmartFilterChips
                chips={[
                    { id: "today", label: "Ship Today", color: "error" },
                    { id: "tomorrow", label: "Tomorrow", color: "warning" },
                    { id: "this_week", label: "This Week", color: "primary" },
                    { id: "next_week", label: "Next Week", color: "default" },
                    { id: "high_value", label: "High Value ₹1L+", color: "success" },
                    { id: "critical_value", label: "Critical ₹10L+", color: "error" },
                ]}
                activeChips={filters.smartChips}
                onToggle={handleChipToggle}
                onClear={handleClearChips}
            />

            {/* Filters -->
            <div className="flex flex-col gap-3 p-3 rounded-lg border border-border bg-surface">
                <div className="flex items-end gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="typo-label-md">Due:</span>
                        <DatePicker value={filters.dueDateFrom} onChange={(val) => updateFilter("dueDateFrom", val)} placeholder="From" className="w-input-xs" />
                        <span className="text-secondary">-</span>
                        <DatePicker value={filters.dueDateTo} onChange={(val) => updateFilter("dueDateTo", val)} placeholder="To" className="w-input-xs" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="typo-label-md">Entry:</span>
                        <DatePicker value={filters.entryDateFrom} onChange={(val) => updateFilter("entryDateFrom", val)} placeholder="From" className="w-input-xs" />
                        <span className="text-secondary">-</span>
                        <DatePicker value={filters.entryDateTo} onChange={(val) => updateFilter("entryDateTo", val)} placeholder="To" className="w-input-xs" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="typo-label-md">Value:</span>
                        <input type="number" value={filters.valueMin} onChange={(e) => updateFilter("valueMin", e.target.value)} placeholder="Min" className="w-20 h-size-sm px-2 py-2 typo-body-md rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                        <span className="text-secondary">-</span>
                        <input type="number" value={filters.valueMax} onChange={(e) => updateFilter("valueMax", e.target.value)} placeholder="Max" className="w-20 h-size-sm px-2 py-2 typo-body-md rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <Button variant="outline" size="sm" onClick={handleClearFilters} disabled={!hasActiveFilters}>
                            <HugeiconsIcon icon={Filter} className="w-4 h-4 mr-1.5" />
                            Clear
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Data Table */}
            <DataTable
                columns={columns as any}
                data={data?.items || []}
                keyField="id"
                loading={isLoading}
                density="compact"
                rowClassName={(item: any) => cn("transition-colors", item.delivery_status === "overdue" && "bg-error/5 hover:bg-error/10")}
                sortKey={filters.sort}
                sortDirection={filters.order.toLowerCase() as "asc" | "desc"}
                onSort={handleSetSort}
                page={filters.page}
                pageSize={filters.limit}
                totalItems={data?.metadata.total_count || 0}
                onPageChange={handleSetPage}
                onPageSizeChange={handleSetLimit}
            />
        </div>
    );
}
