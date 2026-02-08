"use client";

import { ActionConfirmationModal, Button, useToast, AsyncAutocomplete, Input, DatePicker } from "@/components/common/index";
import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FloppyDiskIcon as Save,
  AlertCircleIcon as AlertCircle,
  Loading03Icon as Loader2,
  DeliveryTruck01Icon as Truck,
  PackageIcon as Package
} from "@hugeicons/core-free-icons";
import { api } from "@/lib/api";
import { SearchResult } from "@/types";
import { useDCHeader, useDCItems, usePOData, useDCNotes, useDCNumberStatus, useDCActions } from "@/store/dcStore";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader, Layout, fmtNum, fmtCurr } from "@/components/patterns";
import { TableHeader } from "@/components/patterns/detail";
import { CellNum, CellCurr, CellUnit, CellMaterial } from "@/components/ui/table";
import { cn } from "@/lib/utils";

function CreateDCPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const initialPoNumber = searchParams ? searchParams.get("po") : "";

  const defaultHeader = {
    dc_number: "",
    dc_date: new Date().toISOString().split("T")[0],
    our_ref: "",
    consignee_name: "",
    consignee_address: "",
    department_no: "",
    gc_number: "",
    gc_date: new Date().toISOString().split("T")[0],
  };

  const [poNumber, setPONumber] = useState(initialPoNumber || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const gcNumberEditedByUser = React.useRef(false);
  const gcDateEditedByUser = React.useRef(false);

  const storeHeader = useDCHeader();
  const header = isInitialized ? (storeHeader || defaultHeader) : defaultHeader;
  const items = useDCItems();
  const poData = usePOData();
  const notes = useDCNotes();
  const { isChecking: isCheckingNumber, isDuplicate: isDuplicateNumber } = useDCNumberStatus();
  const { updateHeader, setHeader, updateItem, setPOData, setItems, addNote, updateNote, removeNote, setNumberStatus, clear } = useDCActions();

  const debouncedDCNumber = useDebounce(header.dc_number, 500);

  useEffect(() => {
    if (!isInitialized) return;
    if (debouncedDCNumber && debouncedDCNumber.trim() !== "") {
      checkNumberDuplicate(debouncedDCNumber, header.dc_date);
      if (!gcNumberEditedByUser.current) {
        updateHeader("gc_number", debouncedDCNumber);
      }
      if (!gcDateEditedByUser.current) {
        updateHeader("gc_date", header.dc_date);
      }
    } else {
      setNumberStatus(false, false, null);
    }
  }, [debouncedDCNumber, isInitialized, header.dc_date]);

  useEffect(() => {
    const init = async () => {
      setIsInitialized(false);
      clear();
      if (initialPoNumber) {
        await loadInitialData(initialPoNumber);
      }
      setIsInitialized(true);
    };
    init();
    return () => { setIsInitialized(false); clear(); };
  }, [initialPoNumber]);

  const loadInitialData = async (po: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getDispatchableItems(po);

      if (!data || !data.items) {
        setError("No dispatchable items found for this PO.");
        setIsLoading(false);
        return;
      }

      const mappedItems = data.items.map((item: any) => ({
        id: item.id,
        po_item_id: item.po_item_id.toString(),
        po_item_no: item.po_item_no,
        lot_no: item.lot_no,
        material_code: item.material_code,
        description: item.description,
        drg_no: item.drg_no,
        mtrl_cat: item.mtrl_cat,
        unit: item.unit,
        po_rate: item.po_rate,
        ord_qty: item.ord_qty,
        dsp_qty: item.dsp_qty,
        rcd_qty: item.rcd_qty,
        dispatch_qty: 0,
        pending_post_dc: item.balance_quantity,
        original_pending: item.balance_quantity,
        dely_date: item.dely_date,
      }));

      const aggregatedMap: Record<string, any> = {};
      mappedItems.forEach((item: any) => {
        const key = item.po_item_id;
        if (!aggregatedMap[key]) {
          aggregatedMap[key] = { ...item, lot_no: undefined };
        } else {
          aggregatedMap[key].ord_qty = (aggregatedMap[key].ord_qty || 0) + (item.ord_qty || 0);
          aggregatedMap[key].dsp_qty = (aggregatedMap[key].dsp_qty || 0) + (item.dsp_qty || 0);
          aggregatedMap[key].rcd_qty = (aggregatedMap[key].rcd_qty || 0) + (item.rcd_qty || 0);
          aggregatedMap[key].original_pending = (aggregatedMap[key].original_pending || 0) + (item.original_pending || 0);
          aggregatedMap[key].pending_post_dc = (aggregatedMap[key].pending_post_dc || 0) + (item.pending_post_dc || 0);
        }
      });

      const aggregatedItems = Object.values(aggregatedMap);
      setItems(aggregatedItems);

      if (data.header) {
        setPOData(data.header);
        setHeader({
          dc_number: "",
          dc_date: new Date().toISOString().split("T")[0],
          our_ref: data.header.our_ref || "",
          consignee_name: data.header.consignee_name || "",
          consignee_address: data.header.consignee_address || "",
          department_no: data.header.department_no || "",
        });
      }

      if (aggregatedItems.length === 0) {
        setError("No dispatchable items remaining for this PO.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load initial data");
    } finally {
      setIsLoading(false);
    }
  };

  const checkNumberDuplicate = async (num: string, date: string) => {
    if (!num || num.trim() === "") return;
    setNumberStatus(true, false, null);
    try {
      const res = await api.checkDuplicateNumber("DC", num, date);
      setNumberStatus(false, res.exists, res.conflict_type || null);
    } catch {
      setNumberStatus(false, false, null);
    }
  };

  const handleSave = () => {
    if (!header.dc_number || !header.dc_date) {
      setError("DC Number and Date are required");
      return;
    }
    if (isDuplicateNumber) {
      setError("Duplicate Number detected. Must be unique across DCs and Invoices.");
      return;
    }
    if (items.some((i: any) => (i.dispatch_qty || 0) > 0)) {
      setShowWarning(true);
    } else {
      setError("Please dispatch at least one item.");
    }
  };

  const confirmSave = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const dcPayload = {
        dc_number: header.dc_number,
        dc_date: header.dc_date,
        our_ref: header.our_ref || "",
        po_number: poData?.po_number || initialPoNumber || poNumber || undefined,
        consignee_name: header.consignee_name,
        consignee_address: header.consignee_address,
        department_no: header.department_no ? parseInt(header.department_no.toString()) || null : null,
        remarks: notes.join("\n\n"),
        gc_number: header.gc_number || header.dc_number,
        gc_date: header.gc_date || header.dc_date,
      };

      const dispatchItems = items.filter((i: any) => (i.dispatch_qty || 0) > 0);
      const itemsPayload = dispatchItems.map((item: any) => ({
        po_item_id: item.po_item_id,
        lot_no: item.lot_no ? parseInt(item.lot_no.toString()) : undefined,
        dispatch_qty: item.dispatch_qty,
        hsn_code: null,
        hsn_rate: null,
      }));

      const response = await api.createDC(dcPayload, itemsPayload) as any;
      setNumberStatus(false, false, null);
      router.push(`/dc/${response.dc_number || header.dc_number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create Delivery Challan");
      setIsSubmitting(false);
    } finally {
      setShowWarning(false);
    }
  };

  const totalDCValue = items.reduce((sum: number, i: any) => sum + ((i.dispatch_qty || 0) * (i.po_rate || 0)), 0);
  const totalDispatchQty = items.reduce((sum: number, i: any) => sum + (i.dispatch_qty || 0), 0);
  const isGenerateMode = !!initialPoNumber;

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Header actions
  const headerActions = (
    <div className="flex items-center gap-2">
      {!isGenerateMode && (
        <div className="flex items-center gap-2 mr-2">
          <AsyncAutocomplete
            placeholder="Search PO..."
            value={poNumber || ""}
            onChange={setPONumber}
            fetcher={async (q: string) => {
              const res = await api.searchGlobal(q);
              return res.filter((r: SearchResult) => r.type === "PO");
            }}
            getLabel={(item: SearchResult) => item.number}
            renderOption={(item: SearchResult) => (
              <div className="flex flex-col">
                <span className="typo-body-md">{item.number}</span>
                <span className="typo-body-sm">{item.party}</span>
              </div>
            )}
            onSelect={(item: SearchResult) => loadInitialData(item.number)}
            className="w-48"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => poNumber && loadInitialData(poNumber)}
            disabled={!poNumber || isLoading}
          >
            Link
          </Button>
        </div>
      )}
      <Button variant="outline" size="sm" onClick={() => router.back()} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={handleSave}
        disabled={isSubmitting || items.length === 0 || isDuplicateNumber || isCheckingNumber || !header.dc_number}
      >
        {isSubmitting ? <HugeiconsIcon icon={Loader2} className="w-4 h-4 animate-spin mr-1" /> : <HugeiconsIcon icon={Save} className="w-4 h-4 mr-1" />}
        {isSubmitting ? "Saving..." : "Save DC"}
      </Button>
    </div>
  );

  return (
    <div className={Layout.colGap}>
      {/* Header */}
      <PageHeader
        title="Create Delivery Challan"
        subtitle={
          poData ? (
            <span>PO: <Link href={`/po/${poData.po_number}`} className="text-primary hover:underline hover:text-primary-hover">{poData.po_number}</Link> • {items.length} items • Total: {fmtCurr(totalDCValue)}</span>
          ) : (
            <span className="text-subtle">Link a PO to begin</span>
          )
        }
        onBack={() => router.back()}
        action={headerActions}
      />

      {/* Error */}
      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2 text-error typo-body-md">
          <HugeiconsIcon icon={AlertCircle} className="w-4 h-4" />
          <span className="typo-body-md">{error}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-surface-sunken/30">
          <span className="typo-label-lg">Challan Details</span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
            <div>
              <label className="typo-label-lg block mb-1">
                DC Number <span className="text-error">*</span>
              </label>
              <Input
                value={header.dc_number || ""}
                onChange={(e) => updateHeader("dc_number", e.target.value)}
                className={cn("h-8 typo-body-md", isDuplicateNumber && "border-rose-500 focus:ring-error/30")}
                placeholder="DC-001"
              />
              {isDuplicateNumber && (
                <span className="typo-body-sm text-error">Duplicate number</span>
              )}
            </div>
            <div>
              <label className="typo-label-lg block mb-1">
                DC Date <span className="text-error">*</span>
              </label>
              <DatePicker
                value={header.dc_date || ""}
                onChange={(val) => updateHeader("dc_date", val)}
                className="h-8 typo-body-md w-full"
              />
            </div>
            <div>
              <label className="typo-label-lg block mb-1">GC Number</label>
              <Input
                value={header.gc_number || ""}
                onChange={(e) => { gcNumberEditedByUser.current = true; updateHeader("gc_number", e.target.value); }}
                className="h-8 typo-body-md"
              />
            </div>
            <div>
              <label className="typo-label-lg block mb-1">GC Date</label>
              <DatePicker
                value={header.gc_date || ""}
                onChange={(val) => { gcDateEditedByUser.current = true; updateHeader("gc_date", val); }}
                className="h-8 typo-body-md w-full"
              />
            </div>
            <div className="col-span-2">
              <label className="typo-label-lg block mb-1">Consignee</label>
              <Input
                value={header.consignee_name || ""}
                onChange={(e) => updateHeader("consignee_name", e.target.value)}
                className="h-8 typo-body-md"
              />
            </div>
            <div className="col-span-2">
              <label className="typo-label-lg block mb-1">Our Ref</label>
              <Input
                value={header.our_ref || ""}
                onChange={(e) => updateHeader("our_ref", e.target.value)}
                className="h-8 typo-body-md"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-sunken/30">
          <span className="typo-label-lg">
            Items to Dispatch • {fmtNum(totalDispatchQty)} units
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-sunken/50 border-b border-border">
                <TableHeader align="center" width="60px">Item</TableHeader>
                <TableHeader align="left">Material</TableHeader>
                <TableHeader align="center" width="60px">Unit</TableHeader>
                <TableHeader align="right" width="90px">Ordered</TableHeader>
                <TableHeader align="right" width="90px">Dispatched</TableHeader>
                <TableHeader align="right" width="90px">Balance</TableHeader>
                <TableHeader align="right" width="100px">Dispatch Qty</TableHeader>
                <TableHeader align="right" width="100px">Value</TableHeader>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center typo-body-sm">
                    {poData ? "No dispatchable items." : "Link a PO to load items."}
                  </td>
                </tr>
              ) : (
                items.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-border/40 hover:bg-surface-sunken/30">
                    <td className="py-2 px-3 text-center">
                      <CellNum align="center" value={item.po_item_no} className="typo-body-sm" />
                    </td>
                    <td className="py-2 px-3">
                      <CellMaterial
                        code={item.material_code}
                        description={item.material_description || item.description}
                        drg={item.drg_no}
                        cat={item.mtrl_cat}
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <CellUnit value={item.unit} />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <CellNum value={item.ord_qty} />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <CellNum value={item.dsp_qty} />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <CellNum value={item.original_pending} className="text-muted" />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Input
                        type="number"
                        min={0}
                        max={item.original_pending || 0}
                        value={item.dispatch_qty || 0}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(Number(e.target.value), item.original_pending || 0));
                          updateItem(idx, "dispatch_qty", val);
                        }}
                        className="h-8 typo-body-md text-right tabular-nums w-24"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <CellCurr value={(item.dispatch_qty || 0) * (item.po_rate || 0)} className="typo-body-md" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <label className="typo-label-lg block mb-2">Notes / Remarks</label>

        {/* Auto-generated: GC Note */}
        <div className="flex items-center gap-2 py-2 px-3 bg-primary/10 rounded-lg border border-primary/20 mb-2">
          <span className="typo-body-sm text-primary">GC</span>
          <span className="flex-1 typo-body-sm text-foreground">
            Guarantee Certificate No. {header.gc_number || header.dc_number || "—"} Dt. {header.gc_date || header.dc_date || "—"}
          </span>
          <span className="typo-body-sm text-primary opacity-70">AUTO</span>
        </div>

        {/* Auto-generated: Consignment Value Note */}
        <div className="flex items-center gap-2 py-2 px-3 bg-primary/10 rounded-lg border border-primary/20 mb-3">
          <span className="typo-body-sm text-primary">VAL</span>
          <span className="flex-1 typo-body-sm text-foreground">
            Consignment value: {totalDCValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })}
          </span>
          <span className="typo-body-sm text-primary opacity-70">AUTO</span>
        </div>

        {/* User-added notes */}
        {notes.map((note: string, idx: number) => (
          <div key={idx} className="flex gap-2 mb-2">
            <Input
              value={note}
              onChange={(e) => updateNote(idx, e.target.value)}
              className="flex-1 h-8 typo-body-md"
              placeholder={`Note ${idx + 1}`}
            />
            <Button variant="ghost" size="compact" onClick={() => removeNote(idx)} className="text-error">
              Remove
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addNote} className="mt-1">
          Add Note
        </Button>
      </div>

      <ActionConfirmationModal
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        onConfirm={confirmSave}
        title="Confirm Challan Generation"
        warningText="This will deduct quantities from the PO balance. Ensure details are correct."
        confirmLabel={isSubmitting ? "Generating..." : "Generate DC"}
        variant="danger"
      />
    </div>
  );
}

export default function CreateDCPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-surface animate-pulse" />}>
      <CreateDCPageContent />
    </Suspense>
  );
}
