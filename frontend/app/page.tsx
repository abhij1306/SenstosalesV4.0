import { api } from "@/lib/api";
import { DashboardClient } from "@/components/modules/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    try {
        const summary = await api.getDashboardSummary("month");
        return (
            <DashboardClient
                summary={summary}
            />
        );
    } catch (error: any) {
        console.error("[DASHBOARD] Initial fetch failed:", error);
        return (
            <DashboardClient
                summary={null}
                error="SYSTEM_BOOT_DELAY"
            />
        );
    }
}
