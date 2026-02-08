/**
 * Invoice Module Types
 */

import { DCHeader } from "../../dc/types";

export interface InvoiceItem {
    id?: number;
    invoice_number: string;
    po_item_no?: string;
    lot_no?: number;
    description?: string;
    hsn_sac?: string;
    quantity: number;
    unit?: string;
    rate: number;
    taxable_value: number;
    cgst_rate?: number;
    cgst_amount?: number;
    sgst_rate?: number;
    sgst_amount?: number;
    igst_rate?: number;
    igst_amount?: number;
    total_amount: number;
    amount?: number;
    material_code?: string;
    no_of_packets?: number;
    rcd_qty?: number;
    dc_dsp_qty?: number;
}

export interface InvoiceHeader {
    invoice_number: string;
    invoice_date: string;
    linked_dc_numbers?: string;
    po_numbers?: string;
    buyer_name?: string;
    buyer_address?: string;
    buyer_gstin?: string;
    buyer_state?: string;
    buyer_state_code?: string;
    customer_gstin?: string;
    place_of_supply?: string;
    buyers_order_no?: string;
    buyers_order_date?: string;
    vehicle_no?: string;
    lr_no?: string;
    transporter?: string;
    destination?: string;
    terms_of_delivery?: string;
    gemc_number?: string;
    gemc_date?: string;
    mode_of_payment?: string;
    payment_terms?: string;
    despatch_doc_no?: string;
    despatch_through?: string;
    srv_no?: string;
    srv_date?: string;
    taxable_value?: number;
    total_taxable_value?: number;
    cgst?: number;
    cgst_total?: number;
    sgst?: number;
    sgst_total?: number;
    igst?: number;
    total_invoice_value?: number;
    dc_number?: string;
    dc_date?: string;
    remarks?: string;
    created_at?: string;
    supplier_name?: string;
    supplier_address?: string;
    supplier_gstin?: string;
    supplier_contact?: string;
}

export interface InvoiceDetail {
    header: InvoiceHeader;
    items: InvoiceItem[];
    linked_dcs?: DCHeader[];
}

export interface InvoiceListItem {
    invoice_number: string;
    invoice_date: string;
    po_numbers: string | null;
    dc_number?: string;
    linked_dc_numbers: string | null;
    customer_gstin: string | null;
    total_items?: number;
    total_dsp_qty?: number;
    total_rcd_qty?: number;
    taxable_value: number | null;
    total_invoice_value: number | null;
    created_at: string | null;
    status: "Paid" | "Pending" | "Overdue";
}

export interface InvoiceStats {
    total_invoiced: number;
    pending_payments: number;
    gst_collected: number;
    total_invoiced_change: number;
    pending_payments_count: number;
    gst_collected_change: number;
}

export interface InvoiceCreate {
    invoice_number: string;
    invoice_date: string;
    linked_dc_numbers: string;
    po_numbers: string;
    customer_gstin: string;
    place_of_supply: string;
    taxable_value: number;
    cgst: number;
    sgst: number;
    igst: number;
    total_invoice_value: number;
    remarks: string;
}
