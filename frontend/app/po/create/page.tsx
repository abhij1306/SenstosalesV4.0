"use client";

import React, { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FloppyDiskIcon as Save,
  PlusSignIcon as Plus,
  Delete02Icon as Trash2,
  PackageIcon as Package,
  Loading03Icon as Loader2,
  ShoppingCartIcon as ShoppingCart
} from "@hugeicons/core-free-icons";
import { Button, Input, DatePicker } from "@/components/common/index";
import { api } from "@/lib/api";
import { usePOStore } from "@/store/poStore";
import { PageHeader, Layout, fmtNum, fmtCurr } from "@/components/patterns";
import { TableHeader } from "@/components/patterns/detail";
import { CellNum, CellCurr, CellUnit, CellMaterial } from "@/components/ui/table";

function CreatePOPageContent() {
  const router = useRouter();
  const {
    data,
    setHeader,
    updateHeader,
    addItem,
    removeItem,
    updateItem,
    reset
  } = usePOStore();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reset();
    const defaultHeader = {
      po_number: "",
      po_date: new Date().toISOString().split("T")[0],
      supplier_name: "",
      supplier_code: "",
      supplier_phone: "",
      supplier_fax: "",
      supplier_email: "",
      department_no: "",
      enquiry_no: "",
      enquiry_date: "",
      quotation_ref: "",
      quotation_date: "",
      rc_no: "",
      order_type: "",
      po_status: "New",
      amend_no: 0,
      po_value: 0,
      fob_value: 0,
      net_po_value: 0,
      tin_no: "",
      ecc_no: "",
      mpct_no: "",
      inspection_by: "",
      inspection_at: "",
      consignee_name: "",
      consignee_address: "",
      issuer_name: "",
      issuer_designation: "",
      issuer_phone: "",
      supplier_gstin: "",
      our_ref: "",
    };
    setHeader(defaultHeader);
  }, [setHeader, reset]);

  const { header, items = [] } = data || { header: {} as any, items: [] };

  const handleSave = useCallback(async () => {
    if (!data?.header?.po_number) {
      setError("PO Number is required");
      return;
    }
    if (!data?.header?.po_date) {
      setError("PO Date is required");
      return;
    }

    const invalidItems = items.filter(
      (item: any) => !item.material_description || !item.material_code || !item.unit || item.ord_qty <= 0 || item.po_rate <= 0
    );

    if (invalidItems.length > 0) {
      setError(`Item ${invalidItems[0].po_item_no} has missing mandatory fields (Description, Code, Unit, Qty, Rate)`);
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const payload = {
        header: {
          ...data.header,
          po_number: String(data.header.po_number),
        },
        items: items.map((item: any) => ({
          ...item,
          item_value: item.item_value || (item.ord_qty || 0) * (item.po_rate || 0),
        })),
      };

      await api.createPO(payload);
      router.push(`/po/${encodeURIComponent(data.header.po_number)}`);
    } catch (err: any) {
      setError(err.message || "Failed to save Purchase Order");
    } finally {
      setSaving(false);
    }
  }, [data, items, router]);

  if (!data || !data.header) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );

  const totalValue = items.reduce((acc: number, cur: any) => acc + (cur.item_value || 0), 0);

  // Header actions
  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => router.back()} disabled={saving}>
        Cancel
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={handleSave}
        disabled={saving || !header.po_number || items.length === 0}
      >
        {saving ? <HugeiconsIcon icon={Loader2} className="w-4 h-4 animate-spin mr-1.5" /> : <HugeiconsIcon icon={Save} className="w-4 h-4 mr-1.5" />}
        {saving ? "Saving..." : "Save PO"}
      </Button>
    </div>
  );

  return (
    <div className={Layout.colGap}>
      {/* Header */}
      <PageHeader
        title="Create Purchase Order"
        subtitle={`${items.length} items • Total: ${fmtCurr(totalValue)}`}
        onBack={() => router.back()}
        action={headerActions}
      />

      {/* Error */}
      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2 text-error typo-body-md">
          <HugeiconsIcon icon={Package} className="w-4 h-4" />
          <span className="typo-body-md">{error}</span>
        </div>
      )}

      {/* Metadata Section */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-surface-sunken/30">
          <span className="typo-label-lg text-muted/80">Header Information</span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-4">
            <div>
              <label className="typo-label-lg text-muted/80 block mb-1">
                PO Number <span className="text-error">*</span>
              </label>
              <Input
                value={header.po_number || ""}
                onChange={(e) => updateHeader("po_number", e.target.value)}
                placeholder="PO-001"
                className="h-8 typo-body-md"
              />
            </div>
            <div>
              <label className="typo-label-lg text-muted/80 block mb-1">
                PO Date <span className="text-error">*</span>
              </label>
              <DatePicker
                value={header.po_date || ""}
                onChange={(val) => updateHeader("po_date", val)}
                className="h-8 typo-body-md w-full"
              />
            </div>
            <div>
              <label className="typo-label-lg text-muted/80 block mb-1">Department</label>
              <Input
                value={header.department_no || ""}
                onChange={(e) => updateHeader("department_no", e.target.value)}
                className="h-8 typo-body-md"
              />
            </div>
            <div>
              <label className="typo-label-lg text-muted/80 block mb-1">Order Type</label>
              <Input
                value={header.order_type || ""}
                onChange={(e) => updateHeader("order_type", e.target.value)}
                className="h-8 typo-body-md"
              />
            </div>
            <div>
              <label className="typo-label-lg text-muted/80 block mb-1">Supplier Code</label>
              <Input
                value={header.supplier_code || ""}
                onChange={(e) => updateHeader("supplier_code", e.target.value)}
                className="h-8 typo-body-md"
              />
            </div>
            <div className="col-span-2">
              <label className="typo-label-lg text-muted/80 block mb-1">Supplier Name</label>
              <Input
                value={header.supplier_name || ""}
                onChange={(e) => updateHeader("supplier_name", e.target.value)}
                className="h-8 typo-body-md"
                placeholder="Supplier Name..."
              />
            </div>
            <div>
              <label className="typo-label-lg text-muted/80 block mb-1">Supplier GSTIN</label>
              <Input
                value={header.supplier_gstin || ""}
                onChange={(e) => updateHeader("supplier_gstin", e.target.value)}
                className="h-8 typo-body-md"
              />
            </div>
            <div>
              <label className="typo-label-lg text-muted/80 block mb-1">Quotation Ref</label>
              <Input
                value={header.quotation_ref || ""}
                onChange={(e) => updateHeader("quotation_ref", e.target.value)}
                className="h-8 typo-body-md"
              />
            </div>
            <div>
              <label className="typo-label-lg text-muted/80 block mb-1">RC Number</label>
              <Input
                value={header.rc_no || ""}
                onChange={(e) => updateHeader("rc_no", e.target.value)}
                className="h-8 typo-body-md"
              />
            </div>
            <div>
              <label className="typo-label-lg text-muted/80 block mb-1">TIN No</label>
              <Input
                value={header.tin_no || ""}
                onChange={(e) => updateHeader("tin_no", e.target.value)}
                className="h-8 typo-body-md"
              />
            </div>
            <div>
              <label className="typo-label-lg text-muted/80 block mb-1">ECC No</label>
              <Input
                value={header.ecc_no || ""}
                onChange={(e) => updateHeader("ecc_no", e.target.value)}
                className="h-8 typo-body-md"
              />
            </div>
            <div>
              <label className="typo-label-lg text-muted/80 block mb-1">MPCT No</label>
              <Input
                value={header.mpct_no || ""}
                onChange={(e) => updateHeader("mpct_no", e.target.value)}
                className="h-8 typo-body-md"
              />
            </div>
            <div>
              <label className="typo-label-lg text-muted/80 block mb-1">Our Ref</label>
              <Input
                value={header.our_ref || ""}
                onChange={(e) => updateHeader("our_ref", e.target.value)}
                className="h-8 typo-body-md"
              />
            </div>
            <div className="col-span-2">
              <label className="typo-label-lg text-muted/80 block mb-1">Inspection Terms</label>
              <Input
                value={header.inspection_at || ""}
                onChange={(e) => updateHeader("inspection_at", e.target.value)}
                className="h-8 typo-body-md"
                placeholder="Inspection at..."
              />
            </div>
            <div className="col-span-2">
              <label className="typo-label-lg text-muted/80 block mb-1">Consignee Name</label>
              <Input
                value={header.consignee_name || ""}
                onChange={(e) => updateHeader("consignee_name", e.target.value)}
                className="h-8 typo-body-md"
                placeholder="Consignee Name"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-sunken/30">
          <span className="typo-label-lg text-muted/80">Line Items</span>
          <Button variant="outline" size="sm" onClick={addItem}>
            <HugeiconsIcon icon={Plus} className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-sunken/50 border-b border-border">
                <TableHeader align="center" width="50px">#</TableHeader>
                <TableHeader align="left" minWidth="250px">Material</TableHeader>
                <TableHeader align="left" width="100px">Code</TableHeader>
                <TableHeader align="left" width="80px">HSN/CAT</TableHeader>
                <TableHeader align="center" width="60px">Unit</TableHeader>
                <TableHeader align="right" width="110px">Qty</TableHeader>
                <TableHeader align="right" width="120px">Rate</TableHeader>
                <TableHeader align="right" width="110px">Value</TableHeader>
                <TableHeader width="50px"> </TableHeader>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center typo-body-sm">
                    No items added. Click "Add Item" to begin.
                  </td>
                </tr>
              ) : (
                <>
                  {items.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-border/40 hover:bg-surface-sunken/30">
                      <td className="py-2 px-3 text-center">
                        <CellNum align="center" value={idx + 1} className="typo-body-sm" />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          value={item.material_description || ""}
                          onChange={e => updateItem(idx, "material_description", e.target.value)}
                          className="h-8 typo-body-md w-full"
                          placeholder="Description"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          value={item.material_code || ""}
                          onChange={e => updateItem(idx, "material_code", e.target.value)}
                          className="h-8 typo-mono w-full"
                          placeholder="Code"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          value={item.hsn_code || item.mtrl_cat || ""}
                          onChange={e => updateItem(idx, "hsn_code", e.target.value)}
                          className="h-8 typo-body-sm w-full text-center"
                          placeholder="HSN"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          value={item.unit || ""}
                          onChange={e => updateItem(idx, "unit", e.target.value)}
                          className="h-8 typo-body-sm text-center w-full"
                          placeholder="NOS"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Input
                          type="number"
                          min={0}
                          max={999999}
                          value={item.ord_qty || 0}
                          onChange={e => {
                            const val = Math.max(0, Math.min(999999, Number(e.target.value)));
                            updateItem(idx, "ord_qty", val);
                          }}
                          className="h-8 typo-body-md text-right tabular-nums w-full"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Input
                          type="number"
                          min={0}
                          max={999999999}
                          value={item.po_rate || 0}
                          onChange={e => {
                            const val = Math.max(0, Math.min(999999999, Number(e.target.value)));
                            updateItem(idx, "po_rate", val);
                          }}
                          className="h-8 typo-body-md text-right tabular-nums w-full"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <CellCurr value={(item.ord_qty || 0) * (item.po_rate || 0)} className="typo-body-md" />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Button variant="ghost" size="compact" onClick={() => removeItem(idx)} className="text-error hover:bg-error/10">
                          <HugeiconsIcon icon={Trash2} className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-surface-sunken/50">
                    <td colSpan={7} className="py-2 px-3 text-right">
                      <span className="typo-label-lg text-muted/80">Total</span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className="typo-mono-lg">{fmtCurr(totalValue)}</span>
                    </td>
                    <td></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-lg p-4">
          <label className="typo-label-lg text-muted/80 block mb-2">Consignee Address</label>
          <textarea
            value={header.consignee_address || ""}
            onChange={e => updateHeader("consignee_address", e.target.value)}
            className="w-full h-24 p-2 rounded-md border border-border bg-surface-sunken/30 typo-body-md focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            placeholder="Enter address..."
          />
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <label className="typo-label-lg text-muted/80 block mb-2">Remarks</label>
          <textarea
            value={header.remarks || ""}
            onChange={e => updateHeader("remarks", e.target.value)}
            className="w-full h-24 p-2 rounded-md border border-border bg-surface-sunken/30 typo-body-md focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            placeholder="Enter remarks..."
          />
        </div>
      </div>
    </div>
  );
}

export default function CreatePOPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <CreatePOPageContent />
    </Suspense>
  );
}
