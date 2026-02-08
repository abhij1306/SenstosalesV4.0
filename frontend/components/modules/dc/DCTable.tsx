"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon as ChevronDown, ArrowRight01Icon as CornerDownRight, PlusSignIcon as Plus, Delete02Icon as Trash2 } from "@hugeicons/core-free-icons";
import {
    Card, Flex, Stack, Pagination, Button, Input, Badge, GranularInput, QuantityInput
} from "@/components/common/index";

import {
    CellNum,
    CellCurr,
    CellMaterial,
    CellBadge,
    CellUnit
} from "@/components/ui/table";
import { TableHeader } from "@/components/patterns/detail";
import { Label, Text, Mono } from "@/components/ui";
import { cn } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

interface DCTableProps {
    items: any[];
    editable?: boolean;
    onUpdateItem?: (index: number, key: string, value: any) => void;
    expandedItems: Set<string>;
    onToggleItem: (id: string) => void;
    // Notes/Provisions for create flow
    notes?: string[];
    onAddNote?: () => void;
    onUpdateNote?: (index: number, value: string) => void;
    onRemoveNote?: (index: number) => void;
    headerData?: any;
}

export function DCTable({
    items,
    editable = false,
    onUpdateItem,
    expandedItems,
    onToggleItem,
    notes,
    onAddNote,
    onUpdateNote,
    onRemoveNote,
    headerData
}: DCTableProps) {

    const groupedItems = React.useMemo(() => {
        const grouped: Record<string, any[]> = {};
        items.forEach((item: any) => {
            const key = item.po_item_id || item.po_item_no || item.material_code;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(item);
        });
        return grouped;
    }, [items]);

    const allGroups = React.useMemo(() => Object.entries(groupedItems), [groupedItems]);

    // Pagination State
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);

    const paginatedGroups = React.useMemo(() => {
        const start = (page - 1) * pageSize;
        return allGroups.slice(start, start + pageSize);
    }, [allGroups, page, pageSize]);

    return (
        <Stack gap={3} align="stretch" className="w-full">
            <Flex align="center" justify="between" className="px-2">
                <div>
                    <Label size="sm">Procurement Structure</Label>
                </div>
                {!editable && (
                    <div className="flex items-center gap-2">
                        <Label size="sm" field>Status:</Label>
                        <Badge variant="success">Finalized</Badge>
                    </div>
                )}
            </Flex>

            <div className="spatial-card-v2 glow-border-v2 flex flex-col overflow-hidden mt-6">

                <div className="overflow-x-auto">
                    <table className="w-full text-left table-fixed">
                        <thead>
                            <tr className="bg-surface-sunken border-none h-[40px] relative z-10 transition-colors">
                                <TableHeader width="50px" align="center">Item</TableHeader>
                                <TableHeader width="auto" align="left">Material Details</TableHeader>
                                <TableHeader width="60px" align="center">Unit</TableHeader>
                                <TableHeader width="90px" align="right">Rate</TableHeader>
                                <TableHeader width="90px" align="center">Ordered</TableHeader>
                                <TableHeader width="130px" align="center">Dispatched</TableHeader>
                                <TableHeader width="110px" align="right">Value</TableHeader>
                                <TableHeader width="40px"> </TableHeader>
                            </tr>
                        </thead>
                        <tbody className="divide-none">
                            {paginatedGroups.map(([key, lots], groupIdxMap) => {
                                const groupIdx = (page - 1) * pageSize + groupIdxMap;
                                const firstLot = lots[0];
                                const showLots = lots.length > 1 && !editable;
                                const isExpanded = expandedItems.has(key) && !editable;

                                const totalDelivered = lots.reduce((sum, l) => sum + (l.dsp_qty || l.dispatch_qty || 0), 0);
                                // Balance = Ordered - Delivered (This DC). Note: If editing, original_pending is used for max, but display should be simple.
                                // If this is a View (saved DC), balance is what's left.
                                // However, simple math: Ord - This_DC_Qty gives context of "Remaining for this Item".
                                // But wait, if there were OTHER DCs, this math is wrong.
                                // Better to rely on backend pending if available, or just hide if complex.
                                // I'll show Balance = Ordered - TotalDelivered (This DC) ??? No.
                                // Let's just REMOVE "Received" column and widen others or leave empty.
                                // Actually, let's show "Balance" as "Pending Qty" from backend if available.
                                // item.pending_qty often exists.
                                // Reactive Balance Calculation:
                                // If creation mode: original_pending - current_dispatch_qty
                                // If view mode: (Ordered - Already_Dispatched)
                                const currentInput = firstLot.dispatch_qty || 0;
                                const balance = editable
                                    ? ((firstLot.original_pending || 0) - currentInput)
                                    : (firstLot.pending_qty ?? ((firstLot.ord_qty || 0) - totalDelivered));

                                return (
                                    <React.Fragment key={key}>
                                        <tr
                                            className={cn(
                                                "transition-all duration-300 border-none h-[44px]",
                                                editable ? "bg-surface-sunken/10" : "hover:bg-action-primary/5 cursor-pointer group"
                                            )}
                                            onClick={() => !editable && onToggleItem(key)}
                                        >
                                            <td className="border-none text-center align-top py-2 px-3 typo-label-md">
                                                {firstLot.po_item_no || "—"}
                                            </td>
                                            <td className="border-none align-top py-2 px-3">
                                                <CellMaterial
                                                    code={firstLot.material_code}
                                                    description={firstLot.description || firstLot.material_description}
                                                >
                                                    <CellBadge label="CAT" value={firstLot.mtrl_cat} />
                                                    <CellBadge label="DRG" value={firstLot.drg_no} />
                                                </CellMaterial>
                                            </td>

                                            {!showLots || !editable ? (
                                                <>
                                                    <td className="border-none text-center align-top py-2 px-3">
                                                        <CellUnit value={firstLot.unit} />
                                                    </td>
                                                    <td className="border-none text-right align-top py-2 px-3">
                                                        <CellCurr value={firstLot.po_rate} />
                                                    </td>
                                                    <td className="border-none text-center align-top py-2 px-3">
                                                        <CellNum value={firstLot.ord_qty} />
                                                    </td>

                                                    <td className="border-none text-center typo-body bg-surface align-top py-2 px-3 transition-colors">
                                                        {(editable && onUpdateItem) ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <QuantityInput
                                                                    value={firstLot.dispatch_qty || 0}
                                                                    onChange={(val: number) => onUpdateItem(groupIdx, "dispatch_qty", val)}
                                                                    max={firstLot.original_pending || 999999}
                                                                    className="h-8 w-[100px]"
                                                                />
                                                                <Label size="sm" className="typo-label-md text-tertiary">Balance:</Label>
                                                                <CellNum
                                                                    value={balance}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <CellNum value={totalDelivered} />
                                                        )}
                                                    </td>

                                                    <td className="border-none text-right align-top py-2 px-3">
                                                        <CellNum value={firstLot.rcd_qty || 0} />
                                                    </td>
                                                    <td className="text-right align-top py-2 px-3 truncate max-w-[140px]">
                                                        <CellCurr value={editable ? (currentInput * (firstLot.po_rate || 0)) : (totalDelivered * (firstLot.po_rate || 0))} />
                                                    </td>
                                                    <td className="text-center align-top py-2 px-3 border-none">
                                                        {!editable && showLots && <HugeiconsIcon icon={ChevronDown} size={16} className="text-muted opacity-50 transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }} />}
                                                    </td>
                                                </>
                                            ) : (
                                                <td className="typo-body-sm text-subtle" colSpan={6}>
                                                    {/* Hidden in strict item-level edit mode */}
                                                </td>
                                            )}
                                        </tr>

                                        {showLots && !editable && isExpanded && lots.map((lot) => (
                                            <tr key={lot.id} className="bg-surface hover:bg-surface-sunken/40 transition-colors">
                                                <td className="border-none"></td>
                                                <td className="border-none"></td>
                                                <td className="border-none align-top py-2 px-3 pl-8">
                                                    <div className="flex items-center gap-2">
                                                        <HugeiconsIcon icon={CornerDownRight} className="w-4 h-4 text-subtle opacity-40" />
                                                        <div>
                                                            <span className="typo-body-sm">Lot {lot.lot_no}</span>
                                                            {lot.dely_date && (
                                                                <span className="ml-2 typo-body-sm text-subtle">
                                                                    (Due: {lot.dely_date})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="border-none text-center align-top py-2 px-3">
                                                    <CellUnit value={lot.unit} />
                                                </td>
                                                <td className="border-none text-center align-top py-2 px-3 opacity-50">
                                                    <CellCurr value={lot.po_rate} />
                                                </td>
                                                <td className="border-none text-center align-top py-2 px-3">
                                                    <CellNum value={lot.ord_qty} />
                                                </td>
                                                <td className="border-none text-center bg-surface transition-colors align-top py-2 px-3">
                                                    <CellNum value={lot.dsp_qty || 0} />
                                                </td>
                                                <td className="text-right align-top py-2 px-3 pr-4">
                                                    <CellCurr value={(lot.dsp_qty || lot.dispatch_qty || 0) * (lot.po_rate || 0)} />
                                                </td>
                                                <td></td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })}

                            {editable && (
                                <>
                                    <tr className="border-t border-border-default/10 bg-surface-sunken transition-colors">
                                        <td colSpan={7} className="text-center typo-label-md uppercase border-none p-1.5">
                                            Policy Provisions & Terms
                                        </td>
                                        <td colSpan={2} className="text-center typo-body-sm p-1.5 border-none">
                                            Total Dispatched Value
                                        </td>
                                    </tr>
                                    <tr className="bg-surface">
                                        <td colSpan={7} className="align-top border-none p-3 min-h-[180px]">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2 bg-primary/10 py-1 px-3 rounded-xl border border-primary/20 mb-2 shadow-sm glass-pane-v2">
                                                    <span className="typo-label-md text-primary opacity-80">GC</span>
                                                    <span className="flex-1 typo-body text-foreground">
                                                        Guarantee Certificate No. {headerData?.gc_number || headerData?.dc_number || "—"} Dt. {headerData?.gc_date || headerData?.dc_date || "—"}
                                                    </span>
                                                    <Text size="xs" weight="semibold" className="text-primary">AUTO</Text>
                                                </div>

                                                <div className="flex items-center gap-2 bg-primary/10 py-1 px-3 rounded-xl border border-primary/20 mb-2 shadow-sm glass-pane-v2">
                                                    <span className="typo-label-md text-primary opacity-80">VAL</span>
                                                    <span className="flex-1 typo-body text-foreground">
                                                        Consignment value: {items.reduce((sum, i) => sum + ((i.dispatch_qty || 0) * (i.po_rate || 0)), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })}
                                                    </span>
                                                    <Text size="xs" weight="semibold" className="text-primary">AUTO</Text>
                                                </div>

                                                {notes?.map((note, nIdx) => (
                                                    <div key={nIdx} className="flex items-center gap-2 bg-surface h-7 px-3 rounded-xl border border-border-default/10 shadow-sm group hover:border-action-primary/30 transition-all">
                                                        <input
                                                            type="text"
                                                            value={note}
                                                            onChange={(e) => onUpdateNote?.(nIdx, e.target.value)}
                                                            className="flex-1 bg-transparent border-transparent p-0 typo-body-sm text-muted focus:ring-0 outline-none"
                                                        />
                                                        <Button
                                                            onClick={() => onRemoveNote?.(nIdx)}
                                                            variant="ghost"
                                                            size="compact"
                                                            className="text-subtle/50 hover:text-error"
                                                        >
                                                            <HugeiconsIcon icon={Trash2} className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}

                                                <div className="flex items-center justify-center mt-2">
                                                    <Button
                                                        variant="secondary"
                                                        size="compact"
                                                        onClick={onAddNote}
                                                        className="text-action-primary"
                                                    >
                                                        <HugeiconsIcon icon={Plus} className="w-3 h-3" />
                                                        Add Row
                                                    </Button>
                                                </div>
                                            </div>
                                        </td>
                                        <td colSpan={2} className="align-top text-center p-4 bg-surface-sunken/5">
                                            <div className="mt-2 typo-mono-md">
                                                <Mono size="base" className="tabular-nums">{items.reduce((sum, i) => sum + ((i.dispatch_qty || 0) * (i.po_rate || 0)), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })}</Mono>
                                            </div>
                                        </td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

                {allGroups.length > pageSize && (
                    <div className="p-4 border-t border-border-default/10">
                        <Pagination
                            currentPage={page}
                            totalPages={Math.ceil(allGroups.length / pageSize)}
                            pageSize={pageSize}
                            totalItems={allGroups.length}
                            onPageChange={setPage}
                            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                            className="bg-transparent border-none"
                        />
                    </div>
                )}
            </div>
        </Stack>
    );
}
