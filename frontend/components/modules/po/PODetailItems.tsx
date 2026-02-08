"use client";

import React, { useMemo, useState } from "react";
import { usePOStore, usePOItems } from "@/store/poStore";
import { Button } from "@/components/common";
import { fmtNum, fmtCurr } from "@/components/patterns";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import {
    TableSection,
    TableHeader,
    LineItemsHeader,
} from "@/components/patterns/detail";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    PlusSignIcon as Plus,
    Delete02Icon as Trash2,
    ArrowDown01Icon as ChevronDown,
    ArrowUp01Icon as ChevronUp,
} from "@hugeicons/core-free-icons";
import { cn, formatDate } from "@/lib/utils";
import {
    CellNum,
    CellCurr,
    CellText,
    CellMaterial,
    CellBadge,
    CellUnit
} from "@/components/ui/table";

// LotRow - nested delivery row
const LotRow = React.memo(({
    itemIdx,
    lotIdx,
    editMode,
}: {
    itemIdx: number;
    lotIdx: number;
    editMode: boolean;
}) => {
    const delivery = usePOStore((state) => state.data?.items[itemIdx]?.deliveries[lotIdx]);
    const updateDelivery = usePOStore((state) => state.updateDelivery);
    const removeDelivery = usePOStore((state) => state.removeDelivery);

    if (!delivery) return null;

    return (
        <tr className="bg-surface-sunken border-none">
            <td className="py-1 px-3 border-none"></td>
            <td className="py-1 px-3 border-none" colSpan={1}>
                <div className="typo-body-sm flex items-center gap-3">
                    <span className="text-foreground/70">Lot {lotIdx + 1}</span>
                    {delivery.dest_code && (
                        <span>
                            DEST {delivery.dest_code}
                        </span>
                    )}
                    <span>
                        DLY {formatDate(delivery.dely_date)}
                    </span>
                    {(delivery.entry_allow_date || delivery.remarks) && (
                        <span>
                            ENTRY {delivery.entry_allow_date ? formatDate(delivery.entry_allow_date) : delivery.remarks}
                        </span>
                    )}
                </div>
            </td>
            <td className="border-none w-col-unit" />
            <td className="py-1 px-3 border-none text-right w-col-qty">
                <span className="opacity-0">—</span>
            </td>
            <td className="py-1 px-3 border-none text-right w-col-qty">
                <CellNum value={delivery.ord_qty || 0} />
            </td>
            <td className="py-1 px-3 border-none text-right w-col-value">
                {editMode && (
                    <input
                        type="number"
                        value={delivery.manual_override_qty || delivery.dsp_qty || 0}
                        onChange={(e) => updateDelivery(itemIdx, lotIdx, "manual_override_qty" as const, Number(e.target.value))}
                        className="w-input-xs px-2 py-1 typo-body-sm bg-surface border border-border rounded text-right"
                    />
                )}
            </td>
            <td className="py-1 px-3 border-none text-right w-col-rate"></td>
            <td className="py-1 px-3 border-none text-right w-col-value"></td>
            <td className="py-1 px-3 border-none text-center w-col-unit">
                {editMode && (
                    <Button
                        variant="ghost"
                        size="compact"
                        onClick={() => removeDelivery(itemIdx, lotIdx)}
                        className="h-size-compact w-size-compact p-0 text-error hover:bg-error/10"
                        aria-label="Remove delivery lot"
                    >
                        <HugeiconsIcon icon={Trash2} className="w-4 h-4" />
                    </Button>
                )}
            </td>
        </tr>
    );
});
LotRow.displayName = "LotRow";

// ItemRow - main item row
const ItemRow = React.memo(({
    idx,
    editMode,
    isExpanded,
    toggleItem,
}: {
    idx: number;
    editMode: boolean;
    isExpanded: boolean;
    toggleItem: (n: number) => void;
}) => {
    const item = usePOStore((state) => state.data?.items[idx]);
    const updateItem = usePOStore((state) => state.updateItem);
    const removeItem = usePOStore((state) => state.removeItem);
    const addDelivery = usePOStore((state) => state.addDelivery);

    if (!item) return null;

    const { tOrd, tDsp, tRecd, tBal } = useMemo(() => {
        const ord = item.deliveries && item.deliveries.length > 0
            ? item.deliveries.reduce((sum, d) => sum + (d.ord_qty || 0), 0)
            : (item.ord_qty || 0);
        const dsp = item.dsp_qty || 0;
        const recd = item.rcd_qty || 0;
        return {
            tOrd: ord,
            tDsp: dsp,
            tRecd: recd,
            tBal: Math.max(0, ord - dsp)
        };
    }, [item.ord_qty, item.dsp_qty, item.rcd_qty, item.deliveries]);

    return (
        <>
            <tr className={cn(
                "transition-colors border-b border-border/40",
                isExpanded ? "bg-surface" : "hover:bg-surface-sunken/50"
            )}>
                <td className="py-2 px-3 text-center w-col-row-num">
                    <CellText value={`#${item.po_item_no}`} />
                </td>
                <td className="py-2 px-3 text-left">
                    <CellMaterial
                        code={item.material_code}
                        description={item.material_description}
                        cat={!editMode ? item.mtrl_cat : undefined}
                        drg={!editMode ? item.drg_no : undefined}
                    >
                        {editMode && (
                            <>
                                <input
                                    type="text"
                                    value={item.mtrl_cat || ""}
                                    onChange={(e) => updateItem(idx, "mtrl_cat", Number(e.target.value) || 0)}
                                    className="w-input-sm px-2 py-1 typo-body-sm bg-surface-sunken border border-border rounded"
                                    placeholder="Cat/HSN"
                                />
                                <input
                                    type="text"
                                    value={item.drg_no || ""}
                                    onChange={(e) => updateItem(idx, "drg_no", e.target.value)}
                                    className="w-input-sm px-2 py-1 typo-body-sm bg-surface-sunken border border-border rounded"
                                    placeholder="Drawing No."
                                />
                            </>
                        )}
                    </CellMaterial>
                </td>
                <td className="py-2 px-3 w-col-unit text-left">
                    <CellUnit value={item.unit} />
                </td>
                <td className="py-2 px-3 w-col-qty text-right">
                    <CellCurr value={item.po_rate || 0} />
                </td>
                <td className="py-2 px-3 w-col-qty text-right">
                    <CellNum value={tOrd} />
                </td>
                <td className="py-2 px-3 w-col-value text-right">
                    {editMode ? (
                        <input
                            type="number"
                            value={item.dsp_qty || 0}
                            onChange={(e) => updateItem(idx, "dsp_qty", Number(e.target.value))}
                            className="w-input-xs px-2 py-1 typo-body-md bg-surface-sunken border border-border rounded text-right tabular-nums"
                        />
                    ) : (
                        <CellNum value={tDsp} />
                    )}
                </td>
                <td className="py-2 px-3 w-col-rate text-right">
                    <CellNum value={tBal} />
                </td>
                <td className="py-2 px-3 w-col-value text-right">
                    <CellNum value={tRecd} />
                </td>
                <td className="py-2 px-3 w-col-unit text-center">
                    <div className="flex items-center justify-center gap-1">
                        <Button
                            variant="ghost"
                            size="compact"
                            onClick={() => toggleItem(item.po_item_no)}
                            className="h-size-compact w-size-compact p-0"
                            aria-label={isExpanded ? "Collapse item" : "Expand item"}
                        >
                            {isExpanded ? <HugeiconsIcon icon={ChevronUp} className="w-4 h-4" /> : <HugeiconsIcon icon={ChevronDown} className="w-4 h-4" />}
                        </Button>
                        {editMode && (
                            <Button
                                variant="ghost"
                                size="compact"
                                onClick={() => removeItem(idx)}
                                className="h-size-compact w-size-compact p-0 text-error hover:bg-error/10"
                                aria-label="Remove item"
                            >
                                <HugeiconsIcon icon={Trash2} className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </td>
            </tr>

            {
                isExpanded && (
                    <>
                        {item.deliveries && item.deliveries.map((_, lIdx) => (
                            <LotRow
                                key={`${item.po_item_no}-lot-${lIdx}`}
                                itemIdx={idx}
                                lotIdx={lIdx}
                                editMode={editMode}
                            />
                        ))}
                        {editMode && (
                            <tr className="bg-surface-sunken/30 border-none">
                                <td className="py-2 px-3 border-none"></td>
                                <td className="py-2 px-3 border-none" colSpan={8}>
                                    <Button
                                        variant="ghost"
                                        size="compact"
                                        onClick={() => addDelivery(idx)}
                                        className="typo-body-sm"
                                    >
                                        <HugeiconsIcon icon={Plus} className="w-4 h-4" /> Add Delivery Lot
                                    </Button>
                                </td>
                            </tr>
                        )}
                    </>
                )
            }
        </>
    );
});
ItemRow.displayName = "ItemRow";

interface PODetailItemsProps {
    editMode: boolean;
    expandedItems: Set<number>;
    toggleItem: (itemNo: number) => void;
    totalOrdered: number;
    totalDispatched: number;
    totalReceived: number;
}
// ...
export const PODetailItems = ({
    editMode,
    expandedItems,
    toggleItem,
    totalOrdered,
    totalDispatched,
    totalReceived,
}: PODetailItemsProps) => {
    const items = usePOItems();
    const addItem = usePOStore((state) => state.addItem);

    const [page, setPage] = useState(1);
    const [pageSize] = useState(DEFAULT_PAGE_SIZE);

    const paginatedItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }, [items, page, pageSize]);

    return (
        <TableSection
            title={<LineItemsHeader counts={[
                { label: 'Ordered', value: totalOrdered },
                { label: 'Dispatched', value: totalDispatched },
                { label: 'Received', value: totalReceived },
            ]} />}
            headerAction={
                editMode && (
                    <Button onClick={addItem} variant="outline" size="sm">
                        <HugeiconsIcon icon={Plus} className="w-4 h-4 mr-1" /> New Item
                    </Button>
                )
            }
        >
            <table className="w-full border-collapse text-left">
                <thead>
                    <tr className="bg-surface-sunken border-none">
                        <TableHeader align="center" className="w-12">#</TableHeader>
                        <TableHeader className="min-w-75">Material</TableHeader>
                        <TableHeader className="w-15">Unit</TableHeader>
                        <TableHeader align="right" className="w-22">Rate</TableHeader>
                        <TableHeader align="right" className="w-22">Ordered</TableHeader>
                        <TableHeader align="right" className="w-30">Dispatched</TableHeader>
                        <TableHeader align="right" className="w-25">Balance</TableHeader>
                        <TableHeader align="right" className="w-28">Received</TableHeader>
                        <TableHeader className="w-15"> </TableHeader>
                    </tr>
                </thead>
                <tbody>
                    {paginatedItems.length > 0 ? (
                        paginatedItems.map((item, idx) => (
                            <ItemRow
                                key={item.po_item_no}
                                idx={(page - 1) * pageSize + idx}
                                editMode={editMode}
                                isExpanded={expandedItems.has(item.po_item_no)}
                                toggleItem={toggleItem}
                            />
                        ))
                    ) : (
                        <tr>
                            <td colSpan={9} className="py-12 text-center">
                                {editMode ? (
                                    <Button onClick={addItem} variant="outline" size="sm">
                                        <HugeiconsIcon icon={Plus} className="w-4 h-4 mr-2" /> Add first item
                                    </Button>
                                ) : (
                                    <span className="typo-body-sm">No items</span>
                                )}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Pagination */}
            {items.length > pageSize && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-surface-sunken/30">
                    <span className="typo-label-sm text-muted">
                        Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, items.length)} of {items.length}
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="compact"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Prev
                        </Button>
                        <span className="typo-label-sm text-muted px-2">
                            Page {page} of {Math.ceil(items.length / pageSize)}
                        </span>
                        <Button
                            variant="ghost"
                            size="compact"
                            onClick={() => setPage(p => Math.min(Math.ceil(items.length / pageSize), p + 1))}
                            disabled={page >= Math.ceil(items.length / pageSize)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </TableSection>
    );
};
