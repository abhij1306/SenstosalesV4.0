"use client";

import React from "react";
import { usePOStore } from "@/store/poStore";
import { fmtDate, fmtCurr } from "@/components/patterns";
import {
    InfoSection,
    InfoGrid,
    InfoItem,
    EditableInfoItem,
} from "@/components/patterns/detail";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    InformationCircleIcon as Info,
    File01Icon as FileText,
    Shield01Icon as ShieldCheck,
    Invoice01Icon as Receipt
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface PODetailInfoProps {
    itemsCount: number;
    editMode: boolean;
    onSRVClick: (srvNumber: string) => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

// Tab button component
const TabButton = ({
    active,
    onClick,
    children
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) => (
    <button
        onClick={onClick}
        className={cn(
            "px-btn-horiz py-btn-vert typo-body-sm rounded-md transition-colors",
            active
                ? "bg-primary/10 text-primary"
                : "text-secondary hover:text-foreground hover:bg-surface-sunken"
        )}
    >
        {children}
    </button>
);

export const PODetailInfo = ({
    itemsCount,
    editMode,
    activeTab,
    setActiveTab,
}: PODetailInfoProps) => {
    const header = usePOStore((state) => state.data?.header);
    const updateHeader = usePOStore((state) => state.updateHeader);

    if (!header) return null;

    const tabs = [
        { id: "basic", label: "Basic", icon: Info },
        { id: "references", label: "References", icon: FileText },
        { id: "financial", label: "Financial", icon: Receipt },
        { id: "issuer", label: "Issuer", icon: ShieldCheck },
    ];

    return (
        <InfoSection
            title={`Order Details • ${itemsCount} items • Value: ${fmtCurr(header.po_value || 0)}`}
            headerClassName="flex items-center gap-1 px-3 py-2"
        >
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-4 pb-2 border-b border-border">
                {tabs.map((tab) => (
                    <TabButton
                        key={tab.id}
                        active={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <div className="flex items-center gap-1.5">
                            <HugeiconsIcon icon={tab.icon} className="w-3.5 h-3.5" />
                            {tab.label}
                        </div>
                    </TabButton>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "basic" && (
                <InfoGrid columns={6}>
                    <InfoItem label="PO Number" value={header.po_number} />
                    <InfoItem label="PO Date" value={fmtDate(header.po_date)} />
                    <EditableInfoItem
                        label="Supplier"
                        value={header.supplier_name}
                        className="md:col-span-2"
                        editable={editMode}
                        onChange={(v) => updateHeader("supplier_name", v)}
                    />
                    <EditableInfoItem
                        label="Supplier Code"
                        value={header.supplier_code}
                        editable={editMode}
                        onChange={(v) => updateHeader("supplier_code", v)}
                    />
                    <EditableInfoItem
                        label="Phone"
                        value={header.supplier_phone || ""}
                        editable={editMode}
                        onChange={(v) => updateHeader("supplier_phone", v)}
                    />
                    <EditableInfoItem
                        label="Email"
                        value={header.supplier_email || ""}
                        className="md:col-span-2"
                        editable={editMode}
                        onChange={(v) => updateHeader("supplier_email", v)}
                    />
                    <EditableInfoItem
                        label="GSTIN"
                        value={header.supplier_gstin || ""}
                        editable={editMode}
                        onChange={(v) => updateHeader("supplier_gstin", v)}
                    />
                    <EditableInfoItem
                        label="Our Ref"
                        value={header.our_ref || ""}
                        editable={editMode}
                        onChange={(v) => updateHeader("our_ref", v)}
                    />
                    <EditableInfoItem
                        label="Dept No"
                        value={header.department_no || ""}
                        editable={editMode}
                        onChange={(v) => updateHeader("department_no", v)}
                    />
                    <InfoItem label="Status" value={header.po_status || ""} />
                </InfoGrid>
            )}

            {activeTab === "references" && (
                <InfoGrid columns={6}>
                    <EditableInfoItem
                        label="Enquiry No"
                        value={header.enquiry_no || ""}
                        editable={editMode}
                        onChange={(v) => updateHeader("enquiry_no", v)}
                    />
                    <EditableInfoItem
                        label="Enquiry Date"
                        value={header.enquiry_date || ""}
                        editable={editMode}
                        onChange={(v) => updateHeader("enquiry_date", v)}
                    />
                    <EditableInfoItem
                        label="Quotation Ref"
                        value={header.quotation_ref || ""}
                        editable={editMode}
                        onChange={(v) => updateHeader("quotation_ref", v)}
                    />
                    <EditableInfoItem
                        label="Quotation Date"
                        value={header.quotation_date || ""}
                        editable={editMode}
                        onChange={(v) => updateHeader("quotation_date", v)}
                    />
                    <EditableInfoItem
                        label="RC Number"
                        value={header.rc_no || ""}
                        editable={editMode}
                        onChange={(v) => updateHeader("rc_no", v)}
                    />
                    <EditableInfoItem
                        label="Order Type"
                        value={header.order_type || ""}
                        editable={editMode}
                        onChange={(v) => updateHeader("order_type", v)}
                    />
                    <EditableInfoItem
                        label="AMD Number"
                        value={String(header.amend_no || "")}
                        editable={editMode}
                        onChange={(v) => updateHeader("amend_no", Number(v) || 0)}
                    />
                </InfoGrid>
            )}

            {activeTab === "financial" && (
                <InfoGrid columns={6}>
                    <EditableInfoItem
                        label="PO Value"
                        value={fmtCurr(Number(header.po_value) || 0)}
                        editable={editMode}
                        onChange={(v) => updateHeader("po_value", Number(v) || 0)}
                    />
                    <EditableInfoItem
                        label="FOB Value"
                        value={fmtCurr(Number(header.fob_value) || 0)}
                        editable={editMode}
                        onChange={(v) => updateHeader("fob_value", Number(v) || 0)}
                    />
                    <EditableInfoItem
                        label="Net Value"
                        value={fmtCurr(Number(header.net_po_value) || 0)}
                        editable={editMode}
                        onChange={(v) => updateHeader("net_po_value", Number(v) || 0)}
                    />
                    <EditableInfoItem
                        label="TIN No"
                        value={header.tin_no || ""}
                        editable={editMode}
                        onChange={(v) => updateHeader("tin_no", v)}
                    />
                    <EditableInfoItem
                        label="ECC No"
                        value={header.ecc_no || ""}
                        editable={editMode}
                        onChange={(v) => updateHeader("ecc_no", v)}
                    />
                    <EditableInfoItem
                        label="MPCT No"
                        value={header.mpct_no || ""}
                        editable={editMode}
                        onChange={(v) => updateHeader("mpct_no", v)}
                    />
                    <EditableInfoItem
                        label="Currency"
                        value={header.currency || ""}
                        editable={editMode}
                        onChange={(v) => updateHeader("currency", v)}
                    />
                    <EditableInfoItem
                        label="Ex Rate"
                        value={String(header.ex_rate || "")}
                        editable={editMode}
                        onChange={(v) => updateHeader("ex_rate", Number(v) || 0)}
                    />
                </InfoGrid>
            )}

            {activeTab === "issuer" && (
                <div className="space-y-4">
                    <InfoGrid columns={6}>
                        <EditableInfoItem
                            label="Inspection By"
                            value={header.inspection_by || ""}
                            editable={editMode}
                            onChange={(v) => updateHeader("inspection_by", v)}
                        />
                        <EditableInfoItem
                            label="Inspection At"
                            value={header.inspection_at || ""}
                            editable={editMode}
                            onChange={(v) => updateHeader("inspection_at", v)}
                        />
                        <EditableInfoItem
                            label="Consignee"
                            value={header.consignee_name || ""}
                            className="md:col-span-2"
                            editable={editMode}
                            onChange={(v) => updateHeader("consignee_name", v)}
                        />
                        <EditableInfoItem
                            label="Issuer Name"
                            value={header.issuer_name || ""}
                            editable={editMode}
                            onChange={(v) => updateHeader("issuer_name", v)}
                        />
                        <EditableInfoItem
                            label="Designation"
                            value={header.issuer_designation || ""}
                            editable={editMode}
                            onChange={(v) => updateHeader("issuer_designation", v)}
                        />
                    </InfoGrid>
                    <div className="pt-2 border-t border-border">
                        <div className="typo-label-lg mb-1">
                            Remarks
                        </div>
                        {editMode ? (
                            <textarea
                                value={header.remarks || ""}
                                onChange={(e) => updateHeader("remarks", e.target.value)}
                                className="w-full px-2 py-1.5 typo-body-md bg-surface-sunken border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-sm"
                                placeholder="Enter remarks..."
                            />
                        ) : (
                            <div className="typo-body-md">
                                {header.remarks || <span className="text-subtle">No remarks</span>}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </InfoSection>
    );
};
