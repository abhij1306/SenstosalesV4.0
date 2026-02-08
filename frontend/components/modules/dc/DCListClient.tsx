"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    PlusSignIcon as Plus,
    Delete02Icon as Trash2,
    Activity01Icon as Activity,
    PackageDeliveredIcon as PackageCheck,
    DeliveryTruck02Icon as Ship,
    DeliveryTruck01Icon as Truck,
    Download01Icon as FileDown,
} from "@hugeicons/core-free-icons";

import {
    StatCard,
    StatCardRow,
    Layout,
    fmtNum,
    fmtCurr,
    ListView,
} from "@/components/patterns";
import {
    CellRef,
    CellDate,
    CellNum,
    CellCurr,
} from "@/components/ui/table";

import { Button } from "@/components/common";
import { ActionConfirmationModal } from "@/components/common/ActionConfirmationModal";
import { useToast } from "@/components/common/Toast";
import type { Column } from "@/components/common/DataTable";

import { api, type DCListItem, type DCStats, type PaginatedResponse, downloadFile } from "@/lib/api";

interface DCListClientProps {
    initialDCs: PaginatedResponse<DCListItem>;
    initialStats: DCStats | null;
}

export const DCListClient = React.memo(function DCListClient({ initialDCs }: DCListClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    
    const [data, setData] = useState<PaginatedResponse<DCListItem>>(initialDCs);
    const [isExporting, setIsExporting] = useState(false);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [deleteItem, setDeleteItem] = useState<DCListItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const columns: Column<DCListItem>[] = useMemo(() => [
        {
            key: "dc_number",
            label: "Challan #",
            sortable: true,
            width: "120px",
            align: "left",
            render: (_value: string | number, dc: DCListItem) => (
                <div className="flex items-center justify-between w-full gap-2">
                    <CellRef value={dc.dc_number} href={`/dc/${encodeURIComponent(dc.dc_number)}`} />
                    {!dc.invoice_number && (
                        <Button
                            asChild
                            variant="outline"
                            size="compact"
                            title="Generate Invoice"
                            className="text-primary hover:text-primary-hover hover:bg-primary/10 px-1.5 h-7"
                        >
                            <Link href={`/invoice/create?dc=${encodeURIComponent(dc.dc_number)}`}>
                                <HugeiconsIcon icon={Plus} className="w-4 h-4" />
                            </Link>
                        </Button>
                    )}
                </div>
            ),
        },
        {
            key: "dc_date",
            label: "Date",
            sortable: true,
            width: "90px",
            render: (v: string) => <CellDate value={v} />,
        },
        {
            key: "po_number",
            label: "Linked PO",
            sortable: true,
            width: "110px",
            align: "right",
            render: (v: string) => (
                v ? <CellRef value={String(v)} href={`/po/${v}`} /> : <span className="typo-body-sm text-tertiary">—</span>
            ),
        },
        {
            key: "total_ord_qty",
            label: "Ordered",
            align: "right",
            sortable: true,
            width: "80px",
            render: (v: number) => <CellNum value={v} />,
        },
        {
            key: "total_dsp_qty",
            label: "Dispatched",
            align: "right",
            sortable: true,
            width: "90px",
            render: (v: number) => <CellNum value={v} />,
        },
        {
            key: "total_rcd_qty",
            label: "Received",
            align: "right",
            sortable: true,
            width: "80px",
            render: (v: number) => <CellNum value={v} />,
        },
        {
            key: "total_value",
            label: "Value",
            align: "right",
            sortable: true,
            width: "110px",
            render: (v: number) => <CellCurr value={v} />,
        },
        {
            key: "actions" as keyof DCListItem,
            label: " ",
            width: "100px",
            align: "right",
            render: (_: unknown, dc: DCListItem) => (
                <div className="flex justify-end gap-1 pr-2">
                    {!dc.invoice_number && (
                        <Button
                            variant="outline"
                            size="compact"
                            onClick={() => setDeleteItem(dc)}
                            disabled={Number(dc.total_rcd_qty) > 0}
                            className="text-error hover:text-error hover:bg-error/10 disabled:opacity-50"
                            title="Delete Challan"
                        >
                            <HugeiconsIcon icon={Trash2} className="w-4 h-4" />
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="compact"
                        onClick={() => handleDownload(dc.dc_number)}
                        title="Download Challan"
                        className="text-excel hover:text-excel-hover hover:bg-excel/10"
                    >
                        <HugeiconsIcon icon={FileDown} className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ], []);

    const fetchData = useMemo(() => async (params: {
        limit: number;
        offset: number;
        sort_by: string;
        order: "asc" | "desc";
        search: string;
    }) => {
        const result = await api.listDCs(params);
        setData(result);
        return result;
    }, []);

    const handleDelete = async () => {
        if (!deleteItem) return;
        setIsDeleting(true);
        try {
            await api.deleteDC(deleteItem.dc_number);
            toast("Challan deleted", `DC ${deleteItem.dc_number} has been deleted successfully.`, "success");
            setDeleteItem(null);
            router.refresh();
        } catch (error) {
            toast("Delete failed", error instanceof Error ? error.message : "Failed to delete challan", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDownload = async (dcNumber: string) => {
        try {
            toast("Downloading...", "Starting download...", "info");
            const result = await downloadFile(`/api/dc/${dcNumber}/download`, `DC_${dcNumber}.xlsx`);
            if (result.success && result.message) {
                toast("Download Complete", result.message, "success");
            } else if (!result.success) {
                toast("Download Failed", result.message || "Unknown error", "error");
            }
        } catch (e) {
            toast("Error", e instanceof Error ? e.message : "Unknown error", "error");
        }
    };

    const handleExportExcel = useCallback(async () => {
        setIsExporting(true);
        try {
            const result = await api.exportListDCs();
            if (result.success) {
                toast("Export Successful", result.message || "DC list exported successfully", "success");
            } else {
                toast("Export Failed", result.message || "Failed to export DC list", "error");
            }
        } catch (e) {
            toast("Export Error", e instanceof Error ? e.message : "An unexpected error occurred", "error");
        } finally {
            setIsExporting(false);
        }
    }, [toast]);

    const stats = (
        <StatCardRow>
            <StatCard
                title="Active Shipments"
                value={fmtNum(data?.metadata?.total_count || 0)}
                icon={<HugeiconsIcon icon={Ship} className="w-4 h-4" />}
                color="primary"
            />
            <StatCard
                title="Total Dispatched"
                value={fmtNum(data?.metadata?.total_shipped || 0)}
                icon={<HugeiconsIcon icon={Activity} className="w-4 h-4" />}
                color="warning"
            />
            <StatCard
                title="Total Value"
                value={fmtCurr(data?.metadata?.total_value || 0)}
                icon={<HugeiconsIcon icon={PackageCheck} className="w-4 h-4" />}
                color="success"
            />
            <StatCard
                title="Total Received"
                value={fmtNum(data?.metadata?.total_received || 0)}
                icon={<HugeiconsIcon icon={PackageCheck} className="w-4 h-4" />}
                color="success"
            />
        </StatCardRow>
    );

    return (
        <>
            <ListView
                title="Delivery Challans"
                subtitle="Manage and track all delivery documentation"
                initialData={initialDCs}
                fetchData={fetchData}
                columns={columns}
                keyField="dc_number"
                defaultSortBy="dc_date"
                defaultSortOrder="desc"
                searchPlaceholder="Search DCs, Suppliers or PO Ref..."
                stats={stats}
                selectable={true}
                selectedRows={selectedRows}
                onSelectionChange={setSelectedRows}
                customToolbar={
                    <>
                        <Button
                            variant="outline"
                            size="compact"
                            onClick={handleExportExcel}
                            disabled={isExporting}
                            className="bg-excel !text-white border-excel hover:bg-excel-hover hover:border-excel-hover"
                        >
                            <HugeiconsIcon icon={FileDown} className={cn("w-4 h-4", isExporting && "animate-spin")} />
                            <span className="hidden sm:inline">{selectedRows.length > 0 ? `Download (${selectedRows.length})` : "Download"}</span>
                        </Button>
                        <Button size="compact" onClick={() => router.push("/dc/create")}>
                            <HugeiconsIcon icon={Plus} className="w-4 h-4" />
                            <span className="hidden sm:inline">Create</span>
                        </Button>
                    </>
                }
            />

            <ActionConfirmationModal
                isOpen={!!deleteItem}
                onClose={() => setDeleteItem(null)}
                onConfirm={handleDelete}
                title="Delete Delivery Challan?"
                warningText={`Are you sure you want to delete DC #${deleteItem?.dc_number}? This action cannot be undone.`}
                confirmLabel="Delete Challan"
                variant="danger"
                isLoading={isDeleting}
            />
        </>
    );
});

// Need to import cn for the className in export button
import { cn } from "@/lib/utils";
