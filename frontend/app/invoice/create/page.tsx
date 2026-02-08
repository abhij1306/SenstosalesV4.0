"use client";

import { Button, Input, ActionConfirmationModal, Autocomplete, DatePicker } from "@/components/common/index";
import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FloppyDiskIcon as Save,
  Loading03Icon as Loader2,
  AlertCircleIcon as AlertCircle,
  Invoice01Icon as Receipt
} from "@hugeicons/core-free-icons";
import { api, type Buyer } from "@/lib/api";
import { SearchResult } from "@/types";
import { useInvoiceStore } from "@/store/invoiceStore";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader, Layout, fmtNum, fmtCurr, fmtDate } from "@/components/patterns";
import { TableHeader, TableSection, InfoGrid, InfoItem, EditableInfoItem, InfoSection } from "@/components/patterns/detail";
import { CellNum, CellCurr, CellUnit, CellMaterial } from "@/components/ui/table";
import { cn, amountInWords } from "@/lib/utils";

function CreateInvoicePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dcIdFromUrl = searchParams?.get("dc") || "";

  const data = useInvoiceStore(s => s.data);
  const isCheckingNumber = useInvoiceStore(s => s.isCheckingNumber);
  const isDuplicateNumber = useInvoiceStore(s => s.isDuplicateNumber);
  const setHeader = useInvoiceStore(s => s.setHeader);
  const setInvoice = useInvoiceStore(s => s.setInvoice);
  const updateHeader = useInvoiceStore(s => s.updateHeader);
  const setItems = useInvoiceStore(s => s.setItems);
  const setNumberStatus = useInvoiceStore(s => s.setNumberStatus);
  const reset = useInvoiceStore(s => s.reset);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualDcId, setManualDcId] = useState(dcIdFromUrl);
  const [isInitialized, setIsInitialized] = useState(false);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>("");
  const [showWarning, setShowWarning] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [taxRates, setTaxRates] = useState({ cgst: 9.0, sgst: 9.0 });

  const defaultHeader = {
    invoice_number: "",
    invoice_date: new Date().toISOString().split("T")[0],
    dc_number: dcIdFromUrl,
    payment_terms: "45",
    buyer_name: "",
    buyer_gstin: "",
    buyer_address: "",
    buyer_state: "",
    place_of_supply: "",
    total_taxable_value: 0,
    cgst_total: 0,
    sgst_total: 0,
    total_invoice_value: 0,
  } as any;

  const header = (isInitialized && data?.header) ? data.header : defaultHeader;
  const items = (isInitialized && data?.items) ? data.items : [];
  const debouncedInvoiceNumber = useDebounce(header.invoice_number, 500);

  useEffect(() => {
    if (debouncedInvoiceNumber && debouncedInvoiceNumber.length >= 3) {
      checkNumberDuplicate(debouncedInvoiceNumber, header.invoice_date);
    } else {
      setNumberStatus(false, false);
    }
  }, [debouncedInvoiceNumber, header.invoice_date]);

  useEffect(() => {
    setIsInitialized(false);
    setInvoice({
      header: { invoice_number: "", invoice_date: new Date().toISOString().split("T")[0], payment_terms: "45" } as any,
      items: []
    });
    fetchInitialData();
    return () => { reset(); };
  }, [dcIdFromUrl]);

  const fetchInitialData = async () => {
    try {
      const [buyerList, settings] = await Promise.all([api.getBuyers(), api.getSettings()]);
      setBuyers(buyerList);
      if (settings) {
        setCompanySettings(settings);
        const cgst = parseFloat((settings as any).cgst_rate) || 9.0;
        const sgst = parseFloat((settings as any).sgst_rate) || 9.0;
        setTaxRates({ cgst, sgst });
      }
      if (!dcIdFromUrl && buyerList.length > 0) {
        const defaultBuyer = buyerList.find(b => b.is_default) || buyerList[0];
        setSelectedBuyerId(defaultBuyer.id.toString());
        applyBuyerToStore(defaultBuyer);
      }
      if (dcIdFromUrl) await loadDC(dcIdFromUrl, settings, buyerList);
    } catch { console.error("Failed to fetch initial data"); }
    finally { setIsInitialized(true); }
  };

  const applyBuyerToStore = (buyer: Buyer) => {
    setHeader({
      ...header,
      buyer_name: buyer.name,
      buyer_gstin: buyer.gstin,
      buyer_address: (buyer as any).address || buyer.billing_address,
      buyer_state: buyer.state || "",
      place_of_supply: buyer.place_of_supply,
    });
  };

  const handleBuyerChange = (id: string) => {
    setSelectedBuyerId(id);
    const buyer = buyers.find((b) => b.id.toString() === id);
    if (buyer) applyBuyerToStore(buyer);
  };

  const checkNumberDuplicate = async (num: string, date: string) => {
    if (!num || num.length < 3) return;
    setNumberStatus(true, false);
    try {
      const res = await api.checkDuplicateNumber("Invoice", num, date);
      setNumberStatus(false, res.exists);
    } catch { setNumberStatus(false, false); }
  };

  const loadDC = async (id: string, existingSettings?: any, buyerList?: Buyer[]) => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const preview = await api.getInvoicePreview(id);
      const initialHeader = {
        invoice_number: "", invoice_date: new Date().toISOString().split("T")[0], payment_terms: "45 Days",
        ...preview.header,
        supplier_name: "", supplier_address: "", supplier_gstin: "", supplier_contact: "",
        buyer_name: "", buyer_address: "", buyer_gstin: "", buyer_state: "", buyer_state_code: "", place_of_supply: "",
      };
      const currentBuyerList = buyerList || buyers;
      if (currentBuyerList.length > 0 && preview.header.buyer_name) {
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
        const targetName = normalize(preview.header.buyer_name);
        const match = currentBuyerList.find(b => {
          const bName = normalize(b.name);
          return bName.includes(targetName) || targetName.includes(bName);
        });
        if (match) {
          setSelectedBuyerId(match.id.toString());
          Object.assign(initialHeader, { buyer_name: match.name, buyer_gstin: match.gstin, buyer_address: (match as any).address || match.billing_address, buyer_state: match.state, place_of_supply: match.place_of_supply });
        } else {
          const defaultBuyer = currentBuyerList.find(b => b.is_default) || currentBuyerList[0];
          if (defaultBuyer) {
            setSelectedBuyerId(defaultBuyer.id.toString());
            Object.assign(initialHeader, { buyer_name: defaultBuyer.name, buyer_gstin: defaultBuyer.gstin, buyer_address: (defaultBuyer as any).address || defaultBuyer.billing_address, buyer_state: defaultBuyer.state, place_of_supply: defaultBuyer.place_of_supply });
          }
        }
      } else if (currentBuyerList.length > 0) {
        const defaultBuyer = currentBuyerList.find(b => b.is_default) || currentBuyerList[0];
        if (defaultBuyer) {
          setSelectedBuyerId(defaultBuyer.id.toString());
          Object.assign(initialHeader, { buyer_name: defaultBuyer.name, buyer_gstin: defaultBuyer.gstin, buyer_address: (defaultBuyer as any).address || defaultBuyer.billing_address, buyer_state: defaultBuyer.state, place_of_supply: defaultBuyer.place_of_supply });
        }
      }
      setHeader(initialHeader as any);
      setItems(preview.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load DC");
    } finally {
      setIsLoading(false);
    }
  };

  const updateItemProperty = (index: number, key: string, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [key]: value };
    const taxableValue = (item.quantity || 0) * (item.rate || 0);
    item.taxable_value = taxableValue;
    item.cgst_amount = (taxableValue * taxRates.cgst) / 100;
    item.sgst_amount = (taxableValue * taxRates.sgst) / 100;
    item.total_amount = taxableValue + item.cgst_amount + item.sgst_amount;
    newItems[index] = item;
    setItems(newItems);
    calculateTotals(newItems);
  };

  const calculateTotals = (currentItems: any[]) => {
    const taxable = currentItems.reduce((sum, item) => sum + (item.taxable_value || 0), 0);
    const cgst = currentItems.reduce((sum, item) => sum + (item.cgst_amount || 0), 0);
    const sgst = currentItems.reduce((sum, item) => sum + (item.sgst_amount || 0), 0);
    setHeader({ ...useInvoiceStore.getState().data?.header || header, total_taxable_value: taxable, cgst_total: cgst, sgst_total: sgst, total_invoice_value: taxable + cgst + sgst });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setShowWarning(false);
    if (!header.buyer_name || !header.invoice_number) {
      setError("Please ensure Invoice Number and Buyer details are present.");
      setIsSaving(false);
      return;
    }
    if (isDuplicateNumber) {
      setError("Duplicate Invoice Number detected.");
      setIsSaving(false);
      return;
    }
    try {
      const payload = { ...header, buyer_id: Number(selectedBuyerId) || null, items: items };
      await api.createInvoice(payload);
      router.push(`/invoice/${header.invoice_number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setIsSaving(false);
    }
  };

  const isGenerateMode = !!dcIdFromUrl;
  const taxableValue = items.reduce((sum, item) => sum + (item.taxable_value || 0), 0);
  const cgstTotal = items.reduce((sum, item) => sum + (item.cgst_amount || 0), 0);
  const sgstTotal = items.reduce((sum, item) => sum + (item.sgst_amount || 0), 0);
  const totalValue = taxableValue + cgstTotal + sgstTotal;

  // Header actions
  const headerActions = (
    <div className="flex items-center gap-2">
      {!isGenerateMode && (
        <div className="flex items-center gap-2 mr-2">
          <Input placeholder="DC Number..." value={manualDcId || ""} onChange={(e) => setManualDcId(e.target.value)} className="h-8 typo-body-md w-40" />
          <Button variant="outline" size="sm" onClick={() => manualDcId && loadDC(manualDcId)} disabled={!manualDcId || isLoading}>
            {isLoading ? <HugeiconsIcon icon={Loader2} className="w-4 h-4 animate-spin" /> : "Link"}
          </Button>
        </div>
      )}
      <Button variant="outline" size="sm" onClick={() => router.back()} disabled={isSaving}>Cancel</Button>
      <Button variant="primary" size="sm" onClick={() => setShowWarning(true)} disabled={isSaving || !header.invoice_number || items.length === 0 || !header.buyer_name || isDuplicateNumber || isCheckingNumber}>
        {isSaving ? <HugeiconsIcon icon={Loader2} className="w-4 h-4 animate-spin mr-1" /> : <HugeiconsIcon icon={Save} className="w-4 h-4 mr-1" />}
        Save
      </Button>
    </div>
  );

  if (!isInitialized) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  const supplierName = companySettings?.supplier_name || "-";
  const supplierAddress = companySettings?.supplier_address || "-";
  const supplierGstin = companySettings?.supplier_gstin || "-";
  const supplierContact = companySettings?.supplier_contact || "-";

  return (
    <div className={Layout.colGap}>
      {/* Header */}
      <PageHeader
        title="Create Invoice"
        subtitle={header.dc_number ? <span>DC: <Link href={`/dc/${header.dc_number}`} className="typo-body-md text-primary hover:underline hover:text-primary-hover">{header.dc_number}</Link> - {items.length} items - Total: {fmtCurr(totalValue)}</span> : <span className="typo-body-md text-tertiary">Link a DC to begin</span>}
        onBack={() => router.back()}
        action={headerActions}
      />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-error/10 border border-error/20 rounded-lg text-error typo-body-md mb-6 animate-in fade-in slide-in-from-top-2">
          <HugeiconsIcon icon={AlertCircle} className="w-4 h-4" />
          <span className="typo-body-md">{error}</span>
        </div>
      )}

      {/* Invoice Sheet Layout - Using InfoSection like view invoice */}
      <InfoSection title="Invoice Details" className="overflow-hidden">
        {/* Header Grid: Supplier/Buyer (Left) + Logistics (Right) */}
        <div className="grid grid-cols-12">
          {/* LEFT: Supplier & Buyer */}
          <div className="col-span-4 flex flex-col border-r border-border">
            {/* Supplier */}
            <div className="p-2 space-y-2 border-b border-border bg-gradient-to-br from-surface-sunken/30 to-surface-sunken/10">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3.5 bg-primary rounded-full" />
                <span className="typo-label-lg">Supplier Details</span>
              </div>
              <div className="space-y-1.5 pl-3">
                <div className="typo-body-md">{supplierName}</div>
                <div className="typo-body-sm leading-snug whitespace-pre-wrap">{supplierAddress}</div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 typo-body-sm">
                  <span className="inline-flex items-center gap-1">
                    <span className="typo-body-sm">GSTIN:</span>
                    <span className="typo-mono-md">{supplierGstin}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="typo-body-sm">TEL:</span>
                    <span>{supplierContact}</span>
                  </span>
                </div>
              </div>
            </div>
            {/* Buyer */}
            <div className="p-2 space-y-2 flex-1 bg-gradient-to-br from-surface to-surface-sunken/5">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3.5 bg-secondary rounded-full" />
                <span className="typo-label-lg">Billed To (Buyer)</span>
              </div>
              <div className="space-y-2 pl-3">
                <Autocomplete value={selectedBuyerId} onChange={(val) => handleBuyerChange(val)} options={buyers.map(b => ({ value: b.id.toString(), label: b.name }))} placeholder="Select Buyer..." />
                <Input type="text" value={header.buyer_name || ""} onChange={(e) => updateHeader("buyer_name", e.target.value)} className="h-7 typo-body-md w-full" placeholder="Buyer Name" />
                <textarea value={header.buyer_address || ""} onChange={(e) => updateHeader("buyer_address", e.target.value)} className="w-full px-2 py-1 typo-body-sm bg-surface-sunken border border-border rounded min-h-8 leading-snug" placeholder="Address" />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="text" value={header.buyer_gstin || ""} onChange={(e) => updateHeader("buyer_gstin", e.target.value)} className="px-2 py-1 typo-body-sm bg-surface-sunken border border-border rounded" placeholder="GSTIN" />
                  <Input type="text" value={header.buyer_state || ""} onChange={(e) => updateHeader("buyer_state", e.target.value)} className="px-2 py-1 typo-body-sm bg-surface-sunken border border-border rounded" placeholder="State" />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Document Logistics */}
          <div className="col-span-8 p-2 bg-surface-sunken/5">
            <InfoGrid columns={4}>
              <EditableInfoItem label="Invoice No." value={header.invoice_number || ""} onChange={(val) => updateHeader("invoice_number", val)} placeholder="INV-001" editable />
              <div>
                <div className="typo-label-lg mb-1.5">Dated</div>
                <DatePicker value={header.invoice_date || ""} onChange={(val) => updateHeader("invoice_date", val)} className="h-8 w-full" />
              </div>
              <InfoItem label="Challan No" value={header.dc_number} href={header.dc_number ? `/dc/${header.dc_number}` : undefined} />
              <InfoItem label="Challan Date" value={fmtDate(header.dc_date)} />
              <EditableInfoItem label="GEMC No" value={header.gemc_number || ""} onChange={(val) => updateHeader("gemc_number", val)} placeholder="GEMC #" editable />
              <div>
                <div className="typo-label-lg mb-1.5">GEMC Date</div>
                <DatePicker value={header.gemc_date || ""} onChange={(val) => updateHeader("gemc_date", val)} className="h-8 w-full" />
              </div>
              <InfoItem label="Buyer's Order No." value={header.buyers_order_no} href={header.buyers_order_no ? `/po/${header.buyers_order_no}` : undefined} />
              <InfoItem label="Order Date" value={fmtDate(header.buyers_order_date)} />
              <EditableInfoItem label="SRV No" value={header.srv_no || ""} onChange={(val) => updateHeader("srv_no", val)} placeholder="SRV #" editable />
              <div>
                <div className="typo-label-lg mb-1.5">SRV Date</div>
                <DatePicker value={header.srv_date || ""} onChange={(val) => updateHeader("srv_date", val)} className="h-8 w-full" />
              </div>
              <EditableInfoItem label="Payment Terms" value={header.payment_terms || ""} onChange={(val) => updateHeader("payment_terms", val)} placeholder="45 Days" editable />
              <EditableInfoItem label="Despatch Doc No." value={header.despatch_doc_no || ""} onChange={(val) => updateHeader("despatch_doc_no", val)} editable />
              <EditableInfoItem label="Despatched Through" value={header.despatch_through || header.transporter || ""} onChange={(val) => updateHeader("despatch_through", val)} editable />
              <EditableInfoItem label="Destination" value={header.destination || ""} onChange={(val) => updateHeader("destination", val)} editable />
              <EditableInfoItem label="Vehicle No" value={header.vehicle_no || ""} onChange={(val) => updateHeader("vehicle_no", val)} placeholder="Vehicle No" editable />
              <EditableInfoItem label="LR No" value={header.lr_no || ""} onChange={(val) => updateHeader("lr_no", val)} editable />
              <EditableInfoItem label="Terms of Delivery" value={header.terms_of_delivery || ""} onChange={(val) => updateHeader("terms_of_delivery", val)} className="col-span-4" editable />
            </InfoGrid>
          </div>
        </div>
      </InfoSection>

      {/* Items Table */}
      <TableSection
        title={
          <div className="flex items-center gap-1.5">
            <span>Line Items</span>
            <span className="text-tertiary/50">-</span>
            <span className="typo-body-md">{items.length} Items</span>
            <span className="text-tertiary/50">-</span>
            <span className="typo-body-md">Value: {fmtCurr(totalValue)}</span>
          </div>
        }
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-sunken/50 border-b border-border">
              <TableHeader align="center" className="w-10">S.N.</TableHeader>
              <TableHeader align="left" className="min-w-50">Description</TableHeader>
              <TableHeader align="center" className="w-20">HSN</TableHeader>
              <TableHeader align="center" className="w-14">Unit</TableHeader>
              <TableHeader align="right" className="w-20">Qty</TableHeader>
              <TableHeader align="right" className="w-24">Rate</TableHeader>
              <TableHeader align="right" className="w-24">Taxable</TableHeader>
              <TableHeader align="right" className="w-20">CGST</TableHeader>
              <TableHeader align="right" className="w-20">SGST</TableHeader>
              <TableHeader align="right" className="w-24">Total</TableHeader>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={10} className="py-8 text-center typo-body-sm">{header.dc_number ? "No items found." : "Link a DC to load items."}</td></tr>
            ) : (
              items.map((itemValue: any, idx: number) => (
                <tr key={idx} className="border-b border-border/40 hover:bg-surface-sunken/30">
                  <td className="py-2 px-3 text-center">
                    <CellNum align="center" value={idx + 1} className="typo-body-sm" />
                  </td>
                  <td className="py-2 px-3">
                    <CellMaterial code={itemValue.material_code} description={itemValue.description || itemValue.material_description} cat={itemValue.mtrl_cat} drg={itemValue.drg_no} />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <Input type="text" value={itemValue.hsn_sac || itemValue.hsn_code || ""} onChange={(e) => updateItemProperty(idx, "hsn_sac", e.target.value)} className="h-7 typo-body-sm text-center w-full" />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <CellUnit value={itemValue.unit} />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <Input type="number" min={0} max={999999} value={itemValue.quantity || 0} onChange={(e) => { const val = Math.max(0, Math.min(999999, Number(e.target.value))); updateItemProperty(idx, "quantity", val); }} className="h-7 typo-body-md text-right tabular-nums w-20" />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <Input type="number" min={0} max={999999999} value={itemValue.rate || 0} onChange={(e) => { const val = Math.max(0, Math.min(999999999, Number(e.target.value))); updateItemProperty(idx, "rate", val); }} className="h-7 typo-body-md text-right tabular-nums w-24" />
                  </td>
                  <td className="py-2 px-3 text-right"><CellCurr value={itemValue.taxable_value || 0} /></td>
                  <td className="py-2 px-3 text-right"><CellCurr value={itemValue.cgst_amount || 0} className="text-tertiary" /></td>
                  <td className="py-2 px-3 text-right"><CellCurr value={itemValue.sgst_amount || 0} className="text-tertiary" /></td>
                  <td className="py-2 px-3 text-right"><CellCurr value={itemValue.total_amount || 0} className="typo-body-md" /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableSection>

      {/* Footer */}
      <div className="grid grid-cols-12 border-t border-border">
        <div className="col-span-8 p-4 border-r border-border">
          <span className="typo-label-lg">Total Amount (In Words)</span>
          <p className="typo-body-md">{amountInWords(Math.round(totalValue))}</p>
        </div>
        <div className="col-span-4 p-4 bg-surface-sunken/20">
          <div className="space-y-2">
            <div className="flex justify-between typo-body-md"><span className="typo-label-lg typo-mono">Taxable Value</span><CellCurr value={taxableValue} /></div>
            <div className="flex justify-between typo-body-md"><span className="typo-label-lg typo-mono">Central Tax</span><CellCurr value={cgstTotal} /></div>
            <div className="flex justify-between typo-body-md"><span className="typo-label-lg typo-mono">State Tax</span><CellCurr value={sgstTotal} /></div>
            <div className="h-px bg-border my-2"></div>
            <div className="flex justify-between items-baseline">
              <span className="typo-label-lg">Grand Total</span>
              <CellCurr value={totalValue} className="typo-headline-md" />
            </div>
          </div>
        </div>
      </div>

      <ActionConfirmationModal
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        onConfirm={handleSave}
        title="Generate Invoice?"
        message={
          <div className="space-y-4">
            <p className="typo-body-sm">This will finalize the invoice and update financial records.</p>
          </div>
        }
        confirmLabel="Generate"
        cancelLabel="Cancel"
      />
    </div>
  );
}

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-surface animate-pulse" />}>
      <CreateInvoicePageContent />
    </Suspense>
  );
}
