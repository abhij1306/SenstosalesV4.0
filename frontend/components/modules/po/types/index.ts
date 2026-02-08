/**
 * Purchase Order Module Types
 */

export interface LinkedDC {
    dc_number: string;
    dc_date: string | null;
    dsp_qty: number;
}

export interface PODelivery {
    id?: string;
    lot_no?: number;
    ord_qty?: number;
    dsp_qty?: number;
    rcd_qty?: number;
    dely_date?: string;
    entry_allow_date?: string;
    dest_code?: number;
    remarks?: string;
    manual_override_qty?: number;
    linked_dcs?: LinkedDC[];
}

export interface POItem {
    id?: string;
    po_item_no: number;
    material_code?: string;
    material_description?: string;
    drg_no?: string;
    mtrl_cat?: number;
    unit?: string;
    po_rate?: number;
    ord_qty?: number;
    rcd_qty?: number;
    rej_qty?: number;
    item_value?: number;
    hsn_code?: string;
    dsp_qty?: number;
    pending_qty?: number;
    deliveries: PODelivery[];
}

export interface POHeader {
    po_number: string;
    po_date?: string;
    supplier_name?: string;
    supplier_gstin?: string;
    supplier_code?: string;
    our_ref?: string;
    supplier_phone?: string;
    supplier_fax?: string;
    supplier_email?: string;
    department_no?: string;
    enquiry_no?: string;
    enquiry_date?: string;
    quotation_ref?: string;
    quotation_date?: string;
    rc_no?: string;
    order_type?: string;
    po_status?: string;
    tin_no?: string;
    ecc_no?: string;
    mpct_no?: string;
    po_value?: number;
    fob_value?: number;
    ex_rate?: number;
    currency?: string;
    net_po_value?: number;
    amend_no?: number;
    inspection_by?: string;
    inspection_at?: string;
    issuer_name?: string;
    issuer_designation?: string;
    issuer_phone?: string;
    remarks?: string;
    project_name?: string;
    consignee_name?: string;
    consignee_address?: string;
    status?: string;
    payment_terms?: string;
    issuer_department?: string;
}

export interface PODetail {
    header: POHeader;
    items: POItem[];
}

export interface POListItem {
    po_number: string;
    po_date: string | null;
    supplier_name: string | null;
    po_value: number | null;
    amend_no: number;
    po_status: string | null;
    linked_dc_numbers: string | null;
    total_ord_qty: number;
    total_dsp_qty: number;
    total_rcd_qty?: number;
    total_rej_qty?: number;
    total_pending_qty: number;
    total_items_count?: number;
    created_at: string | null;
}

export interface POStats {
    open_orders_count: number;
    pending_approval_count: number;
    total_value_ytd: number;
    total_value_change: number;
    total_shipped_qty: number;
    total_rejected_qty: number;
}
