"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/components/common/Toast";

/**
 * Entity types supported by the hook
 */
export type EntityType = 'DC' | 'Invoice' | 'PO' | 'SRV';

/**
 * Options for useDetailActions hook
 */
export interface UseDetailActionsOptions<T> {
    /** Entity type for toast messages */
    entityType: EntityType;
    /** The ID of the entity being edited */
    entityId: string | number;
    /** Callback to perform the update - receives the edited data */
    onUpdate: (data: T) => Promise<void>;
    /** Callback when save succeeds */
    onSaveSuccess?: (data: T) => void;
    /** Callback when edit mode changes */
    onEditModeChange?: (isEditing: boolean) => void;
}

/**
 * Return type for useDetailActions hook
 */
export interface UseDetailActionsResult<T> {
    /** Whether the component is in edit mode */
    isEditing: boolean;
    /** Whether a save operation is in progress */
    isSaving: boolean;
    /** The current edited data */
    editData: T | null;
    /** Function to start editing with the current data */
    startEditing: (data: T) => void;
    /** Function to cancel editing and discard changes */
    cancelEditing: () => void;
    /** Function to save the edited data */
    handleSave: () => Promise<void>;
    /** Function to update a single field in edit data */
    updateField: (field: keyof T, value: unknown) => void;
    /** Set edit mode externally */
    setIsEditing: (value: boolean) => void;
}

/**
 * useDetailActions Hook
 * 
 * Extracts the common edit/save/cancel pattern from detail pages.
 * Eliminates code duplication across DC, Invoice, PO, and SRV detail clients.
 * 
 * @example
 * ```tsx
 * const {
 *     isEditing,
 *     isSaving,
 *     editData,
 *     startEditing,
 *     cancelEditing,
 *     handleSave,
 *     updateField
 * } = useDetailActions<DCHeader>({
 *     entityType: 'DC',
 *     entityId: dcNumber,
 *     onUpdate: (data) => api.updateDCMetadata(dcNumber, data),
 *     onSaveSuccess: (data) => setDC({ ...displayData, header: data })
 * });
 * ```
 */
export function useDetailActions<T>(
    options: UseDetailActionsOptions<T>
): UseDetailActionsResult<T> {
    const { entityType, entityId, onUpdate, onSaveSuccess, onEditModeChange } = options;
    const { toast } = useToast();

    const [isEditing, setIsEditingState] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editData, setEditData] = useState<T | null>(null);

    /**
     * Start editing mode with the current data
     */
    const startEditing = useCallback((data: T) => {
        setEditData({ ...data });
        setIsEditingState(true);
        onEditModeChange?.(true);
    }, [onEditModeChange]);

    /**
     * Cancel editing and discard changes
     */
    const cancelEditing = useCallback(() => {
        setEditData(null);
        setIsEditingState(false);
        onEditModeChange?.(false);
    }, [onEditModeChange]);

    /**
     * Update a single field in the edit data
     */
    const updateField = useCallback((field: keyof T, value: unknown) => {
        setEditData(prev => prev ? { ...prev, [field]: value } : null);
    }, []);

    /**
     * Save the edited data
     */
    const handleSave = useCallback(async () => {
        if (!editData) {
            toast("Error", `No ${entityType} data to save`, "error");
            return;
        }

        setIsSaving(true);
        try {
            await onUpdate(editData);
            toast("Update Success", `${entityType} ${entityId} updated successfully`, "success");
            setIsEditingState(false);
            onEditModeChange?.(false);
            onSaveSuccess?.(editData);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            toast("Update Failed", errorMessage, "error");
        } finally {
            setIsSaving(false);
        }
    }, [editData, entityType, entityId, onUpdate, onSaveSuccess, onEditModeChange, toast]);

    /**
     * Set edit mode externally
     */
    const setIsEditing = useCallback((value: boolean) => {
        setIsEditingState(value);
        onEditModeChange?.(value);
    }, [onEditModeChange]);

    return {
        isEditing,
        isSaving,
        editData,
        startEditing,
        cancelEditing,
        handleSave,
        updateField,
        setIsEditing,
    };
}
