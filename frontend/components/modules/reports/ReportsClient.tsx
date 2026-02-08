"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    DeliveryTruck01Icon as Truck,
    Invoice01Icon as Receipt,
    Analytics01Icon as TrendingUp,
    Alert01Icon as AlertTriangle,
    ActivityIcon as Activity,
    BarChartIcon as BarChart3,
    Download01Icon as FileDown,
    CheckmarkCircle02Icon as CheckCircle2,
    CancelCircleIcon as XCircle,
    Cancel01Icon,
    Search01Icon as Search
} from "@hugeicons/core-free-icons";
import Link from "next/link";

import { Button, Badge, DataTable, DatePicker } from "@/components/common";
import {
    PageHeader,
    StatCard,
    StatCardRow,
    Layout,
    fmtNum,
    ButtonGroup,
} from "@/components/patterns";
import { Input } from "@/components/common/Input";
import { useToast } from "@/components/common/Toast";
import { type Column } from "@/components/common/DataTable";

import { api, type PaginatedResponse } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { useTableState } from "@/hooks/useTableState";

// DateInput component replaced by DatePicker

type ReportType = "pending" | "reconciliation";

interface ReportsClientProps {
    initialData?: PaginatedResponse<any> | null;
}

export function ReportsClient({ initialData }: ReportsClientProps) {
    const { success, error: toastError } = useToast();
    const [activeTab, setActiveTab] = useState<ReportType>("pending");

    const table = useTableState({
        defaultLimit: 10,
        defaultSortBy: activeTab === "pending" ? "description" : "po_number",
        defaultSortOrder: "desc",
        syncUrl: false  // Disable URL sync to prevent flicker on sort/page
    });

    const [data, setData] = useState<PaginatedResponse<any>>(initialData || {
        items: [],
        metadata: { total_count: 0, page: 1, limit: 10 }
    });
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    // Date Management
    const [startDate, setStartDate] = useState<string>(() => {
        return "2020-04-01"; // Defaulting to start of 2020 FY for this dataset
    });
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);

    const queryParams = useMemo(() => ({
        type: activeTab,
        limit: table.limit,
        offset: table.offset,
        sort_by: table.sortBy,
        order: table.sortOrder,
        search: table.search,
        startDate,
        endDate
    }), [activeTab, table.limit, table.offset, table.sortBy, table.sortOrder, table.search, startDate, endDate]);

    const isFirstLoad = useRef(!!initialData);

    // Fetch data whenever table state or dates change
    useEffect(() => {
        // Wait for table state to stabilize
        if (table.isInitialLoading) return;

        // Prevent double fetch on initial load if SSR data provided
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            return;
        }

        const controller = new AbortController();
        const fetchData = async () => {
            try {
                setLoading(true);
                const dateParams = `start_date=${queryParams.startDate}&end_date=${queryParams.endDate}`;

                const result = await api.getReports(queryParams.type as any, dateParams, {
                    limit: queryParams.limit,
                    offset: queryParams.offset,
                    sort_by: queryParams.sort_by,
                    order: queryParams.order,
                    search: queryParams.search,
                    signal: controller.signal
                });

                // Handle both PaginatedResponse and raw array (fallback for legacy endpoints)
                let items = [];
                let total_count = 0;

                if (Array.isArray(result)) {
                    // Client-Side Pagination for Legacy Endpoints (Reconciliation) that return ALL rows
                    total_count = result.length;

                    // Slice the large array to match pagination request prevents DOM overload
                    const start = queryParams.offset;
                    const end = start + queryParams.limit;
                    items = result.slice(start, end);
                } else {
                    items = result.items || [];
                    total_count = result.metadata?.total_count || items.length;
                }

                // Add unique_id for DataTable selection/keys
                const enrichedItems = items.map((item: any, index: number) => ({
                    ...item,
                    unique_id: `${queryParams.type}-${index}-${item.id || item.number || item.po_number || item.dc_number || item.invoice_number || item.month || ""}`,
                }));

                setData({
                    items: enrichedItems,
                    metadata: {
                        total_count,
                        page: (queryParams.offset / queryParams.limit) + 1,
                        limit: queryParams.limit
                    }
                });
            } catch (err: any) {
                if (err.name === 'AbortError') return;
                toastError(String(err.message || err));
                setData({ items: [], metadata: { total_count: 0, page: 1, limit: 10 } });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        return () => controller.abort();
    }, [queryParams, table.isInitialLoading]);

    // Reset selection and table state on tab change
    useEffect(() => {
        setSelectedItems([]);
        table.setPage(1);
        table.setLimit(10);
        table.setSearch("");
    }, [activeTab]);

    const handleRowClick = useCallback((row: any) => {
        const id = row.unique_id;
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const pendingColumns: Column<any>[] = useMemo(() => [
        {
            key: "description",
            label: "Material",
            width: "240px",
            sortable: true,
            render: (_v: any, row: any) => (
                <div className="max-w-[240px]">
                    <span className="typo-body-md truncate block" title={row.description}>
                        {row.description}
                    </span>
                </div>
            ),
        },
        {
            key: "ord_qty",
            label: "Qty",
            width: "80px",
            align: "right",
            sortable: true,
            render: (_v: any, row: any) => (
                <span className="typo-mono-md">{fmtNum(row.ord_qty)}</span>
            ),
        },
        {
            key: "no_of_packets",
            label: "Packets",
            width: "80px",
            align: "right",
            sortable: true,
            render: (_v: any, row: any) => (
                <span className="typo-mono-md">{fmtNum(row.no_of_packets)}</span>
            ),
        },
        {
            key: "po_number",
            label: "PO #",
            width: "120px",
            sortable: true,
            render: (_v: any, row: any) => (
                <Link href={`/po/${row.po_number}`} className="typo-mono-md text-primary hover:underline">
                    {row.po_number}
                </Link>
            ),
        },
        {
            key: "gemc_number",
            label: "GEMC #",
            width: "120px",
            sortable: true,
            render: (_v: any, row: any) => (
                <Badge variant="soft" color="neutral" size="sm" className="typo-mono-md">{row.gemc_number}</Badge>
            ),
        },
        {
            key: "invoice_number",
            label: "Invoice #",
            width: "120px",
            sortable: true,
            render: (_v: any, row: any) => (
                row.invoice_number ? (
                    <Link href={`/invoice/${row.invoice_number}`} className="typo-mono-md text-primary hover:underline">
                        {row.invoice_number}
                    </Link>
                ) : "-"
            ),
        },
        {
            key: "dc_number",
            label: "Challan #",
            width: "120px",
            sortable: true,
            render: (_v: any, row: any) => (
                row.dc_number ? (
                    <Link href={`/dc/${row.dc_number}`} className="typo-mono-md text-primary hover:underline">
                        {row.dc_number}
                    </Link>
                ) : "-"
            ),
        },
        {
            key: "dispatch_delivered",
            label: "Received",
            width: "100px",
            align: "right",
            sortable: true,
            render: (_v: any, row: any) => (
                <span className="typo-mono-md">{fmtNum(row.dispatch_delivered)}</span>
            ),
        },
    ], []);

    const reconciliationColumns: Column<any>[] = useMemo(() => [
        {
            key: "po_number",
            label: "PO Number",
            width: "140px",
            sortable: true,
            render: (_v: any, row: any) => (
                <Link href={`/po/${row.po_number}`} className="typo-mono-md text-primary hover:underline">
                    {row.po_number}
                </Link>
            ),
        },
        {
            key: "item_description",
            label: "Material",
            width: "280px",
            sortable: true,
            render: (_v: any, row: any) => (
                <div className="w-[200px] lg:w-[280px] truncate" title={row.item_description}>
                    <span className="typo-body-md truncate block">{row.item_description}</span>
                </div>
            ),
        },
        {
            key: "ordered_qty",
            label: "Ordered",
            width: "90px",
            align: "right",
            sortable: true,
            render: (_v: any, row: any) => (
                <span className="typo-mono-md">{fmtNum(row.ordered_qty)}</span>
            ),
        },
        {
            key: "total_dispatched",
            label: "Delivered",
            width: "90px",
            align: "right",
            sortable: true,
            render: (_v: any, row: any) => (
                <span className="typo-mono-md">{fmtNum(row.total_dispatched)}</span>
            ),
        },
        {
            key: "total_accepted",
            label: "Received",
            width: "90px",
            align: "right",
            sortable: true,
            render: (_v: any, row: any) => (
                <span className="typo-mono-md">{fmtNum(row.total_accepted)}</span>
            ),
        },
        {
            key: "total_rejected",
            label: "Rejected",
            width: "90px",
            align: "right",
            sortable: true,
            render: (_v: any, row: any) => (
                <span className={cn("typo-mono-md text-right block", row.total_rejected > 0 ? "text-error" : "text-subtle")}>
                    {fmtNum(row.total_rejected)}
                </span>
            ),
        },
    ], []);

    const activeColumns = useMemo(() => {
        if (activeTab === "pending") return pendingColumns;
        if (activeTab === "reconciliation") return reconciliationColumns;
        return [];
    }, [activeTab, pendingColumns, reconciliationColumns]);

    const handleExport = useCallback(async () => {
        setLoading(true);
        try {
            let res;
            if (selectedItems.length > 0) {
                // Export selected items for both tabs
                res = await api.exportSelectedReport(selectedItems, activeTab);
            } else if (activeTab === "pending") {
                const dateParams = `start_date=${startDate}&end_date=${endDate}`;
                res = await api.exportReport("pending", dateParams);
            } else {
                const dateParams = `start_date=${startDate}&end_date=${endDate}`;
                res = await api.exportReport(activeTab, dateParams);
            }

            if (res?.success) {
                success("Export successful", res.message);
                setSelectedItems([]);
            } else if (res) {
                toastError("Export failed", res?.message || "Unknown error");
            }
        } catch (e) {
            // Error handled via UI toast notification
            toastError("Export failed");
        } finally {
            setLoading(false);
        }
    }, [activeTab, startDate, endDate, selectedItems, success, toastError]);

    // Header actions with search, dates, and download
    const headerActions = (
        <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
                <Input
                    type="text"
                    value={table.search}
                    onChange={(e) => table.setSearch(e.target.value)}
                    placeholder="Search report..."
                    className="w-full h-9 px-4 typo-body-md rounded-lg border border-border bg-surface-sunken focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                />
                {table.search && (
                    <button 
                        onClick={() => table.setSearch('')} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary transition-colors"
                        title="Clear search"
                    >
                        <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
                    </button>
                )}
            </div>
            <div className="flex items-center gap-2">
                <DatePicker
                    value={startDate}
                    onChange={(v) => setStartDate(v)}
                    className="w-40"
                />
                <span className="text-subtle typo-body-sm px-1">to</span>
                <DatePicker
                    value={endDate}
                    onChange={(v) => setEndDate(v)}
                    className="w-40"
                />
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="h-8 bg-excel !text-white border-excel hover:bg-excel-hover hover:border-excel-hover"
            >
                <HugeiconsIcon icon={FileDown} className="w-4 h-4 mr-1.5" />
                {selectedItems.length > 0 ? `Download (${selectedItems.length})` : "Download Excel"}
            </Button>
        </div>
    );

    return (
        <div className={Layout.colGap}>
            {/* Header */}
            <PageHeader
                title="Operations Insights"
                subtitle="Historical analysis and reconciliation registers"
                action={headerActions}
            />

            {/* Tabs */}
            <div className="flex items-center gap-3">
                <ButtonGroup
                    options={[
                        { id: "pending", label: "Items Summary" },
                        { id: "reconciliation", label: "Audit Ledger" },
                    ]}
                    value={activeTab}
                    onChange={(v) => setActiveTab(v as ReportType)}
                />
            </div>

            {/* Data Table */}
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <DataTable
                    columns={activeColumns as any}
                    data={data.items}
                    keyField="unique_id"
                    page={table.page}
                    pageSize={table.limit}
                    totalItems={data.metadata.total_count}
                    onPageChange={table.setPage}
                    onPageSizeChange={table.setLimit}
                    sortKey={table.sortBy}
                    sortDirection={table.sortOrder}
                    onSort={table.setSort}
                    loading={loading || table.isTransitioning}
                    selectable={true}
                    selectedRows={selectedItems}
                    onSelectionChange={setSelectedItems}
                    onRowClick={handleRowClick}
                    density="compact"
                    emptyMessage={loading ? "Generating report..." : "No data found for this period"}
                    className="h-full"
                />
            </div>
        </div>
    );
}
