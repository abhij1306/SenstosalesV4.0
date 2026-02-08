"use client";

import React, { useState, useCallback } from "react";
import { ActionConfirmationModal } from "@/components/common/ActionConfirmationModal";

/**
 * Confirmation modal state
 */
interface ModalState {
    isOpen: boolean;
    title: string;
    warningText: string;
    confirmLabel: string;
    variant: "danger" | "warning" | "info";
    isLoading: boolean;
}

/**
 * Default values for confirmation modal
 */
const DEFAULT_MODAL_STATE: ModalState = {
    isOpen: false,
    title: "",
    warningText: "",
    confirmLabel: "Confirm",
    variant: "warning",
    isLoading: false,
};

/**
 * Configuration for opening the confirmation modal
 */
interface OpenConfirmationConfig {
    title: string;
    warningText: string;
    confirmLabel?: string;
    variant?: "danger" | "warning" | "info";
}

/**
 * Options for useConfirmationModal hook
 */
interface UseConfirmationModalOptions {
    /** Callback when confirmation is confirmed */
    onConfirm: () => Promise<void> | void;
    /** Callback when modal is closed */
    onClose?: () => void;
}

/**
 * useConfirmationModal Hook
 * 
 * Extracts the common delete/confirmation modal pattern from detail pages.
 * Provides a clean API for triggering confirmations without duplicating modal code.
 */
export function useConfirmationModal(
    options: UseConfirmationModalOptions
): {
    modal: React.ReactNode;
    open: (config: OpenConfirmationConfig) => void;
    close: () => void;
} {
    const { onConfirm, onClose } = options;
    const [state, setState] = useState<ModalState>(DEFAULT_MODAL_STATE);

    const open = useCallback((config: OpenConfirmationConfig) => {
        setState({
            isOpen: true,
            title: config.title,
            warningText: config.warningText,
            confirmLabel: config.confirmLabel || "Confirm",
            variant: config.variant || "warning",
            isLoading: false,
        });
    }, []);

    const close = useCallback(() => {
        setState(DEFAULT_MODAL_STATE);
        onClose?.();
    }, [onClose]);

    const handleConfirm = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true }));
        try {
            await onConfirm();
            close();
        } catch {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [onConfirm, close]);

    const modal = (
        <ActionConfirmationModal
            isOpen={state.isOpen}
            onClose={close}
            onConfirm={handleConfirm}
            title={state.title}
            warningText={state.warningText}
            confirmLabel={state.confirmLabel}
            variant={state.variant}
            isLoading={state.isLoading}
        />
    );

    return { modal, open, close };
}

/**
 * Hook for generic yes/no confirmations
 */
export function useYesNoConfirmation(
    onYes: () => Promise<void> | void,
    onNo?: () => void
): {
    modal: React.ReactNode;
    confirm: (config: { title: string; message: string }) => void;
    yes: () => void;
    no: () => void;
} {
    const [state, setState] = useState({
        isOpen: false,
        title: "",
        message: "",
        isLoading: false,
    });

    const yes = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true }));
        try {
            await onYes();
            setState({ isOpen: false, title: "", message: "", isLoading: false });
        } catch {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [onYes]);

    const no = useCallback(() => {
        setState({ isOpen: false, title: "", message: "", isLoading: false });
        onNo?.();
    }, [onNo]);

    const confirm = useCallback((config: { title: string; message: string }) => {
        setState({
            isOpen: true,
            title: config.title,
            message: config.message,
            isLoading: false,
        });
    }, []);

    const modal = (
        <ActionConfirmationModal
            isOpen={state.isOpen}
            onClose={no}
            onConfirm={yes}
            title={state.title}
            warningText={state.message}
            confirmLabel="Yes"
            variant="info"
            isLoading={state.isLoading}
        />
    );

    return { modal, confirm, yes, no };
}
