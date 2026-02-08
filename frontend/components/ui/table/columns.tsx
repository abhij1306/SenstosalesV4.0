"use client";

import React from "react";
import {
  CellRef,
  CellDate,
  CellNum,
  CellCurr,
  CellStatus,
  CellPct,
  CellMaterial,
} from "./cells";

// ============================================================================
// COLUMN FACTORIES - Pre-configured column definitions
// ============================================================================

interface ColumnConfig<T> {
  key: keyof T | string;
  label: string;
  width?: string;
  sortable?: boolean;
}

// Reference column factory
export function colRef<T extends { po_number?: string; dc_number?: string; invoice_number?: string; srv_number?: string }>(
  config: { href: (row: T) => string; width?: string }
) {
  return {
    key: "reference" as any,
    label: "Reference",
    width: config.width || "120px",
    sortable: true,
    render: (_v: any, row: T) => {
      const value = row.po_number || row.dc_number || row.invoice_number || row.srv_number || "";
      return <CellRef value={value} href={config.href(row)} />;
    },
  };
}

// Date column factory
export function colDate(key: string = "date", label: string = "Date", width: string = "90px") {
  return {
    key,
    label,
    width,
    sortable: true,
    render: (v: string) => <CellDate value={v} />,
  };
}

// Number column factory
export function colNum(key: string, label: string, width: string = "80px") {
  return {
    key,
    label,
    width,
    sortable: true,
    align: "right" as const,
    render: (v: number) => <CellNum value={v} />,
  };
}

// Currency column factory
export function colCurr(key: string, label: string = "Value", width: string = "110px") {
  return {
    key,
    label,
    width,
    sortable: true,
    align: "right" as const,
    render: (v: number) => <CellCurr value={v} />,
  };
}

// Status column factory
export function colStatus(
  key: string = "status",
  label: string = "Status",
  width: string = "90px",
  options?: Record<string, "success" | "warning" | "error" | "primary">
) {
  return {
    key,
    label,
    width,
    sortable: true,
    align: "center" as const,
    render: (v: string) => <CellStatus value={v} options={options} />,
  };
}

// Percentage column factory
export function colPct(key: string, label: string, width: string = "60px") {
  return {
    key,
    label,
    width,
    sortable: true,
    align: "right" as const,
    render: (v: number) => <CellPct value={v} />,
  };
}

// Material/Description column factory
export function colMaterial(key: string = "material", label: string = "Material", width: string = "40%") {
  return {
    key,
    label,
    width,
    render: (v: string, row: any) => (
      <CellMaterial code={row.material_code} description={v} />
    ),
  };
}
