import { Suspense } from "react";
import { api } from "@/lib/api";
import { DeliveryTrackerClient } from "@/components/modules/delivery-tracker/DeliveryTrackerClient";

export const dynamic = "force-dynamic";

export default async function DeliveryTrackerPage() {
    try {
        const data = await api.listDeliveryItems({
            page: 1,
            limit: 10,
            sort: "dely_date",
            order: "ASC",
            status: "all"
        });
        return (
            <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>}>
                <DeliveryTrackerClient initialData={data} />
            </Suspense>
        );
    } catch (err) {
        console.error("Failed to fetch delivery items:", err);
        return <div className="p-8 text-error">Failed to load delivery items.</div>;
    }
}
