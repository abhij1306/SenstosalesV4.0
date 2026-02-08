"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon as FileDown, Invoice01Icon as Receipt, Delete02Icon as Trash2, PencilEdit02Icon as Edit, FloppyDiskIcon as Save, Cancel01Icon as X } from "@hugeicons/core-free-icons";
import { Button, ActionConfirmationModal, useToast, DatePicker } from "@/components/common/index";
import { api } from "@/lib/api";
import { useInvoiceStore } from "@/store/invoiceStore";
import { InvoiceDetail, InvoiceHeader } from "@/types";
import { PageHeader, Layout, fmtNum, fmtCurr, fmtDate } from "@/components/patterns";
import {
    TableSection,
    TableHeader,
    InfoSection,
    InfoGrid,
    InfoItem,
    EditableInfoItem,
    LineItemsHeader,
} from "@/components/patterns/detail";
import {
    CellText,
    CellNum,
    CellCurr,
    CellUnit,
    CellMaterial,
} from "@/components/ui/table";
import { amountInWords } from "@/lib/utils";

interface InvoiceDetailClientProps {
    data: InvoiceDetail;
}

export const InvoiceDetailClient = React.memo(({ data: initialData }: InvoiceDetailClientProps) => {
    const router = useRouter();
    const { data, setInvoice } = useInvoiceStore();
    const { toast } = useToast();
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [editData, setEditData] = React.useState<any>(null);
    const [companySettings, setCompanySettings] = React.useState<any>(null);

    const startEditing = () => {
        if (!data?.header) return;
        setEditData({ ...data.header });
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        if (!data?.header || !data) return;
        const h = data.header;
        setIsSaving(true);
        try {
            await api.updateInvoice(h.invoice_number, editData);
            toast("Updated", `Invoice ${h.invoice_number} updated`, "success");
            setIsEditing(false);
            setInvoice({ ...data, header: editData });
            router.refresh();
        } catch (e) {
            toast("Failed", e instanceof Error ? e.message : "Unknown error", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownload = async () => {
        if (!data?.header) return;
        const h = data.header;
        setIsDownloading(true);
        try {
            const result = await api.downloadInvoice(h.invoice_number);
            if (result.success) {
                toast("Downloaded", "Invoice downloaded", "success");
            } else {
                toast("Failed", result.message || "Error", "error");
            }
        } catch (e) {
            toast("Error", e instanceof Error ? e.message : "Unknown error", "error");
        } finally {
            setIsDownloading(false);
        }
    };

    const hasHydratedRef = React.useRef(false);
    useEffect(() => {
        if (initialData && !hasHydratedRef.current) {
            hasHydratedRef.current = true;
            setInvoice(initialData);
        }
        api.getSettings().then(setCompanySettings).catch(() => { });
    }, []);

    if (!data?.header) return null;
    const h = data.header;
    const items = data.items || [];

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await api.deleteInvoice(h.invoice_number);
            toast("Deleted", `Invoice ${h.invoice_number} deleted`, "success");
            router.push("/invoice");
        } catch (error) {
            toast("Failed", error instanceof Error ? error.message : "Unknown error", "error");
            setShowDeleteModal(false);
        } finally {
            setIsDeleting(false);
        }
    };

    // Calculate totals
    const taxableValue = items.reduce((sum, item) => sum + (item.taxable_value || 0), 0);
    const cgstTotal = items.reduce((sum, item) => sum + (item.cgst_amount || 0), 0);
    const sgstTotal = items.reduce((sum, item) => sum + (item.sgst_amount || 0), 0);
    const totalValue = taxableValue + cgstTotal + sgstTotal;

    // Header actions
    const headerActions = (
        <div className="flex items-center gap-2">
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
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={isDownloading} className="bg-excel !text-white border-excel hover:bg-excel-hover hover:border-excel-hover">
                        <HugeiconsIcon icon={FileDown} className="w-4 h-4 mr-1" />
                        {isDownloading ? "..." : "Download"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={startEditing}>
                        <HugeiconsIcon icon={Edit} className="w-4 h-4 mr-1" />
                        Edit
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteModal(true)}
                        className="text-error hover:bg-error/10"
                    >
                        <HugeiconsIcon icon={Trash2} className="w-4 h-4" />
                    </Button>
                </>
            )}
        </div>
    );

    const header = isEditing ? editData : h;
    const supplierName = header.supplier_name || companySettings?.supplier_name || "—";
    const supplierAddress = header.supplier_address || companySettings?.supplier_address || "—";
    const supplierGstin = header.supplier_gstin || companySettings?.supplier_gstin || "—";
    const supplierContact = header.supplier_contact || companySettings?.supplier_contact || "—";

    return (
        <div className={Layout.colGap}>
            {/* Header */}
            <PageHeader
                title={h.invoice_number}
                subtitle={
                    <div className="flex items-center gap-2">
                        <span>DC: <Link href={`/dc/${h.dc_number}`} className="text-primary hover:underline">{h.dc_number}</Link></span>
                        <span className="text-subtle">•</span>
                        <span>{items.length} items • {fmtCurr(totalValue)}</span>
                    </div>
                }
                onBack={() => router.push("/invoice")}
                action={headerActions}
            />

            {/* Invoice Sheet Layout */}
            <InfoSection
                title="Invoice Details"
                className="overflow-hidden"
            >
                {/* Header Grid: Supplier/Buyer (Left) + Logistics (Right) */}
                <div className="grid grid-cols-12">
                    {/* LEFT: Supplier & Buyer - Compact Design */}
                    <div className="col-span-4 flex flex-col border-r border-border">
                        {/* Supplier */}
                        <div className="p-2 space-y-2 border-b border-border bg-gradient-to-br from-surface-sunken/30 to-surface-sunken/10">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-3.5 bg-primary rounded-full" />
                                <span className="typo-label-md">Supplier Details</span>
                            </div>
                            <div className="space-y-1.5 pl-3">
                                <div className="typo-headline-sm">{supplierName}</div>
                                <div className="typo-body-sm text-muted leading-snug whitespace-pre-wrap">{supplierAddress}</div>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 typo-body-sm text-subtle">
                                    <span className="inline-flex items-center gap-1">
                                        <span className="typo-label-md">GSTIN:</span>
                                        <span className="typo-mono-md">{supplierGstin}</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="typo-label-md">TEL:</span>
                                        <span>{supplierContact}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* Buyer */}
                        <div className="p-2 space-y-2 flex-1 bg-gradient-to-br from-surface to-surface-sunken/5">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-3.5 bg-secondary rounded-full" />
                                <span className="typo-label-md">Billed To (Buyer)</span>
                            </div>
                            {isEditing ? (
                                <div className="space-y-2 pl-3">
                                    <input
                                        type="text"
                                        value={editData.buyer_name || ""}
                                        onChange={(e) => setEditData({ ...editData, buyer_name: e.target.value })}
                                        className="w-full px-2 py-1 typo-body bg-surface-sunken border border-border rounded"
                                        placeholder="Buyer Name"
                                    />
                                    <textarea
                                        value={editData.buyer_address || ""}
                                        onChange={(e) => setEditData({ ...editData, buyer_address: e.target.value })}
                                        className="w-full px-2 py-1 typo-body-sm bg-surface-sunken border border-border rounded min-h-8 leading-snug"
                                        placeholder="Address"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={editData.buyer_gstin || ""}
                                            onChange={(e) => setEditData({ ...editData, buyer_gstin: e.target.value })}
                                            className="px-2 py-1 typo-body-sm bg-surface-sunken border border-border rounded"
                                            placeholder="GSTIN"
                                        />
                                        <input
                                            type="text"
                                            value={editData.buyer_state || ""}
                                            onChange={(e) => setEditData({ ...editData, buyer_state: e.target.value })}
                                            className="px-2 py-1 typo-body-sm bg-surface-sunken border border-border rounded"
                                            placeholder="State"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1.5 pl-3">
                                    <div className="typo-headline-sm">{header.buyer_name || "—"}</div>
                                    <div className="typo-body-sm text-muted leading-snug">{header.buyer_address || "—"}</div>
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 typo-body-sm text-subtle">
                                        <span className="inline-flex items-center gap-1">
                                            <span className="typo-label-md">GSTIN:</span>
                                            <span className="typo-mono-md">{header.buyer_gstin || "—"}</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <span className="typo-label-md">STATE:</span>
                                            <span>{header.buyer_state || "—"}</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <span className="typo-label-md">POS:</span>
                                            <span>{header.place_of_supply || "—"}</span>
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Document Logistics - Using InfoGrid for consistent PO typography */}
                    <div className="col-span-8 p-2 bg-surface-sunken/5">
                        <InfoGrid columns={4}>
                            <InfoItem label="Invoice No." value={header.invoice_number} />
                            {isEditing ? (
                                <div>
                                    <div className="typo-body-sm mb-1.5">Dated</div>
                                    <DatePicker value={editData.invoice_date || ""} onChange={(v) => setEditData({ ...editData, invoice_date: v })} className="h-8 w-full" />
                                </div>
                            ) : (
                                <InfoItem label="Dated" value={fmtDate(header.invoice_date)} />
                            )}
                            <InfoItem label="Challan No" value={h.dc_number} href={`/dc/${h.dc_number}`} />
                            <InfoItem label="Challan Date" value={fmtDate(h.dc_date)} />
                            {isEditing ? (
                                <EditableInfoItem label="GEMC No" value={editData.gemc_number || ""} onChange={(v) => setEditData({ ...editData, gemc_number: v })} editable />
                            ) : (
                                <InfoItem label="GEMC No" value={header.gemc_number} />
                            )}
                            {isEditing ? (
                                <div>
                                    <div className="typo-body-sm mb-1.5">GEMC Date</div>
                                    <DatePicker value={editData.gemc_date || ""} onChange={(v) => setEditData({ ...editData, gemc_date: v })} className="h-8 w-full" />
                                </div>
                            ) : (
                                <InfoItem label="GEMC Date" value={fmtDate(header.gemc_date)} />
                            )}
                            <InfoItem label="Buyer's Order No." value={header.buyers_order_no} href={header.buyers_order_no ? `/po/${header.buyers_order_no}` : undefined} />
                            <InfoItem label="Order Date" value={fmtDate(header.buyers_order_date)} />
                            {isEditing ? (
                                <EditableInfoItem label="SRV No" value={editData.srv_no || editData.srv_number || ""} onChange={(v) => setEditData({ ...editData, srv_no: v })} editable />
                            ) : (
                                <InfoItem label="SRV No" value={header.srv_no || header.srv_number} />
                            )}
                            {isEditing ? (
                                <div>
                                    <div className="typo-body-sm mb-1.5">SRV Date</div>
                                    <DatePicker value={editData.srv_date || ""} onChange={(v) => setEditData({ ...editData, srv_date: v })} className="h-8 w-full" />
                                </div>
                            ) : (
                                <InfoItem label="SRV Date" value={fmtDate(header.srv_date)} />
                            )}
                            {isEditing ? (
                                <EditableInfoItem label="Payment Terms" value={editData.payment_terms || editData.mode_of_payment || ""} onChange={(v) => setEditData({ ...editData, payment_terms: v })} editable />
                            ) : (
                                <InfoItem label="Payment Terms" value={header.payment_terms || header.mode_of_payment} />
                            )}
                            {isEditing ? (
                                <EditableInfoItem label="Despatch Doc No." value={editData.despatch_doc_no || ""} onChange={(v) => setEditData({ ...editData, despatch_doc_no: v })} editable />
                            ) : (
                                <InfoItem label="Despatch Doc No." value={header.despatch_doc_no} />
                            )}
                            {isEditing ? (
                                <EditableInfoItem label="Despatched Through" value={editData.despatch_through || editData.transporter || ""} onChange={(v) => setEditData({ ...editData, despatch_through: v, transporter: v })} editable />
                            ) : (
                                <InfoItem label="Despatched Through" value={header.despatch_through || header.transporter} />
                            )}
                            {isEditing ? (
                                <EditableInfoItem label="Destination" value={editData.destination || ""} onChange={(v) => setEditData({ ...editData, destination: v })} editable />
                            ) : (
                                <InfoItem label="Destination" value={header.destination} />
                            )}
                            {isEditing ? (
                                <EditableInfoItem label="Vehicle No" value={editData.vehicle_no || ""} onChange={(v) => setEditData({ ...editData, vehicle_no: v })} editable />
                            ) : (
                                <InfoItem label="Vehicle No" value={header.vehicle_no} />
                            )}
                            {isEditing ? (
                                <EditableInfoItem label="LR No" value={editData.lr_no || ""} onChange={(v) => setEditData({ ...editData, lr_no: v })} editable />
                            ) : (
                                <InfoItem label="LR No" value={header.lr_no} />
                            )}
                            {isEditing ? (
                                <EditableInfoItem label="Terms of Delivery" value={editData.terms_of_delivery || ""} onChange={(v) => setEditData({ ...editData, terms_of_delivery: v })} className="col-span-4" editable />
                            ) : (
                                <InfoItem label="Terms of Delivery" value={header.terms_of_delivery} className="col-span-4" />
                            )}
                        </InfoGrid>
                    </div>
                </div>
            </InfoSection>

            {/* Items Table */}
            <TableSection
                title={<LineItemsHeader counts={[
                    { label: 'Items', value: items.length },
                    { label: 'Value', value: totalValue },
                ]} />}
            >
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-surface-sunken/50 border-b border-border">
                            <TableHeader align="center" className="w-10">S.N.</TableHeader>
                            <TableHeader className="min-w-50">Material</TableHeader>
                            <TableHeader align="center" className="w-20">HSN</TableHeader>
                            <TableHeader align="center" className="w-15">Unit</TableHeader>
                            <TableHeader align="right" className="w-20">Qty</TableHeader>
                            <TableHeader align="right" className="w-25">Rate</TableHeader>
                            <TableHeader align="right" className="w-25">Taxable</TableHeader>
                            <TableHeader align="right" className="w-20">CGST</TableHeader>
                            <TableHeader align="right" className="w-20">SGST</TableHeader>
                            <TableHeader align="right" className="w-25">Total</TableHeader>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx: number) => (
                            <tr key={idx} className="border-b border-border/40 hover:bg-surface-sunken/30">
                                <td className="py-2 px-3 text-center w-col-checkbox">
                                    <CellText align="center" value={(idx + 1).toString()} className="text-muted" />
                                </td>
                                <td className="py-2 px-3">
                                    <CellMaterial
                                        code={item.material_code}
                                        description={item.description || "—"}
                                        cat={item.mtrl_cat}
                                        drg={item.drg_no}
                                    />
                                </td>
                                <td className="py-2 px-3 text-center w-col-unit">
                                    <CellText align="center" value={item.hsn_sac || "—"} />
                                </td>
                                <td className="py-2 px-3 text-center w-col-row-num">
                                    <CellUnit value={item.unit} />
                                </td>
                                <td className="py-2 px-3 text-right w-col-qty">
                                    <CellNum value={item.quantity || 0} />
                                </td>
                                <td className="py-2 px-3 text-right w-col-value">
                                    <CellCurr value={item.rate || 0} />
                                </td>
                                <td className="py-2 px-3 text-right w-col-value">
                                    <CellCurr value={item.taxable_value || 0} />
                                </td>
                                <td className="py-2 px-3 text-right w-col-qty">
                                    <CellCurr value={item.cgst_amount || 0} className="text-muted" />
                                </td>
                                <td className="py-2 px-3 text-right w-col-qty">
                                    <CellCurr value={item.sgst_amount || 0} className="text-muted" />
                                </td>
                                <td className="py-2 px-3 text-right w-col-value">
                                    <CellCurr value={item.total_amount || 0} className="typo-body-md" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableSection>

            <ActionConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Invoice?"
                warningText={`Delete Invoice #${h.invoice_number}? This cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                isLoading={isDeleting}
            />
        </div >
    );
});

InvoiceDetailClient.displayName = "InvoiceDetailClient";
