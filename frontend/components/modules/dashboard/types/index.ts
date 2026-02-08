/**
 * Dashboard Module Types
 */

export interface RejectionProfileItem {
    material: string | null;
    total_received: number;
    total_rejected: number;
    rejection_rate: number;
    example_po_number?: string;
}

export interface FulfillmentTrendItem {
    month: string;
    ordered_qty: number;
    accepted_qty: number;
}

export interface ActivityItem {
    type: string;
    number: string;
    date: string;
    party: string;
    amount: number | null;
    status: string;
}

export interface DashboardSummary {
    total_sales_month: number;
    sales_growth: number;
    pending_pos: number;
    new_pos_today: number;
    active_challans: number;
    active_challans_growth: string;
    total_po_value: number;
    po_value_growth: number;
    total_ord_qty: number;
    total_dsp_qty: number;
    total_rcd_qty: number;
    total_rej_qty: number;
    avg_lead_time?: number;
    supply_health_score?: number;
    rejection_profile?: RejectionProfileItem[];
    fulfillment_trends?: FulfillmentTrendItem[];
    overdue_count?: number;
    recent_activity: ActivityItem[];
    performance_data: any[];
}
