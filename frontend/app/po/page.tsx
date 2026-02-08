import { api } from "@/lib/api";
import { POListClient } from "@/components/modules/po/POListClient";

export const dynamic = "force-dynamic";

export default async function POListPage() {
    try {
        const [pos, stats] = await Promise.all([
            api.listPOs({ limit: 10, sort_by: "po_date", order: "desc" }),
            api.getPOStats()
        ]);
        return <POListClient initialPOs={pos} initialStats={stats} />;
    } catch (err) {
        console.error("Failed to fetch POs:", err);
        return <div className="p-8 text-error">Failed to load purchase orders.</div>;
    }
}
