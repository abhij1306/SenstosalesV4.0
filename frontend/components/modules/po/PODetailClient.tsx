"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PODetail } from "@/types";
import { QUANTITY_TOLERANCE } from "@/lib/constants";
import { usePOStore, usePOActions, usePOHeader, usePOItems } from "@/store/poStore";
import { LinkedDocsPopover } from "./LinkedDocsPopover";
import { api } from "@/lib/api";

import { HugeiconsIcon } from "@hugeicons/react";
import {
    FloppyDiskIcon as Save,
    Cancel01Icon as X,
    PencilEdit02Icon as Edit,
    ShoppingCart01Icon as ShoppingCart,
    PlusSignIcon as Plus,
    Link02Icon as Link2,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/common";
import { DeviationsSection } from "./DeviationsSection";
import { PODetailInfo } from "./PODetailInfo";
import { PODetailItems } from "./PODetailItems";
import { PageHeader, Layout } from "@/components/patterns";

interface PODetailClientProps {
    initialPO: PODetail | null;
    initialDC?: { has_dc: boolean; dc_id?: string; dc_date?: string } | null;
}

// Progress bar component for fulfillment
const FulfillmentProgress = ({
    dispatched,
    received,
    total
}: {
    dispatched: number;
    received: number;
    total: number;
}) => {
    const dispatchedPct = total > 0 ? Math.round((dispatched / total) * 100) : 0;
    const receivedPct = total > 0 ? Math.round((received / total) * 100) : 0;

    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 min-w-48">
                <div className="flex-1 h-2 bg-surface-sunken rounded-full overflow-hidden flex">
                    {/* Received segment (green) */}
                    <div
                        className="h-full bg-success"
                        style={{ width: `${receivedPct}%` }}
                    />
                    {/* Dispatched but not received segment (blue) */}
                    <div
                        className="h-full bg-primary"
                        style={{ width: `${dispatchedPct - receivedPct}%` }}
                    />
                </div>
            </div>
            <div className="flex items-center gap-3 typo-body-sm">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-muted">{dispatchedPct}% Dispatched</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-muted">{receivedPct}% Received</span>
                </div>
            </div>
        </div>
    );
};

export function PODetailClient({
    initialPO,
    initialDC,
}: PODetailClientProps) {
    const router = useRouter();
    const { setPO, savePO } = usePOActions();
    const storeHeader = usePOHeader();
    const storeData = usePOStore((state) => state.data);
    const storeItems = React.useMemo(() => storeData?.items || [], [storeData]);

    const isStoreCurrent = storeHeader?.po_number === initialPO?.header?.po_number;
    const header = isStoreCurrent ? storeHeader : initialPO?.header;
    const items = isStoreCurrent ? storeItems : initialPO?.items || [];

    const [activeTab, setActiveTab] = useState("basic");
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
    const [editMode, setEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [linkCount, setLinkCount] = useState(0);

    const hasHydratedRef = React.useRef(false);
    useEffect(() => {
        if (initialPO && !hasHydratedRef.current) {
            hasHydratedRef.current = true;
            setPO(initialPO);
        }
    }, [initialPO, setPO]);

    useEffect(() => {
        const fetchLinkCount = async () => {
            if (header?.po_number) {
                try {
                    const res = await api.getLinkedDocuments("PO", header.po_number);
                    setLinkCount(res?.length ?? 0);
                } catch (err) {
                    // Error handled via UI state
                }
            }
        };
        fetchLinkCount();
    }, [header?.po_number]);

    useEffect(() => {
        if (items) {
            setExpandedItems(new Set(items.map(i => i.po_item_no)));
        }
    }, [items]);

    const toggleItem = (id: number) => {
        const next = new Set(expandedItems);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedItems(next);
    };

    // Calculate fulfillment totals
    const { totalOrdered, totalDispatched, totalReceived } = useMemo(() => {
        if (!items) return { totalOrdered: 0, totalDispatched: 0, totalReceived: 0 };

        return items.reduce((acc, item) => {
            const ord = item.deliveries && item.deliveries.length > 0
                ? item.deliveries.reduce((sum: number, d) => sum + (d.ord_qty || 0), 0)
                : (item.ord_qty || 0);
            return {
                totalOrdered: acc.totalOrdered + ord,
                totalDispatched: acc.totalDispatched + (item.dsp_qty || 0),
                totalReceived: acc.totalReceived + (item.rcd_qty || 0),
            };
        }, { totalOrdered: 0, totalDispatched: 0, totalReceived: 0 });
    }, [items]);

    if (!header) return null;

    const isClosed = ["Closed", "Completed", "Cancelled", "Delivered"].includes(header.po_status || "");
    const isFullyDispatched = totalOrdered > 0 && totalDispatched >= totalOrdered;
    const hasDispatchableItems = items.some((item) => {
        if (item.deliveries?.length > 0) {
            return item.deliveries.some((del) => (del.ord_qty || 0) - (del.dsp_qty || 0) > QUANTITY_TOLERANCE);
        }
        return (item.ord_qty || 0) - (item.dsp_qty || 0) > QUANTITY_TOLERANCE;
    }) ?? false;
    const shouldDisableGenerateDC = isClosed || isFullyDispatched || !hasDispatchableItems;

    // Header action buttons
    const headerActions = (
        <div className="flex items-center gap-2">
            {editMode ? (
                <>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditMode(false)}
                        disabled={isSaving}
                    >
                        <HugeiconsIcon icon={X} className="w-4 h-4 mr-1" />
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={async () => {
                            setIsSaving(true);
                            try {
                                await savePO(storeData || undefined);
                                setEditMode(false);
                            } catch (e) {
                                alert("Failed to save PO updates");
                            } finally {
                                setIsSaving(false);
                            }
                        }}
                        disabled={isSaving}
                    >
                        <HugeiconsIcon icon={Save} className="w-4 h-4 mr-1" />
                        {isSaving ? "Saving..." : "Save"}
                    </Button>
                </>
            ) : (
                <>
                    <LinkedDocsPopover
                        docType="PO"
                        docNumber={header.po_number}
                        trigger={
                            <Button variant="outline" size="sm">
                                <HugeiconsIcon icon={Link2} className="w-4 h-4 mr-1" />
                                Chain ({linkCount})
                            </Button>
                        }
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditMode(true)}
                    >
                        <HugeiconsIcon icon={Edit} className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                </>
            )}
            <Button
                variant="primary"
                size="sm"
                disabled={shouldDisableGenerateDC}
                title={shouldDisableGenerateDC ? "All quantities already delivered" : "Generate Delivery Challan"}
                onClick={() => router.push(`/dc/create?po=${header.po_number}`)}
            >
                <HugeiconsIcon icon={Plus} className="w-4 h-4 mr-1" />
                Create Challan
            </Button>
        </div>
    );

    return (
        <div className={Layout.colGap}>
            {/* Header with progress bar */}
            <PageHeader
                title={header.po_number}
                subtitle={
                    <FulfillmentProgress
                        dispatched={totalDispatched}
                        received={totalReceived}
                        total={totalOrdered}
                    />
                }
                onBack={() => router.push("/po")}
                action={headerActions}
            />

            {/* Content */}
            <div className="space-y-4">
                <DeviationsSection poNumber={header.po_number} />

                <PODetailInfo
                    itemsCount={items.length}
                    editMode={editMode}
                    onSRVClick={(id) => router.push(`/srv/${id}`)}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />

                <PODetailItems
                    editMode={editMode}
                    expandedItems={expandedItems}
                    toggleItem={toggleItem}
                    totalOrdered={totalOrdered}
                    totalDispatched={totalDispatched}
                    totalReceived={totalReceived}
                />
            </div>
        </div>
    );
}
