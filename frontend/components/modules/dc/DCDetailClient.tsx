"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    FloppyDiskIcon as Save,
    Cancel01Icon as X,
    PencilEdit02Icon as Edit,
    DeliveryTruck01Icon as Truck,
    PlusSignIcon as Plus,
    Download01Icon as FileDown,
    Delete02Icon as Trash2,
} from "@hugeicons/core-free-icons";
import { api } from "@/lib/api";
import { Button, ActionConfirmationModal, useToast } from "@/components/common/index";
import { PageHeader, Layout, fmtNum, fmtCurr } from "@/components/patterns";
import {
    InfoSection,
    InfoGrid,
    InfoItem,
    EditableInfoItem,
    TableSection,
    TableHeader,
    TableCell,
    StatusBadge,
    LineItemsHeader,
} from "@/components/patterns/detail";
import {
    CellNum,
    CellCurr,
    CellMaterial,
    CellText,
    CellUnit
} from "@/components/ui/table";

import { DCDetail } from "@/types";
import { useDCStore } from "@/store/dcStore";

interface DCDetailClientProps {
    initialData: DCDetail;
    initialInvoiceData: { has_invoice: boolean; invoice_number?: string } | null;
}

// Progress bar for DC fulfillment
const DCProgress = ({
    dispatched,
    received
}: {
    dispatched: number;
    received: number;
}) => {
    const receivedPct = dispatched > 0 ? Math.round((received / dispatched) * 100) : 0;

    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 min-w-36">
                <div className="flex-1 h-2 bg-surface-sunken rounded-full overflow-hidden">
                    <div
                        className="h-full bg-success"
                        style={{ width: `${receivedPct}%` }}
                    />
                </div>
            </div>
            <div className="flex items-center gap-3 typo-body-sm">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-secondary">{fmtNum(dispatched)} Dispatched</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-secondary">{fmtNum(received)} Received ({receivedPct}%)</span>
                </div>
            </div>
        </div>
    );
};

export function DCDetailClient({ initialData, initialInvoiceData }: DCDetailClientProps) {
    const router = useRouter();
    const { data, setDC, updateHeader } = useDCStore();
    const { toast } = useToast();
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [editData, setEditData] = React.useState<any>(null);

    const hasHydratedRef = React.useRef(false);
    useEffect(() => {
        if (initialData && !hasHydratedRef.current) {
            hasHydratedRef.current = true;
            setDC(initialData);
        }
    }, []);

    const displayData = data?.header ? data : initialData;

    if (!displayData?.header) return <div className="p-8 text-center text-subtle">Loading...</div>;

    const h = displayData.header;
    const items = displayData.items || [];

    const hasInvoice = h?.invoice_number ? true : (initialInvoiceData?.has_invoice || false);
    const invoiceNumber = h?.invoice_number || initialInvoiceData?.invoice_number || null;

    // Calculate totals
    const { totalDispatched, totalReceived, totalValue } = useMemo(() => {
        return items.reduce((acc: any, item: any) => ({
            totalDispatched: acc.totalDispatched + (item.dsp_qty || 0),
            totalReceived: acc.totalReceived + (item.rcd_qty || 0),
            totalValue: acc.totalValue + ((item.dsp_qty || 0) * (item.po_rate || 0)),
        }), { totalDispatched: 0, totalReceived: 0, totalValue: 0 });
    }, [items]);

    const startEditing = () => {
        setEditData({ ...h });
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        if (!h) return;
        setIsSaving(true);
        try {
            await api.updateDCMetadata(h.dc_number, editData);
            toast("Updated", `DC ${h.dc_number} updated`, "success");
            setIsEditing(false);
            setDC({ ...displayData, header: editData });
            router.refresh();
        } catch (e) {
            toast("Failed", e instanceof Error ? e.message : "Error", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const result = await api.downloadDC(h.dc_number);
            if (result.success) {
                toast("Downloaded", "DC downloaded", "success");
            } else {
                toast("Failed", result.message || "Error", "error");
            }
        } catch (e: any) {
            toast("Error", e.message, "error");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await api.deleteDC(h.dc_number);
            toast("Deleted", `DC ${h.dc_number} deleted`, "success");
            router.push("/dc");
        } catch (error) {
            toast("Failed", error instanceof Error ? error.message : "Error", "error");
            setShowDeleteModal(false);
        } finally {
            setIsDeleting(false);
        }
    };

    // Header actions
    const headerActions = (
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
                className="bg-excel !text-white border-excel hover:bg-excel-hover hover:border-excel-hover"
            >
                <HugeiconsIcon icon={FileDown} className="w-4 h-4 mr-1" />
                {isDownloading ? "..." : "Download"}
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                    try {
                        const result = await api.downloadGC(h.dc_number);
                        if (result.success) toast("Success", "GC Downloaded", "success");
                        else toast("Error", result.message || "Failed", "error");
                    } catch (e) { toast("Error", "Failed", "error"); }
                }}
                className="bg-excel !text-white border-excel hover:bg-excel-hover hover:border-excel-hover"
            >
                <HugeiconsIcon icon={FileDown} className="w-4 h-4 mr-1.5" />
                GC
            </Button>
            {isEditing ? (
                <>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
                        <HugeiconsIcon icon={X} className="w-4 h-4 mr-1" />
                        Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                        <HugeiconsIcon icon={Save} className="w-4 h-4 mr-1" />
                        {isSaving ? "..." : "Save"}
                    </Button>
                </>
            ) : (
                <>
                    <Button variant="outline" size="sm" onClick={startEditing}>
                        <HugeiconsIcon icon={Edit} className="w-4 h-4 mr-1" />
                        Edit
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        disabled={hasInvoice}
                        onClick={() => router.push(`/invoice/create?dc=${h.dc_number}`)}
                    >
                        <HugeiconsIcon icon={Plus} className="w-4 h-4 mr-1" />
                        Create Invoice
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteModal(true)}
                        className="text-error hover:bg-error/10"
                        disabled={hasInvoice}
                    >
                        <HugeiconsIcon icon={Trash2} className="w-4 h-4" />
                    </Button>
                </>
            )}
        </div>
    );

    const header = isEditing ? editData : h;

    return (
        <div className={Layout.colGap}>
            {/* Header with progress */}
            <PageHeader
                title={h.dc_number}
                subtitle={
                    <DCProgress
                        dispatched={totalDispatched}
                        received={totalReceived}
                    />
                }
                onBack={() => router.push("/dc")}
                action={headerActions}
            />

            {/* DC Info */}
            <InfoSection title={`Challan Details • ${items.length} items • Value: ${fmtCurr(totalValue)}`}>
                <InfoGrid columns={4}>
                    <InfoItem label="DC Number" value={header.dc_number} />
                    <InfoItem label="DC Date" value={header.dc_date} />
                    <InfoItem label="PO Reference" value={h.po_number} href={`/po/${h.po_number}`} />
                    <EditableInfoItem
                        label="Department"
                        value={header.department_no}
                        editable={isEditing}
                        onChange={(v) => setEditData({ ...editData, department_no: v })}
                    />
                    <EditableInfoItem
                        label="GC Number"
                        value={header.gc_number || header.dc_number}
                        editable={isEditing}
                        onChange={(v) => setEditData({ ...editData, gc_number: v })}
                    />
                    {isEditing ? (
                        <div>
                            <div className="typo-body-sm mb-1">GC Date</div>
                            <input
                                type="date"
                                value={editData.gc_date || ""}
                                onChange={(e) => setEditData({ ...editData, gc_date: e.target.value })}
                                className="h-8 w-full px-2 py-1 typo-body bg-surface border border-border rounded"
                            />
                        </div>
                    ) : (
                        <InfoItem label="GC Date" value={header.gc_date || header.dc_date} />
                    )}
                    <div>
                        <div className="typo-body-sm mb-1">Invoice Status</div>
                        <div className="typo-body-md">
                            {hasInvoice ? (
                                <StatusBadge status="Created" href={`/invoice/${invoiceNumber}`} />
                            ) : (
                                <StatusBadge status="Pending" />
                            )}
                        </div>
                    </div>
                    <EditableInfoItem
                        label="Our Ref"
                        value={header.our_ref}
                        editable={isEditing}
                        onChange={(v) => setEditData({ ...editData, our_ref: v })}
                    />
                    <EditableInfoItem
                        label="Consignee"
                        value={header.consignee_name}
                        className="col-span-2"
                        editable={isEditing}
                        onChange={(v) => setEditData({ ...editData, consignee_name: v })}
                    />
                    <div className="col-span-2">
                        <div className="typo-body-sm mb-1">Consignee Address</div>
                        {isEditing ? (
                            <textarea
                                value={editData.consignee_address || ""}
                                onChange={(e) => setEditData({ ...editData, consignee_address: e.target.value })}
                                className="w-full px-2 py-1 typo-body bg-surface border border-border rounded min-h-8"
                            />
                        ) : (
                            <div className="typo-body-md">{header.consignee_address || "—"}</div>
                        )}
                    </div>
                </InfoGrid>
            </InfoSection>

            {/* Items Table */}
            <TableSection
                title={<LineItemsHeader counts={[
                    { label: 'Dispatched', value: totalDispatched },
                    { label: 'Received', value: totalReceived },
                ]} />}
            >
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-surface-sunken/50 border-b border-border">
                            <TableHeader align="center" className="w-15">Item</TableHeader>
                            <TableHeader>Material</TableHeader>
                            <TableHeader align="center" className="w-col-unit">Unit</TableHeader>
                            <TableHeader align="right" className="w-col-qty">Qty</TableHeader>
                            <TableHeader align="right" className="w-col-rate">Rate</TableHeader>
                            <TableHeader align="right" className="w-col-value">Value</TableHeader>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b border-border/40 hover:bg-surface-sunken/30">
                                <td className="py-2 px-3 text-center w-col-row-num">
                                    <CellText align="center" value={item.po_item_no?.toString() || "—"} />
                                </td>
                                <td className="py-2 px-3">
                                    <CellMaterial
                                        code={item.material_code}
                                        description={item.material_description || item.description || "—"}
                                        drg={item.drg_no}
                                        cat={item.mtrl_cat}
                                    />
                                </td>
                                <td className="py-2 px-3 w-col-unit">
                                    <CellUnit value={item.unit} />
                                </td>
                                <td className="py-2 px-3 text-right w-col-qty">
                                    <CellNum value={item.dsp_qty || 0} />
                                </td>
                                <td className="py-2 px-3 text-right w-col-qty">
                                    <CellCurr value={item.po_rate || 0} />
                                </td>
                                <td className="py-2 px-3 text-right w-col-value">
                                    <CellCurr value={(item.dsp_qty || 0) * (item.po_rate || 0)} className="typo-body-md" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableSection>

            {/* Notes / Remarks */}
            <InfoSection title="Notes / Remarks">
                <div className="space-y-2">
                    {/* Auto-generated: GC Note */}
                    <div className="py-2 px-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <span className="typo-body-sm text-primary mr-2">GC</span>
                        <span className="typo-body text-foreground">
                            Guarantee Certificate No. {h.gc_number || h.dc_number} Dt. {h.gc_date || h.dc_date}
                        </span>
                    </div>

                    {/* Auto-generated: Consignment Value Note */}
                    <div className="py-2 px-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <span className="typo-body-sm text-primary mr-2">VAL</span>
                        <span className="typo-body text-foreground">
                            Consignment Value of DC {fmtCurr(totalValue)}
                        </span>
                    </div>

                    {/* User-added notes */}
                    {h.remarks && h.remarks.split("\n\n").map((note: string, idx: number) => (
                        <div key={idx} className="py-2 px-3 bg-surface-sunken/30 rounded-lg">
                            <span className="typo-body text-muted">{note}</span>
                        </div>
                    ))}
                </div>
            </InfoSection>

            <ActionConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Delivery Challan?"
                warningText={`Delete DC #${h.dc_number}? This cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    );
}
