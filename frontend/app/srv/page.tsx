import { api } from "@/lib/api";
import { SRVListClient } from "@/components/modules/srv/SRVListClient";

export const dynamic = "force-dynamic";

export default async function SRVListPage() {
  try {
    const [srvs, stats] = await Promise.all([
      api.listSRVs(undefined, { limit: 10, sort_by: "srv_date", order: "desc" }),
      api.getSRVStats()
    ]);
    return <SRVListClient initialSRVs={srvs} initialStats={stats} />;
  } catch (err) {
    console.error("Failed to fetch SRVs:", err);
    return <div className="p-8 text-error">Failed to load SRV records.</div>;
  }
}
