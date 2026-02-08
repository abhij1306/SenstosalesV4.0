"use client";

import React from "react";
import {
    Flex, Card, Stack
} from "@/components/common/index";
import {
    CellNum,
    CellMaterial,
    CellBadge,
    CellUnit
} from "@/components/ui/table";
import { TableHeader } from "@/components/patterns/detail";
import { Label, Text, Mono } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SRVItem } from "@/types";


interface SRVTableProps {
    items: SRVItem[];
}

export function SRVTable({ items }: SRVTableProps) {
    return (
        <Stack gap={3} align="stretch" className="w-full">
            <Flex align="center" justify="between" className="px-2">
                <Label>
                    Procurement Structure
                </Label>
            </Flex>
            <div className="spatial-card-v2 glow-border-v2 flex flex-col overflow-hidden transition-all min-h-[400px]">
                <div className="w-full overflow-hidden">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr className="bg-surface-sunken border-none h-[40px] hidden md:table-row transition-colors">
                                <TableHeader width="80px" align="center">PO Item</TableHeader>
                                <TableHeader width="80px" align="center">SRV Item</TableHeader>
                                <TableHeader width="50px" align="center">Rev</TableHeader>
                                <TableHeader align="left">Material Identity</TableHeader>
                                <TableHeader width="60px" align="center">Unit</TableHeader>
                                <TableHeader width="100px" align="right">Ordered</TableHeader>
                                <TableHeader width="100px" align="right">Dispatched</TableHeader>
                                <TableHeader width="100px" align="right" className="bg-surface transition-colors">Received</TableHeader>
                                <TableHeader width="100px" align="right">Accepted</TableHeader>
                                <TableHeader width="100px" align="right">Rejected</TableHeader>
                            </tr>
                        </thead>
                        <tbody className="divide-none">
                            {items.map((item, idx) => (
                                <tr key={idx} className="transition-all duration-300 group border-none h-[48px] hover:bg-action-primary/5 rounded-xl">
                                    <td className="py-2 px-3 border-none text-center align-top pt-3">
                                        <span className="tabular-nums">#{item.po_item_no}{item.lot_no ? `.${item.lot_no}` : ''}</span>
                                    </td>
                                    <td className="py-2 px-3 border-none text-center align-top pt-3">
                                        <Text className="tabular-nums">{item.srv_item_no || ""}</Text>
                                    </td>
                                    <td className="py-2 px-3 border-none text-center align-top pt-3">
                                        <Text className="tabular-nums">{item.rev_no || "0"}</Text>
                                    </td>
                                    <td className="py-2 px-3 border-none align-top pt-2 overflow-hidden">
                                        <CellMaterial
                                            code={item.material_code}
                                            description={item.material_description}
                                        >
                                            <CellBadge label="CAT" value={item.mtrl_cat?.toString()} />
                                            <CellBadge label="DRG" value={item.drg_no} />
                                        </CellMaterial>
                                    </td>
                                    <td className="py-2 px-3 border-none text-center align-top pt-3">
                                        <CellUnit value={item.unit} />
                                    </td>
                                    <td className="py-2 px-3 border-none text-right align-top pt-3">
                                        <CellNum value={item.ord_qty} />
                                    </td>
                                    <td className="py-2 px-3 border-none text-right align-top pt-3">
                                        <CellNum value={item.challan_qty || 0} />
                                    </td>
                                    <td className="py-2 px-3 border-none text-right bg-surface align-top pt-3 transition-colors">
                                        <CellNum value={item.rcd_qty} />
                                    </td>
                                    <td className="py-2 px-3 border-none text-right align-top pt-3">
                                        <CellNum value={item.accepted_qty} />
                                    </td>
                                    <td className="py-2 px-3 border-none text-right align-top pt-3">
                                        <CellNum value={item.rej_qty} />
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="py-20 text-center border-none">
                                        <Label size="sm" className="text-tertiary">No line items found</Label>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Stack>
    );
}
