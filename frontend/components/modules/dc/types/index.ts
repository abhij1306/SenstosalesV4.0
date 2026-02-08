/**
 * Delivery Challan Module Types
 */

import { LinkedDC } from "../../po/types";

export interface DCItemRow {
    id: string;
    po_item_id: string;
    po_item_no?: number;
    lot_no?: number | string;
    material_code?: string;
    material_description?: string;
    description?: string;
    unit?: string;
    po_rate?: number;
    ord_qty?: number;
    dsp_qty?: number;
    rcd_qty?: number;
    rej_qty?: number;
    lot_ord_qty?: number;
    dispatch_qty?: number; // User input for new DC
    pending_qty?: number;
    hsn_code?: string;
    hsn_rate?: number;
    pending_post_dc?: number;
    drg_no?: string;
    mtrl_cat?: number;
    original_pending?: number;
    dely_date?: string;
    linked_dcs?: LinkedDC[];
}

export interface DCHeader {
    dc_number: string;
    dc_date: string;
    our_ref?: string;
    po_number?: string;
    department_no?: string;
    consignee_name?: string;
    consignee_gstin?: string;
    consignee_address?: string;
    inspection_company?: string;
    eway_bill_no?: string;
    vehicle_no?: string;
    lr_no?: string;
    transporter?: string;
    mode_of_transport?: string;
    remarks?: string;
    created_at?: string;
    supplier_phone?: string;
    supplier_gstin?: string;
    po_date?: string;
    invoice_number?: string;
    gc_number?: string;
    gc_date?: string;
    supplier_name?: string;
    supplier_address?: string;
    supplier_contact?: string;
}

export interface DCDetail {
    header: DCHeader;
    items: DCItemRow[];
}

export interface DCListItem {
    dc_number: string;
    dc_date: string;
    po_number: number | string | null;
    consignee_name: string | null;
    status: string;
    total_ord_qty?: number;
    total_dsp_qty?: number;
    total_value: number;
    total_rcd_qty?: number;
    created_at: string | null;
    invoice_number?: string;
}

export interface DCStats {
    total_challans: number;
    total_challans_change: number;
    pending_delivery: number;
    completed_delivery: number;
    completed_change: number;
    total_value: number;
}

export interface DCCreate {
    dc_number: string;
    dc_date: string;
    po_number?: number;
    department_no?: number;
    consignee_name?: string;
    consignee_gstin?: string;
    consignee_address?: string;
    inspection_company?: string;
    eway_bill_no?: string;
    vehicle_no?: string;
    lr_no?: string;
    transporter?: string;
    mode_of_transport?: string;
    remarks?: string;
    gc_number?: string;
    gc_date?: string;
}
