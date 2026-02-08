"use client";

import React, { useState, useMemo } from "react";
import { Button, Badge } from "@/components/common";
import {
    Layout,
    fmtNum,
    ListView,
} from "@/components/patterns";
import { cn } from "@/lib/utils";
import { api, type PaginatedResponse } from "@/lib/api";
import { HugeiconsIcon } from "@hugeicons/react";
import { ReloadIcon as RefreshCw, ViewIcon as Eye, Time01Icon as History, Search01Icon as Search } from "@hugeicons/core-free-icons";
import { format } from "date-fns";
import { type Column } from "@/components/common/DataTable";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/common/Dialog";

export function LogsClient() {
    const [data, setData] = useState<PaginatedResponse<any>>({
        items: [],
        metadata: { total_count: 0, page: 1, limit: 10 }
    });
    const [category, setCategory] = useState<string>("ALL");
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [selectedLog, setSelectedLog] = useState<any>(null);

    // Fetch categories on mount
    React.useEffect(() => {
        const fetchCategories = async () => {
            try {
                const cats = await api.getLogClasses();
                setAvailableCategories(cats || []);
            } catch (err) {
                console.error("Failed to fetch categories", err);
            }
        };
        fetchCategories();
    }, []);

    const columns: Column<any>[] = useMemo(() => [
        {
            key: "timestamp",
            label: "Timestamp",
            sortable: true,
            width: "160px",
            render: (v: any) => (
                <span className="typo-mono-md">
                    {format(new Date(v), "yyyy-MM-dd HH:mm:ss")}
                </span>
            )
        },
        {
            key: "category",
            label: "Module",
            sortable: false,
            width: "120px",
            render: (v: any, row: any) => {
                const variant = row.severity === 'HIGH' || row.severity === 'CRITICAL' || v === 'System Errors'
                    ? 'error'
                    : v === 'Dispatch (DC)' ? 'success'
                        : v === 'Invoicing' ? 'warning'
                            : v === 'Receipts (SRV)' ? 'info'
                                : 'outline';
                return (
                    <Badge variant={variant as any} className="typo-label-md">
                        {v || "Other"}
                    </Badge>
                );
            }
        },
        {
            key: "event_class",
            label: "Event",
            sortable: true,
            width: "140px",
            render: (v: any) => (
                <span className="typo-mono-md">{v}</span>
            )
        },
        {
            key: "module_path",
            label: "Path",
            sortable: true,
            width: "160px",
            render: (v: any) => (
                <span className="typo-mono-md truncate block" title={v}>
                    {v}
                </span>
            )
        },
        {
            key: "entity_id",
            label: "Entity",
            sortable: true,
            width: "120px",
            render: (v: any) => (
                <span className="typo-mono-md">{v || "--"}</span>
            )
        },
        {
            key: "actions" as any,
            label: "",
            width: "60px",
            align: "center",
            render: (_: any, log: any) => (
                <Button
                    variant="ghost"
                    size="compact"
                    onClick={() => setSelectedLog(log)}
                    className="h-7 w-7 p-0"
                    aria-label="View log details"
                >
                    <HugeiconsIcon icon={Eye} className="w-4 h-4 text-subtle" />
                </Button>
            )
        }
    ], []);

    const fetchData = useMemo(() => async (params: {
        limit: number;
        offset: number;
        sort_by: string;
        order: "asc" | "desc";
        search: string;
    }) => {
        const res = await api.listLogs({
            ...params,
            category: category === "ALL" ? undefined : category,
        });
        setData(res);
        return res;
    }, [category]);

    const customToolbar = (
        <div className="flex items-center gap-2">
            <div className="relative">
                <HugeiconsIcon icon={History} className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={cn(
                        "h-9 pl-8 pr-4 typo-body-md rounded-md border border-border bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors appearance-none w-40"
                    )}
                >
                    <option value="ALL">All Categories</option>
                    {availableCategories.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
                <HugeiconsIcon icon={RefreshCw} className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle pointer-events-none rotate-90" />
            </div>

            <Button
                variant="outline"
                size="compact"
                onClick={() => fetchData({ limit: 10, offset: 0, sort_by: "timestamp", order: "desc", search: "" })}
                className="h-9 px-2"
                aria-label="Refresh logs"
            >
                <HugeiconsIcon icon={RefreshCw} className="w-4 h-4" />
            </Button>
        </div>
    );

    return (
        <div className={cn("h-full flex flex-col", Layout.colGap)}>
            <ListView
                title="System Audit Ledger"
                subtitle="Unified diagnostic trail for system events"
                initialData={data}
                fetchData={fetchData}
                columns={columns}
                keyField="uuid"
                defaultSortBy="timestamp"
                defaultSortOrder="desc"
                searchPlaceholder="Search audit trail..."
                customToolbar={customToolbar}
            />

            {/* Detail Dialog */}
            <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <DialogContent className="max-w-2xl bg-surface border-border p-0 gap-0">
                    <DialogHeader className={cn("px-4 py-3 border-b border-border flex items-center gap-2")}>
                        <HugeiconsIcon icon={History} className="w-4 h-4 text-primary" />
                        <DialogTitle className="typo-title-md">Log Details</DialogTitle>
                        <DialogDescription className="sr-only">
                            Detailed view of log entry with event information and payload data
                        </DialogDescription>
                    </DialogHeader>
                    {selectedLog && (
                        <div className={cn("flex flex-col gap-3 p-4")}>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <p className="typo-label-sm">Event UUID</p>
                                    <p className="typo-body-sm typo-mono-md">{selectedLog.uuid}</p>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="typo-label-sm">Timestamp</p>
                                    <p className="typo-body-md">{format(new Date(selectedLog.timestamp), "PPP p")}</p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="typo-label-sm">Payload</p>
                                <pre className={cn(
                                    "p-3 bg-surface-sunken border border-border rounded overflow-auto max-h-64",
                                    "typo-body-sm typo-mono-md"
                                )}>
                                    {JSON.stringify(selectedLog.payload, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
