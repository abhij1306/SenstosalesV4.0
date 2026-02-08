"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    PlusSignIcon as Plus,
    Analytics01Icon as TrendingUp,
    Time01Icon as Clock,
    PackageIcon as Boxes,
    Download01Icon as FileDown,
    Money01Icon as IndianRupee,
    Delete02Icon as Trash2,
    File01Icon as FileText,
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

import { Button } from "@/components/common/Button";
import { ActionConfirmationModal } from "@/components/common/ActionConfirmationModal";
import { useToast } from "@/components/common/Toast";
import type { Column } from "@/components/common/DataTable";

import { api, type PaginatedResponse, type InvoiceListItem, type InvoiceStats, downloadFile } from "@/lib/api";
import { cn } from "@/lib/utils";

interface InvoiceListClientProps {
    initialInvoices: PaginatedResponse<InvoiceListItem>;
    initialStats: InvoiceStats | null;
}

export const InvoiceListClient = React.memo(function InvoiceListClient({ initialInvoices }: InvoiceListClientProps) {
    const router = useRouter();
    const { toast } = useToast();

    const [data, setData] = useState<PaginatedResponse<InvoiceListItem>>(initialInvoices);
    const [stats, setStats] = useState<InvoiceStats | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [deleteItem, setDeleteItem] = useState<InvoiceListItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const columns: Column<InvoiceListItem>[] = useMemo(() => [
        {
            key: "invoice_number",
            label: "Invoice #",
            sortable: true,
            width: "120px",
            align: "left",
            render: (_value: string, inv: InvoiceListItem) => (
                <CellRef value={inv.invoice_number} href={`/invoice/${encodeURIComponent(inv.invoice_number)}`} />
            ),
        },
        {
            key: "invoice_date",
            label: "Date",
            sortable: true,
            width: "90px",
            render: (v: string) => <CellDate value={v} />,
        },
        {
            key: "dc_number",
            label: "Linked DCs",
            width: "115px",
            render: (v: string) => (
                <div className="flex flex-wrap gap-1">
                    {String(v) && String(v) !== "null" && String(v) !== "undefined" ? (
                        String(v).split(",").map((dc: string, i: number) => (
                            <CellRef key={i} value={dc.trim()} href={`/dc/${dc.trim()}`} />
                        ))
                    ) : (
                        <span className="typo-body-sm text-tertiary">Direct</span>
                    )}
                </div>
            ),
        },
        {
            key: "po_numbers",
            label: "Linked POs",
            width: "115px",
            render: (v: string) => (
                <div className="flex flex-wrap gap-1">
                    {String(v) && String(v) !== "null" ? (
                        String(v).split(",").map((po: string, i: number) => (
                            <CellRef key={i} value={po.trim()} href={`/po/${po.trim()}`} />
                        ))
                    ) : (
                        <span className="typo-body-sm text-tertiary">Direct</span>
                    )}
                </div>
            ),
        },
        {
            key: "total_items",
            label: "Items",
            width: "55px",
            align: "center",
            render: (v: number) => <CellNum value={Math.round(Number(v) || 0)} />,
        },
        {
            key: "total_dsp_qty",
            label: "Dispatched",
            sortable: true,
            width: "90px",
            align: "right",
            render: (v: number) => <CellNum value={v} />,
        },
        {
            key: "total_invoice_value",
            label: "Value",
            sortable: true,
            align: "right",
            width: "110px",
            render: (v: number) => <CellCurr value={v} />,
        },
        {
            key: "actions" as any,
            label: " ",
            width: "90px",
            align: "right",
            render: (_: unknown, inv: InvoiceListItem) => (
                <div className="flex justify-end gap-1 pr-2">
                    <Button
                        variant="outline"
                        size="compact"
                        onClick={() => handleDownload(inv.invoice_number)}
                        title="Download Invoice"
                        className="text-excel hover:text-excel-hover hover:bg-excel/10"
                    >
                        <HugeiconsIcon icon={FileDown} className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="compact"
                        onClick={() => setDeleteItem(inv)}
                        disabled={Number(inv.total_rcd_qty) > 0}
                        className="text-error hover:text-error hover:bg-error/10 disabled:opacity-50"
                        title="Delete Invoice"
                    >
                        <HugeiconsIcon icon={Trash2} className="w-4 h-4" />
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
        const [result, newStats] = await Promise.all([
            api.listInvoices(params),
            api.getInvoiceStats()
        ]);
        setData(result);
        setStats(newStats);
        return result;
    }, []);

    const handleDelete = async () => {
        if (!deleteItem) return;
        setIsDeleting(true);
        try {
            await api.deleteInvoice(deleteItem.invoice_number);
            setData(prev => ({
                ...prev,
                items: prev.items.filter(item => item.invoice_number !== deleteItem.invoice_number),
                metadata: {
                    ...prev.metadata,
                    total_count: prev.metadata.total_count - 1
                }
            }));
            toast("Invoice deleted", `Invoice ${deleteItem.invoice_number} has been deleted successfully.`, "success");
            setDeleteItem(null);
        } catch (error) {
            toast("Delete failed", error instanceof Error ? error.message : "Failed to delete invoice", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDownload = async (invoiceNumber: string) => {
        try {
            toast("Downloading...", "Starting download...", "info");
            const result = await downloadFile(`/api/invoice/${invoiceNumber}/download`, `Invoice_${invoiceNumber}.xlsx`);
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
            const result = await api.exportListInvoices();
            if (result.success) {
                toast("Export Successful", result.message || "Invoice list exported successfully", "success");
            } else {
                toast("Export Failed", result.message || "Failed to export invoice list", "error");
            }
        } catch (e) {
            toast("Export Error", e instanceof Error ? e.message : "An unexpected error occurred", "error");
        } finally {
            setIsExporting(false);
        }
    }, [toast]);

    const statsSection = (
        <StatCardRow>
            <StatCard
                title="Total Invoices"
                value={fmtNum(data?.metadata?.total_count || 0)}
                icon={<HugeiconsIcon icon={Boxes} className="w-4 h-4" />}
                color="primary"
            />
            <StatCard
                title="Revenue Confirmed"
                value={fmtCurr(data?.metadata?.total_value || 0)}
                icon={<HugeiconsIcon icon={IndianRupee} className="w-4 h-4" />}
                color="success"
            />
            <StatCard
                title="Taxable Value"
                value={fmtCurr(data?.metadata?.total_taxable || 0)}
                icon={<HugeiconsIcon icon={Clock} className="w-4 h-4" />}
                color="warning"
            />
            <StatCard
                title="Tax Liability (GST)"
                value={fmtCurr((data?.metadata?.total_taxable || 0) * 0.18)}
                icon={<HugeiconsIcon icon={TrendingUp} className="w-4 h-4" />}
                color="error"
            />
        </StatCardRow>
    );

    return (
        <>
            <ListView
                title="GST Invoices"
                subtitle="Manage billing documentation and tax compliance"
                initialData={initialInvoices}
                fetchData={fetchData}
                columns={columns}
                keyField="invoice_number"
                defaultSortBy="invoice_date"
                defaultSortOrder="desc"
                searchPlaceholder="Search invoices or GSTIN..."
                stats={statsSection}
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
                        <Button size="compact" onClick={() => router.push("/invoice/create")}>
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
                title="Delete Invoice?"
                warningText={`Are you sure you want to delete Invoice #${deleteItem?.invoice_number}? This action cannot be undone.`}
                confirmLabel="Delete Invoice"
                variant="danger"
                isLoading={isDeleting}
            />
        </>
    );
});
