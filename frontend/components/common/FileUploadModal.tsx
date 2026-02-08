"use client";

import { useState, useRef, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "./Dialog";
import { Button } from "./Button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Upload01Icon, Loading03Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { fmtNum } from "@/lib/formatters";

export interface UploadResult {
    filename: string;
    success: boolean;
    message?: string;
    po_number?: string;
    status_type?: string;
    item_count?: number;
}

interface FileUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    files: File[];
    onUpload: (file: File) => Promise<UploadResult>;
    title?: string;
}

export function FileUploadModal({
    isOpen,
    onClose,
    files,
    onUpload,
    title = "Upload Files",
}: FileUploadModalProps) {
    const [progress, setProgress] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [stats, setStats] = useState({ success: 0, failed: 0 });
    const [isComplete, setIsComplete] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const cancelRef = useRef(false);

    useEffect(() => {
        if (isOpen && files?.length > 0 && !isUploading && !isComplete) {
            startUpload();
        }
    }, [isOpen, files]);

    const startUpload = async () => {
        setIsUploading(true);
        setProgress(0);
        setStats({ success: 0, failed: 0 });
        setCurrentIndex(0);
        cancelRef.current = false;

        let successCount = 0;
        let failedCount = 0;

        for (let i = 0; i < files.length; i++) {
            if (cancelRef.current) {
                break;
            }

            setCurrentIndex(i + 1);
            const file = files[i];

            try {
                const result = await onUpload(file);
                if (result.success) {
                    successCount++;
                } else {
                    failedCount++;
                }
            } catch (error) {
                console.error(`Failed to upload ${file.name}`, error);
                failedCount++;
            }

            setStats({ success: successCount, failed: failedCount });
            setProgress(Math.round(((i + 1) / files.length) * 100));
        }

        setIsComplete(true);
        setIsUploading(false);
    };

    const handleCancel = () => {
        cancelRef.current = true;
        setIsUploading(false);
    };

    const handleClose = () => {
        if (isUploading) return;
        onClose();
        setTimeout(() => {
            setIsComplete(false);
            setProgress(0);
            setStats({ success: 0, failed: 0 });
        }, 300);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-modal-sm p-0 overflow-hidden bg-surface border border-border rounded-lg">
                <DialogHeader className="px-4 py-3 border-b border-border bg-surface-sunken/50">
                    <DialogTitle className="typo-title-lg flex items-center gap-2">
                        <HugeiconsIcon icon={Upload01Icon} size={16} className="text-primary" />
                        {title}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Upload progress and status for {files?.length || 0} files
                    </DialogDescription>
                </DialogHeader>

                <div className="p-4 space-y-4">
                    {/* Progress */}
                    <div className="space-y-2">
                        <div className="flex justify-between typo-body-sm">
                            <span className="text-muted">Progress</span>
                            <span className="text-foreground tabular-nums">
                                {fmtNum(currentIndex)} / {fmtNum(files?.length || 0)}
                            </span>
                        </div>
                        <div className="w-full h-2 bg-surface-sunken rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full bg-primary transition-all duration-300 rounded-full",
                                    isUploading && "animate-pulse",
                                    cancelRef.current && "bg-warning"
                                )}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="text-center typo-body-sm">
                            {isUploading ? (
                                <span className="flex items-center justify-center gap-2 text-muted">
                                    <HugeiconsIcon icon={Loading03Icon} className="w-3 h-3 animate-spin" />
                                    Processing {progress}%
                                </span>
                            ) : cancelRef.current ? (
                                <span className="text-warning">Cancelled</span>
                            ) : isComplete ? (
                                <span className="text-success">Upload Complete</span>
                            ) : (
                                <span className="text-subtle">Ready to upload</span>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-sunken/50 border border-border">
                        <div className="flex-1 text-center">
                            <div className="typo-title-lg text-success">{fmtNum(stats.success)}</div>
                            <div className="typo-body-sm text-subtle">Success</div>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div className="flex-1 text-center">
                            <div className={cn("typo-title-lg", stats.failed > 0 ? "text-error" : "text-subtle")}>
                                {fmtNum(stats.failed)}
                            </div>
                            <div className="typo-body-sm text-subtle">Failed</div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 pt-2">
                        {isUploading ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancel}
                                className="w-full"
                            >
                                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4 mr-1.5" />
                                Cancel
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleClose}
                                className="w-full"
                            >
                                Done
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
