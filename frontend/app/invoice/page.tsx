import { api } from "@/lib/api";
import { InvoiceListClient } from "@/components/modules/invoice/InvoiceListClient";

export const dynamic = "force-dynamic";

export default async function InvoiceListPage() {
    try {
        const [invoices, stats] = await Promise.all([
            api.listInvoices({ limit: 10, sort_by: "invoice_date", order: "desc" }),
            api.getInvoiceStats()
        ]);
        return <InvoiceListClient initialInvoices={invoices} initialStats={stats} />;
    } catch (err) {
        console.error("Failed to fetch Invoices:", err);
        return <div className="p-8 text-error">Failed to load invoices.</div>;
    }
}
