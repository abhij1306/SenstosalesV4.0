/**
 * Settings Module Types
 */

export interface Buyer {
    id?: number;
    name: string;
    address: string;
    gstin: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    state?: string;
    state_code?: string;
    billing_address?: string; // Often aliased to address, but UI uses billing_address
    place_of_supply?: string;
    is_default?: boolean;
    is_active?: boolean;
}

export interface Settings {
    // System Defaults
    default_gst_rate: number;
    company_name: string;
    company_gstin: string;
    app_version: string;

    // Supplier Profile
    supplier_name?: string;
    supplier_contact?: string;
    supplier_email?: string;
    supplier_gstin?: string;
    supplier_address?: string;
    supplier_description?: string;

    // Tax Config
    igst_rate?: number | string;
    cgst_rate?: number | string;
    sgst_rate?: number | string;
}
