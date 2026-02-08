import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { PODetail, POItem, PODelivery, POHeader } from '@/types';
import { api } from '@/lib/api';

// PO Service functions (inlined from deleted services/poService.ts)
interface SavePOResult {
    success: boolean;
    message?: string;
    error?: string;
}

async function savePO(data: PODetail): Promise<SavePOResult> {
    if (!data?.header?.po_number) {
        return { success: false, error: "PO number is required" };
    }

    try {
        await api.updatePO(data.header.po_number, data.header, data.items);
        return { success: true, message: "PO saved successfully" };
    } catch (error) {
        console.error("Error saving PO:", error);
        const message = error instanceof Error ? error.message : "Failed to save PO";
        return { success: false, error: message };
    }
}

async function createPO(data: PODetail): Promise<SavePOResult> {
    try {
        await api.createPO(data);
        return { success: true, message: "PO created successfully" };
    } catch (error) {
        console.error("Error creating PO:", error);
        const message = error instanceof Error ? error.message : "Failed to create PO";
        return { success: false, error: message };
    }
}

interface POState {
    data: PODetail | null;
    setPO: (po: PODetail | null) => void;
    setHeader: (header: POHeader) => void;
    setItems: (items: POItem[]) => void;
    updateHeader: <K extends keyof POHeader>(field: K, value: POHeader[K]) => void;
    updateItem: <K extends keyof POItem>(index: number, field: K, value: POItem[K]) => void;
    addItem: () => void;
    removeItem: (index: number) => void;
    addDelivery: (itemIdx: number) => void;
    removeDelivery: (itemIdx: number, deliveryIdx: number) => void;
    updateDelivery: <K extends keyof PODelivery>(itemIdx: number, deliveryIdx: number, field: K, value: PODelivery[K]) => void;
    savePO: (data?: PODetail) => Promise<{ success: boolean; error?: string }>;
    reset: () => void;
}

export const usePOStore = create<POState>((set) => ({
    data: null,
    setPO: (po) => set({ data: po }),
    setHeader: (header) => set((state) => ({
        data: state.data ? { ...state.data, header } : { header, items: [] }
    })),
    setItems: (items) => set((state) => ({
        data: state.data ? { ...state.data, items } : { header: {} as any, items }
    })),
    updateHeader: (field, value) => set((state) => {
        if (!state.data) return state;
        return {
            data: {
                ...state.data,
                header: { ...state.data.header, [field]: value }
            }
        };
    }),
    updateItem: (index, field, value) => set((state) => {
        if (!state.data || !state.data.items) return state;
        const newItems = [...state.data.items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Auto-calculate item value if rate or quantity changes
        if (field === "po_rate" || field === "ord_qty") {
            newItems[index].item_value =
                (newItems[index].ord_qty || 0) * (newItems[index].po_rate || 0);
        }

        return { data: { ...state.data, items: newItems } };
    }),
    addItem: () => set((state) => {
        if (!state.data) return state;
        const items = state.data.items || [];
        const maxItemNo = Math.max(...items.map((i) => i.po_item_no || 0), 0);
        const newItem: POItem = {
            po_item_no: maxItemNo + 1,
            material_code: "",
            material_description: "NEW PROCUREMENT ITEM",
            drg_no: "",
            unit: "NOS",
            ord_qty: 0,
            po_rate: 0,
            item_value: 0,
            dsp_qty: 0,
            hsn_code: "",
            mtrl_cat: undefined, // No default - must be explicitly set
            deliveries: [{
                lot_no: 1,
                ord_qty: 0,
                dsp_qty: 0,
                rcd_qty: 0,
                dely_date: new Date().toISOString().split("T")[0],
                entry_allow_date: undefined,
                dest_code: parseInt(state.data.header.department_no || "1", 10),
            }],
        };
        return { data: { ...state.data, items: [...items, newItem] } };
    }),
    removeItem: (index) => set((state) => {
        if (!state.data || !state.data.items) return state;
        const newItems = state.data.items.filter((_, i) => i !== index);
        return { data: { ...state.data, items: newItems } };
    }),
    addDelivery: (itemIdx) => set((state) => {
        if (!state.data || !state.data.items) return state;
        const newItems = [...state.data.items];
        const item = newItems[itemIdx];
        const deliveries = item.deliveries || [];
        const maxLotNo = Math.max(...deliveries.map((d) => d.lot_no || 0), 0);
        const newLot: PODelivery = {
            lot_no: maxLotNo + 1,
            ord_qty: 0,
            dsp_qty: 0,
            rcd_qty: 0,
            dely_date: new Date().toISOString().split("T")[0],
            entry_allow_date: undefined,
            dest_code: item.deliveries?.[0]?.dest_code || parseInt(state.data.header.department_no || "1"),
        };
        newItems[itemIdx].deliveries = [...deliveries, newLot];
        return { data: { ...state.data, items: newItems } };
    }),
    removeDelivery: (itemIdx, deliveryIdx) => set((state) => {
        if (!state.data || !state.data.items) return state;
        const newItems = [...state.data.items];
        const item = newItems[itemIdx];
        if (item.deliveries.length <= 1) return state; // Enforce minimum 1 lot

        newItems[itemIdx].deliveries = item.deliveries.filter((_, i) => i !== deliveryIdx);

        // Recalculate parent quantity
        newItems[itemIdx].ord_qty = newItems[itemIdx].deliveries.reduce(
            (sum, d) => sum + (d.ord_qty || 0), 0
        );
        newItems[itemIdx].item_value =
            (newItems[itemIdx].ord_qty || 0) * (newItems[itemIdx].po_rate || 0);

        return { data: { ...state.data, items: newItems } };
    }),
    updateDelivery: (itemIdx, deliveryIdx, field, value) => set((state) => {
        if (!state.data || !state.data.items) return state;
        const newItems = [...state.data.items];
        const item = newItems[itemIdx];
        const newDeliveries = [...item.deliveries];
        newDeliveries[deliveryIdx] = { ...newDeliveries[deliveryIdx], [field]: value };
        newItems[itemIdx].deliveries = newDeliveries;

        // Auto-recalculate parent item's total quantity, value, and dsp_qty if lot data changed
        if (field === "ord_qty" || field === "manual_override_qty") {
            const totalQty = newDeliveries.reduce((sum, d) => sum + (Number(d.ord_qty) || 0), 0);
            const totalDsp = newDeliveries.reduce((sum, d) =>
                sum + (Number(d.manual_override_qty) || Number(d.dsp_qty) || 0), 0);

            newItems[itemIdx].ord_qty = totalQty;
            newItems[itemIdx].item_value = totalQty * (newItems[itemIdx].po_rate || 0);
            newItems[itemIdx].dsp_qty = totalDsp;
            newItems[itemIdx].pending_qty = Math.max(0, totalQty - totalDsp);
        }

        return { data: { ...state.data, items: newItems } };
    }),
    savePO: async (data?: PODetail) => {
        const poData = data || usePOStore.getState().data;
        if (!poData) return { success: false, error: 'No PO data to save' };

        try {
            const result = await savePO(poData);
            return { success: result.success, error: result.error };
        } catch (error) {
            return { success: false, error: 'Failed to save PO' };
        }
    },
    reset: () => set({ data: null }),
}));

// Optimized Selectors - Prevent unnecessary re-renders
export const usePOHeader = () => usePOStore(useShallow(s => s.data?.header));
export const usePOItems = () => usePOStore(useShallow(s => s.data?.items || []));
export const usePOActions = () => usePOStore(useShallow(s => ({
    setPO: s.setPO,
    setHeader: s.setHeader,
    setItems: s.setItems,
    updateHeader: s.updateHeader,
    updateItem: s.updateItem,
    addItem: s.addItem,
    removeItem: s.removeItem,
    addDelivery: s.addDelivery,
    removeDelivery: s.removeDelivery,
    updateDelivery: s.updateDelivery,
    savePO: s.savePO,
    reset: s.reset
})));
