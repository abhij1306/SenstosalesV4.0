/**
 * Store Receipt Voucher (SRV) Module Types
 */

export interface SRVHeader {
    srv_number: string;
    srv_date: string;
    po_number: string;
    srv_status: string;
    po_found?: boolean;
    created_at?: string;
    total_value?: number;
}

export interface SRVItem {
    id: number;
    po_item_no: number;
    lot_no: number | null;
    srv_item_no?: number;
    rev_no?: string | number;
    rcd_qty: number;
    rej_qty: number;
    ord_qty?: number;
    challan_qty?: number;
    accepted_qty?: number;
    unit?: string;
    challan_no: string | null;
    challan_date?: string;
    invoice_no: string | null;
    invoice_date?: string;
    div_code?: string;
    pmir_no?: string;
    finance_date?: string;
    cnote_no?: string;
    cnote_date?: string;
    material_description?: string;
    mtrl_cat?: number;
    drg_no?: string;
    remarks: string | null;
}

export interface SRVDetail {
    header: SRVHeader;
    items: SRVItem[];
}

export interface SRVListItem {
    srv_number: string;
    srv_date: string;
    po_number: string;
    total_rcd_qty: number;
    total_rej_qty: number;
    total_ord_qty: number;
    total_challan_qty: number;
    total_accepted_qty: number;
    srv_status?: string;
    total_value?: number;
    po_found?: boolean;
    po_ordered_qty?: number;
    warning_message?: string;
    challan_numbers?: string;
    invoice_numbers?: string;
    created_at?: string;
}

export interface SRVStats {
    total_srvs: number;
    total_rcd_qty: number;
    total_rej_qty: number;
    missing_po_count: number;
    rejection_rate?: number;
}
