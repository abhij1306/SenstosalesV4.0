import { api } from "@/lib/api";
import { ReportsClient } from "@/components/modules/reports/ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
    const endDate = new Date().toISOString().split("T")[0];
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const startDate = d.toISOString().split("T")[0];
    const dateParams = `start_date=${startDate}&end_date=${endDate}`;

    try {
        const reportData = await api.getReports("pending", dateParams, { limit: 10, sort_by: "description", order: "desc" });
        return <ReportsClient initialData={reportData as any} />;
    } catch (err) {
        console.error("Failed to fetch reports:", err);
        return <ReportsClient initialData={null} />;
    }
}
