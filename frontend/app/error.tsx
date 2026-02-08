"use client";

import { useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, RefreshIcon, Home01Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { Card, Button } from "@/components/common/index";


export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();

    useEffect(() => {
        // Log to observability service in production
    }, [error]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-app-surface p-6">
            <Card className="max-w-md w-full p-10 text-center space-y-8 border-app-status-error/10 shadow-2xl shadow-app-status-error/5">
                <div className="flex justify-center">
                    <div className="p-6 bg-app-status-error/10 rounded-2xl border-2 border-app-status-error/20 text-app-status-error animate-bounce">
                        <HugeiconsIcon icon={AlertCircleIcon} className="w-12 h-12" />
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="typo-headline-lg text-app-status-error">
                        Runtime Exception
                    </h2>
                    <p className="typo-body-md text-secondary">
                        {error.digest || "PROCESS TERMINATED"}
                    </p>
                </div>

                <p className="typo-body-sm p-6 bg-app-surface-hover/50 rounded-2xl border-2 border-dashed border-app-border leading-relaxed text-app-fg-muted block">
                    {error.message ||
                        "The system encountered an unhandled exception during state reconciliation."}
                </p>

                <div className="grid grid-cols-2 gap-4 pt-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.push("/")}
                        className="border-app-border/20"
                    >
                        <HugeiconsIcon icon={Home01Icon} className="w-4 h-4 mr-2" />
                        REBOOT HUB
                    </Button>
                    <Button
                        variant="primary"
                        onClick={reset}
                        className="bg-app-status-error hover:bg-app-status-error/90"
                    >
                        <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 mr-2" />
                        RETRY SYNC
                    </Button>
                </div>
            </Card>
        </div>
    );
}
