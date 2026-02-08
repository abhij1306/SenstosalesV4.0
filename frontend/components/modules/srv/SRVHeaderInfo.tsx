"use client";

import React from "react";
import { MetadataItem, Card } from "@/components/common/index";
import { formatDate } from "@/lib/utils";

interface SRVHeaderInfoProps {
    header: any;
    metaItem?: any;
}

export function SRVHeaderInfo({ header, metaItem = {} }: SRVHeaderInfoProps) {
    return (
        <div className="spatial-card-v2 glow-border-v2 p-5 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-10 gap-y-6">
                <MetadataItem label="SRV Number" value={header.srv_number} />
                <MetadataItem label="SRV Date" value={formatDate(header.srv_date)} />
                <MetadataItem label="PO Number" value={header.po_number || "Direct"} href={header.po_number ? `/po/${header.po_number}` : undefined} />
                <MetadataItem label="Division" value={metaItem.div_code} />
                <MetadataItem label="Invoice No" value={metaItem.invoice_no} />
                <MetadataItem label="Invoice Date" value={formatDate(metaItem.invoice_date)} />
                <MetadataItem label="Challan No" value={metaItem.challan_no} />
                <MetadataItem label="Challan Date" value={formatDate(metaItem.challan_date)} />
                <MetadataItem label="CNote No" value={metaItem.cnote_no} />
                <MetadataItem label="CNote Date" value={formatDate(metaItem.cnote_date)} />
                <MetadataItem label="Finance Date" value={formatDate(metaItem.finance_date)} />
                <MetadataItem label="PMIR No" value={metaItem.pmir_no} />
            </div>
        </div>
    );
}
