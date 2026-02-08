import { Suspense } from "react";
import { LogsClient } from "@/components/modules/intelligence/LogsClient";

export const metadata = {
    title: "System Ledger | SenstoSales",
    description: "Unified system audit trail and diagnostic logs.",
};

export default function SystemLedgerPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full bg-background animate-pulse" />}>
            <LogsClient />
        </Suspense>
    );
}
