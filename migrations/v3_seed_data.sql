-- ============================================================================
-- SENSTOSALES DEFAULT SEED DATA (CLEAN TEMPLATE)
-- Updated: 2026-02-08
-- NOTE: This file contains placeholder data. Update with your company details.
-- ============================================================================

-- 1. Company (Supplier) Settings - REPLACE WITH YOUR ACTUAL DATA
INSERT OR REPLACE INTO settings (key, value) VALUES ('supplier_name', 'YOUR COMPANY NAME');
INSERT OR REPLACE INTO settings (key, value) VALUES ('supplier_address', 'Your Company Address, City, State - PINCODE');
INSERT OR REPLACE INTO settings (key, value) VALUES ('supplier_gstin', 'XXAAAAX0000A0X0');
INSERT OR REPLACE INTO settings (key, value) VALUES ('supplier_contact', 'Phone Number, Email');
INSERT OR REPLACE INTO settings (key, value) VALUES ('supplier_state', 'Your State');
INSERT OR REPLACE INTO settings (key, value) VALUES ('supplier_state_code', 'XX');
INSERT OR REPLACE INTO settings (key, value) VALUES ('supplier_description', 'Your Company Description');

-- 2. Default GST Rates
INSERT OR REPLACE INTO settings (key, value) VALUES ('cgst_rate', '9.0');
INSERT OR REPLACE INTO settings (key, value) VALUES ('sgst_rate', '9.0');
INSERT OR REPLACE INTO settings (key, value) VALUES ('igst_rate', '18.0');

-- 3. Default Buyer Template - REPLACE WITH YOUR ACTUAL BUYER DATA
INSERT OR IGNORE INTO buyers (name, gstin, billing_address, shipping_address, address, state, state_code, place_of_supply, is_default)
VALUES (
    'DEFAULT BUYER NAME',
    'XXAAAAX0000A0X0',
    'Buyer Company Address, City, State - PINCODE',
    'Buyer Company Address, City, State - PINCODE',
    'City, State',
    'Your State',
    'XX',
    'CITY',
    1
);

-- 4. Default Download Prefs (Generic paths - user should configure these)
INSERT OR REPLACE INTO user_download_prefs (id, po_html, srv_html, challan, invoice, challan_summary, invoice_summary, items_summary, gc)
VALUES (
    1,
    'Downloads/PO_HTML',
    'Downloads/SRV_HTML',
    'Downloads/Challan',
    'Downloads/Invoice',
    'Downloads/Challan_Summary',
    'Downloads/Invoice_Summary',
    'Downloads/Items_Summary',
    'Downloads/GC'
);
