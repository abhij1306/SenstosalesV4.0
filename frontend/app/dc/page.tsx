import { api } from "@/lib/api";
import { DCListClient } from "@/components/modules/dc/DCListClient";

export const dynamic = "force-dynamic";

export default async function DCListPage() {
    try {
        const [dcs, stats] = await Promise.all([
            api.listDCs({ limit: 10, sort_by: "dc_date", order: "desc" }),
            api.getDCStats()
        ]);
        return <DCListClient initialDCs={dcs} initialStats={stats} />;
    } catch (err) {
        console.error("Failed to fetch DCs:", err);
        return <div className="p-8 text-error">Failed to load delivery challans.</div>;
    }
}
