"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "./Dialog";
import { Button } from "./Button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface ActionConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    subtitle?: string;
    warningText?: string;
    message?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "info";
    isLoading?: boolean;
}

const statusColors = {
    danger: {
        bg: "bg-error/10",
        text: "text-error",
        border: "border-error/20",
        button: "destructive" as const,
    },
    warning: {
        bg: "bg-warning/10",
        text: "text-warning",
        border: "border-warning/20",
        button: "primary" as const,
    },
    info: {
        bg: "bg-primary/10",
        text: "text-primary",
        border: "border-primary/20",
        button: "primary" as const,
    },
};

export function ActionConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    subtitle,
    warningText,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "warning",
    isLoading = false,
}: ActionConfirmationModalProps) {
    const colors = statusColors[variant];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && !isLoading) {
                onClose();
            }
        }}>
            <DialogContent className="max-w-modal-sm bg-surface border border-border rounded-lg p-0">
                <DialogHeader className="items-center text-center pt-6 pb-2">
                    <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
                        colors.bg,
                        colors.text,
                        "border",
                        colors.border
                    )}>
                        <HugeiconsIcon icon={Alert02Icon} className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <DialogTitle className="typo-title-lg">
                            {title}
                        </DialogTitle>
                        {subtitle ? (
                            <DialogDescription className="typo-body-md text-secondary">
                                {subtitle}
                            </DialogDescription>
                        ) : (
                            <DialogDescription className="sr-only">
                                Confirmation dialog for {title}
                            </DialogDescription>
                        )}
                    </div>
                </DialogHeader>

                {warningText && (
                    <div className="px-6 py-3 text-center">
                        <p className="typo-body-md">
                            {warningText}
                        </p>
                    </div>
                )}
                {message && (
                    <div className="px-6 py-3 text-center">
                        {message}
                    </div>
                )}

                <DialogFooter className="flex gap-2 px-6 pb-6">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={colors.button}
                        size="sm"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1"
                    >
                        {isLoading ? (
                            <>
                                <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin mr-1.5" />
                                <span>Wait...</span>
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
