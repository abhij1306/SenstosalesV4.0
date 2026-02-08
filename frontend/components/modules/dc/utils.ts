export interface GroupedDCItem {
    key: string;
    lots: any[];
    firstLot: any;
    totalDelivered: number;
    currentInput: number;
    balance: number;
    globalIndex: number;
}

/**
 * Groups DC items by their PO item ID or material code
 * and calculates aggregates for each group.
 */
export const groupDCItems = (items: any[], editable: boolean = false): GroupedDCItem[] => {
    const grouped: Record<string, any[]> = {};

    items.forEach((item: any) => {
        // Use po_item_id as primary grouping key, fallback to others
        const key = item.po_item_id || item.po_item_no || item.material_code;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
    });

    return Object.entries(grouped).map(([key, lots], index) => {
        const firstLot = lots[0];
        const totalDelivered = lots.reduce((sum, l) => sum + (l.dsp_qty || l.dispatch_qty || 0), 0);
        const currentInput = firstLot.dispatch_qty || 0;

        // Logical check for balance:
        // If editable (DC Create/Draft), show what's left after this input
        // If viewing (DC View), show what was pending at that time or current status
        const balance = editable
            ? ((firstLot.original_pending || 0) - currentInput)
            : (firstLot.pending_qty ?? ((firstLot.ord_qty || 0) - totalDelivered));

        return {
            key,
            lots,
            firstLot,
            totalDelivered,
            currentInput,
            balance,
            globalIndex: index
        };
    });
};

/**
 * Calculates the total value of dispatched items
 */
export const calculateTotalValue = (items: any[]): number => {
    return items.reduce((sum, i) => sum + ((i.dispatch_qty || i.dsp_qty || 0) * (i.po_rate || 0)), 0);
};
