"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { PageHeader, Layout, fmtNum, fmtDate, fmtCurr } from "@/components/patterns";
import {
    InfoSection,
    InfoGrid,
    InfoItem,
    TableSection,
    TableHeader,
    TableCell,
    LineItemsHeader,
} from "@/components/patterns/detail";
import {
    CellNum,
    CellCurr,
    CellMaterial,
    CellText,
    CellUnit
} from "@/components/ui/table";
import { SRVDetail, SRVItem } from "@/types";

interface SRVDetailClientProps {
    initialSRV: SRVDetail;
}

export function SRVDetailClient({ initialSRV }: SRVDetailClientProps) {
    const router = useRouter();
    const { header, items } = initialSRV;
    const metaItem = items[0] || {} as SRVItem;

    // Calculate totals
    const { totalOrdered, totalReceived, totalAccepted, totalRejected, srvValue } = items.reduce(
        (acc, item) => {
            const accepted = item.accepted_qty || 0;
            const rate = item.po_rate || 0;
            return {
                totalOrdered: acc.totalOrdered + (item.ord_qty || 0),
                totalReceived: acc.totalReceived + (item.rcd_qty || 0),
                totalAccepted: acc.totalAccepted + accepted,
                totalRejected: acc.totalRejected + (item.rej_qty || 0),
                srvValue: acc.srvValue + (accepted * rate),
            };
        },
        { totalOrdered: 0, totalReceived: 0, totalAccepted: 0, totalRejected: 0, srvValue: 0 }
    );

    return (
        <div className={Layout.colGap}>
            {/* Header */}
            <PageHeader
                title={header.srv_number}
                subtitle={
                    <div className="flex items-center gap-2">
                        <span>PO: <Link href={`/po/${header.po_number}`} className="text-primary hover:underline">{header.po_number}</Link></span>
                    </div>
                }
                onBack={() => router.push("/srv")}
            />

            {/* SRV Info */}
            <InfoSection title={`Receipt Details • ${items.length} items • Value: ${fmtCurr(srvValue)}`}>
                <InfoGrid columns={6}>
                    <InfoItem label="SRV Number" value={header.srv_number} />
                    <InfoItem label="SRV Date" value={fmtDate(header.srv_date)} />
                    <InfoItem label="PO Reference" value={header.po_number} href={`/po/${header.po_number}`} />
                    <InfoItem label="Division" value={metaItem.div_code} />
                    <InfoItem label="Invoice No" value={metaItem.invoice_no} />
                    <InfoItem label="Invoice Date" value={fmtDate(metaItem.invoice_date)} />
                    <InfoItem label="Challan No" value={metaItem.challan_no} />
                    <InfoItem label="Challan Date" value={fmtDate(metaItem.challan_date)} />
                    <InfoItem label="CNote No" value={metaItem.cnote_no} />
                    <InfoItem label="CNote Date" value={fmtDate(metaItem.cnote_date)} />
                    <InfoItem label="Finance Date" value={fmtDate(metaItem.finance_date)} />
                    <InfoItem label="PMIR No" value={metaItem.pmir_no} />
                </InfoGrid>
            </InfoSection>

            {/* Items Table */}
            <TableSection
                title={<LineItemsHeader counts={[
                    { label: 'Ordered', value: totalOrdered },
                    { label: 'Received', value: totalReceived },
                    { label: 'Accepted', value: totalAccepted },
                    { label: 'Rejected', value: totalRejected },
                ]} />}
            >
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-surface-sunken/50 border-b border-border">
                            <TableHeader align="center" className="w-15">PO Item</TableHeader>
                            <TableHeader align="center" className="w-15">SRV Item</TableHeader>
                            <TableHeader align="center" className="w-12">Rev</TableHeader>
                            <TableHeader>Material</TableHeader>
                            <TableHeader align="right" className="w-25">Unit Rate</TableHeader>
                            <TableHeader align="center" className="w-15">Unit</TableHeader>
                            <TableHeader align="right" className="w-20">Ordered</TableHeader>
                            <TableHeader align="right" className="w-20">Dispatched</TableHeader>
                            <TableHeader align="right" className="w-20">Received</TableHeader>
                            <TableHeader align="right" className="w-20">Accepted</TableHeader>
                            <TableHeader align="right" className="w-20">Rejected</TableHeader>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx} className="border-b border-border/40 hover:bg-surface-sunken/30">
                                <td className="py-2 px-3 text-center w-col-row-num">
                                    <CellText align="center" value={`#${item.po_item_no}${item.lot_no ? `.${item.lot_no}` : ''}`} />
                                </td>
                                <td className="py-2 px-3 text-center w-col-row-num">
                                    <CellText align="center" value={item.srv_item_no?.toString() || "—"} />
                                </td>
                                <td className="py-2 px-3 text-center w-col-checkbox">
                                    <CellText align="center" value={item.rev_no?.toString() || "0"} />
                                </td>
                                <td className="py-2 px-3">
                                    <CellMaterial
                                        code={item.material_code}
                                        description={item.material_description || "—"}
                                        cat={item.mtrl_cat}
                                        drg={item.drg_no}
                                    />
                                </td>
                                <td className="py-2 px-3 text-right w-col-rate">
                                    <CellCurr value={item.po_rate || 0} />
                                </td>
                                <td className="py-2 px-3 text-center w-col-row-num">
                                    <CellUnit value={item.unit} />
                                </td>
                                <td className="py-2 px-3 text-right w-col-qty">
                                    <CellNum value={item.ord_qty || 0} />
                                </td>
                                <td className="py-2 px-3 text-right w-col-qty">
                                    <CellNum value={item.challan_qty || 0} />
                                </td>
                                <td className="py-2 px-3 text-right w-col-qty">
                                    <CellNum value={item.rcd_qty || 0} className="text-success" />
                                </td>
                                <td className="py-2 px-3 text-right w-col-qty">
                                    <CellNum value={item.accepted_qty || 0} />
                                </td>
                                <td className="py-2 px-3 text-right w-col-qty">
                                    <CellNum value={item.rej_qty || 0} className="text-error" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableSection>
        </div>
    );
}
