"use client";
import React from "react";
import {
    Box, Button, Card, Flex, Grid, Input, Stack, FieldGroup, MetadataItem
} from "@/components/common/index";
import { Text } from "@/components/ui";
import { Heading, Label } from "@/components/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tag01Icon as Hash, Calendar03Icon as Calendar, Key01Icon as Key, UserIcon, Location01Icon as MapPin } from "@hugeicons/core-free-icons";
import { formatDate, formatIndianCurrency } from "@/lib/utils";

interface DCHeaderInfoProps {
    header: any;
    poData?: any;
    totalDCValue: number;
    editable?: boolean;
    onUpdateHeader?: (key: string, value: any) => void;
    isDuplicateNumber?: boolean;
    onCheckDuplicate?: (num: string, date: string) => void;
    gcNumberEditedByUser?: React.MutableRefObject<boolean>;
    gcDateEditedByUser?: React.MutableRefObject<boolean>;
}

export function DCHeaderInfo({
    header,
    poData,
    totalDCValue,
    editable = false,
    onUpdateHeader,
    isDuplicateNumber = false,
    onCheckDuplicate,
    gcNumberEditedByUser,
    gcDateEditedByUser
}: DCHeaderInfoProps) {

    if (!editable) {
        return (
            <div className="spatial-card-v2 glow-border-v2 p-5 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-3">
                    <MetadataItem label="Challan No." value={header.dc_number} className="typo-body-sm" />
                    <MetadataItem label="DC Date" value={formatDate(header.dc_date)} className="typo-body-sm" />
                    <MetadataItem label="Our Ref" value={header.our_ref} className="typo-body-sm" />
                    <MetadataItem label="PO Reference" value={header.po_number || "N/A"} href={header.po_number ? `/po/${header.po_number}` : undefined} className="typo-body-sm" />
                    <MetadataItem label="PO Date" value={header.po_date ? formatDate(header.po_date) : (poData?.po_date ? formatDate(poData.po_date) : "-")} className="typo-body-sm" />
                    <MetadataItem label="DVN" value={header.department_no || poData?.department_no} className="typo-body-sm" />
                    <MetadataItem label="DC Value" value={totalDCValue} isCurrency className="typo-body-sm" />
                    <MetadataItem label="Consignee" value={header.consignee_name} className="md:col-span-2 typo-body-sm" />
                    <MetadataItem label="Address" value={header.consignee_address} className="md:col-span-3 typo-body-sm" />
                    <MetadataItem label="GC Number" value={header.gc_number} className="typo-body-sm" />
                    <MetadataItem label="GC Date" value={header.gc_date ? formatDate(header.gc_date) : "-"} className="typo-body-sm" />
                </div>
            </div>
        );
    }

    return (
        <div className="spatial-card-v2 glow-border-v2 p-6 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-3">
                <FieldGroup
                    label="DC Number"
                    value={header.dc_number || ""}
                    onChange={(v) => onUpdateHeader?.("dc_number", v)}
                    placeholder="DC-XXXX"
                    icon={<HugeiconsIcon icon={Hash} className="w-4 h-4" />}
                    error={isDuplicateNumber}
                    tooltip={isDuplicateNumber ? "Number already exists in this FY" : undefined}
                    className="[&_p]:typo-body-sm [&_input]:h-9 [&_input]:typo-body-sm"
                />

                <FieldGroup
                    label="GC Number"
                    value={header.gc_number || ""}
                    onChange={(v) => {
                        if (gcNumberEditedByUser) gcNumberEditedByUser.current = true;
                        onUpdateHeader?.("gc_number", v);
                    }}
                    placeholder="GC-XXXX"
                    icon={<HugeiconsIcon icon={Key} className="w-4 h-4" />}
                    className="[&_p]:typo-body-sm [&_input]:h-9 [&_input]:typo-body-sm"
                />

                <FieldGroup
                    label="DC Date"
                    value={header.dc_date}
                    onChange={(v) => {
                        onUpdateHeader?.("dc_date", v);
                        if (header.dc_number && onCheckDuplicate) onCheckDuplicate(header.dc_number, v);
                        if (gcDateEditedByUser && !gcDateEditedByUser.current) onUpdateHeader?.("gc_date", v);
                    }}
                    icon={<HugeiconsIcon icon={Calendar} className="w-4 h-4" />}
                    className="[&_p]:typo-body-sm [&_input]:h-9 [&_input]:typo-body-sm"
                />

                <FieldGroup
                    label="GC Date"
                    value={header.gc_date || header.dc_date}
                    onChange={(v) => {
                        if (gcDateEditedByUser) gcDateEditedByUser.current = true;
                        onUpdateHeader?.("gc_date", v);
                    }}
                    icon={<HugeiconsIcon icon={Calendar} className="w-4 h-4" />}
                    className="[&_p]:typo-body-sm [&_input]:h-9 [&_input]:typo-body-sm"
                />

                <FieldGroup
                    label="PO Reference"
                    value={poData?.po_number || header.po_number || "N/A"}
                    disabled
                    icon={<HugeiconsIcon icon={Hash} className="w-4 h-4" />}
                    className="[&_p]:typo-body-sm [&_input]:h-9 [&_input]:typo-body-sm"
                />

                <FieldGroup
                    label="Our Ref"
                    value={header.our_ref || ""}
                    onChange={(v) => onUpdateHeader?.("our_ref", v)}
                    placeholder="SSG-XXXX"
                    icon={<HugeiconsIcon icon={Hash} className="w-4 h-4" />}
                    className="[&_p]:typo-body-sm [&_input]:h-9 [&_input]:typo-body-sm"
                />

                <FieldGroup
                    label="DVN"
                    value={poData?.department_no || header.department_no || "N/A"}
                    disabled
                    icon={<HugeiconsIcon icon={MapPin} className="w-4 h-4" />}
                    className="[&_p]:typo-body-sm [&_input]:h-9 [&_input]:typo-body-sm"
                />

                <FieldGroup
                    label="PO Date"
                    value={poData?.po_date || header.po_date ? formatDate(poData?.po_date || header.po_date) : "N/A"}
                    disabled
                    icon={<HugeiconsIcon icon={Calendar} className="w-4 h-4" />}
                    className="[&_p]:typo-body-sm [&_input]:h-9 [&_input]:typo-body-sm"
                />

                <FieldGroup
                    label="DC Value"
                    value={totalDCValue ? formatIndianCurrency(totalDCValue) : "0"}
                    disabled
                    icon={<span className="typo-body-sm">₹</span>}
                    className="[&_p]:typo-body-sm [&_input]:h-9 [&_input]:typo-body-sm"
                />

                <div className="md:col-span-2 lg:col-span-2">
                    <FieldGroup
                        label="Consignee Name"
                        value={header.consignee_name || ""}
                        onChange={(v) => onUpdateHeader?.("consignee_name", v)}
                        placeholder="Receiver Business Name"
                        icon={<HugeiconsIcon icon={UserIcon} className="w-4 h-4" />}
                        className="[&_p]:typo-body-sm [&_input]:h-9 [&_input]:typo-body-sm"
                    />
                </div>

                <div className="md:col-span-3 lg:col-span-3">
                    <FieldGroup
                        label="Consignee Address"
                        value={header.consignee_address || ""}
                        onChange={(v) => onUpdateHeader?.("consignee_address", v)}
                        placeholder="Full delivery location address"
                        icon={<HugeiconsIcon icon={MapPin} className="w-4 h-4" />}
                        className="[&_p]:typo-body-sm [&_input]:h-9 [&_input]:typo-body-sm"
                    />
                </div>
            </div>
        </div>
    );
}
