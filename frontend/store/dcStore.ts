import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { DCDetail, DCItemRow, POHeader, DCHeader } from "@/types";
import { formatDate } from "@/lib/utils";

const generateDefaultNotes = (dcNumber: string = "", date?: string) => {
    const today = formatDate(date || new Date().toISOString());
    return [
        `GST Bill No.   Dt. ${today}`,
        "Dimension Report ",
        "TC No:-   dt.   Of ",
        "Lot No.   - ",
    ];
};

interface DCState {
    data: DCDetail | null;
    originalData: DCDetail | null;
    isEditing: boolean;
    poData: POHeader | null;
    notes: string[];
    isCheckingNumber: boolean;
    isDuplicateNumber: boolean;
    conflictType: string | null;

    setDC: (data: DCDetail) => void;
    setHeader: (header: DCHeader) => void;
    updateHeader: <K extends keyof DCHeader>(field: K, value: DCHeader[K]) => void;
    updateItem: <K extends keyof DCItemRow>(index: number, field: K, value: DCItemRow[K]) => void;
    setEditing: (isEditing: boolean) => void;
    reset: () => void;

    setPOData: (data: POHeader | null) => void;
    setItems: (items: DCItemRow[]) => void;
    setNotes: (notes: string[]) => void;
    addNote: () => void;
    updateNote: (index: number, value: string) => void;
    removeNote: (index: number) => void;
    setNumberStatus: (isChecking: boolean, isDuplicate: boolean, conflictType: string | null) => void;
    clear: () => void;
}

export const useDCStore = create<DCState>((set) => ({
    data: null,
    originalData: null,
    isEditing: false,
    poData: null,
    notes: generateDefaultNotes(),
    isCheckingNumber: false,
    isDuplicateNumber: false,
    conflictType: null,

    setDC: (data) => set({
        data,
        originalData: data,
        notes: data.header.remarks ? data.header.remarks.split("\n\n") : []
    }),
    setHeader: (header) => set((state) => ({
        data: state.data ? { ...state.data, header } : { header, items: [] }
    })),
    updateHeader: (field, value) => set((state) => {
        if (!state.data) return state;

        // Sync dates in notes if dc_date changes
        let newNotes = state.notes;
        if (field === "dc_date" && value) {
            const dateStr = formatDate(value);
            if (dateStr !== "-") {
                newNotes = state.notes.map((note, i) => {
                    // Update First line: GST Bill No
                    if (i === 0) {
                        if (note.includes("Dt.")) {
                            return note.replace(/Dt\..*$/, `Dt. ${dateStr}`);
                        }
                    }
                    return note;
                });
            }
        }

        return {
            notes: newNotes,
            data: {
                ...state.data,
                header: {
                    ...state.data.header,
                    [field]: value
                }
            }
        };
    }),
    updateItem: (index, field, value) => set((state) => {
        if (!state.data || !state.data.items) return state;
        const newItems = [...state.data.items];
        newItems[index] = { ...newItems[index], [field]: value };
        return {
            data: {
                ...state.data,
                items: newItems
            }
        };
    }),
    setEditing: (isEditing) => set({ isEditing }),
    reset: () => set((state) =>
        state.originalData
            ? { data: state.originalData, isEditing: false }
            : { data: null, isEditing: false, poData: null, notes: generateDefaultNotes() }
    ),

    setPOData: (poData) => set((state) => ({
        poData
    })),
    setItems: (items) => set((state) => ({
        data: state.data ? { ...state.data, items } : { header: {} as any, items }
    })),
    setNotes: (notes) => set({ notes }),
    addNote: () => set((state) => ({ notes: [...state.notes, ""] })),
    updateNote: (index, value) => set((state) => {
        const newNotes = [...state.notes];
        newNotes[index] = value;
        return { notes: newNotes };
    }),
    removeNote: (index) => set((state) => ({
        notes: state.notes.filter((_, i) => i !== index)
    })),
    setNumberStatus: (isCheckingNumber, isDuplicateNumber, conflictType) =>
        set({ isCheckingNumber, isDuplicateNumber, conflictType }),
    clear: () => set({
        data: null,
        originalData: null,
        poData: null,
        notes: generateDefaultNotes(),
        isEditing: false,
        isCheckingNumber: false,
        isDuplicateNumber: false,
        conflictType: null
    })
}));

// Optimized Selectors
export const useDCHeader = () => useDCStore(useShallow(s => s.data?.header));
export const useDCItems = () => useDCStore(useShallow(s => s.data?.items || []));
export const usePOData = () => useDCStore(useShallow(s => s.poData));
export const useDCNotes = () => useDCStore(useShallow(s => s.notes));
export const useDCNumberStatus = () => useDCStore(useShallow(s => ({
    isChecking: s.isCheckingNumber,
    isDuplicate: s.isDuplicateNumber,
    conflictType: s.conflictType
})));
export const useDCActions = () => useDCStore(useShallow(s => ({
    updateHeader: s.updateHeader,
    setHeader: s.setHeader,
    updateItem: s.updateItem,
    setPOData: s.setPOData,
    setItems: s.setItems,
    addNote: s.addNote,
    updateNote: s.updateNote,
    removeNote: s.removeNote,
    setNumberStatus: s.setNumberStatus,
    clear: s.clear
})));
