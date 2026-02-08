/**
 * Status Maps - Consistent status color mappings
 * Aligned with backend/core/constants.py
 */

export const PO_STATUS = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ACTIVE: "Active",
  NEW: "New",
} as const;

export const DC_STATUS = {
  PENDING: "Pending",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
} as const;

export const INVOICE_STATUS = {
  PENDING: "Pending",
  PAID: "Paid",
  OVERDUE: "Overdue",
} as const;

export const statusMaps = {
  po: {
    [PO_STATUS.COMPLETED]: "success",
    [PO_STATUS.PENDING]: "warning",
    [PO_STATUS.IN_PROGRESS]: "primary",
    [PO_STATUS.CANCELLED]: "error",
    [PO_STATUS.ACTIVE]: "success",
    [PO_STATUS.NEW]: "primary",
  } as Record<string, "success" | "warning" | "error" | "primary">,

  dc: {
    [DC_STATUS.DELIVERED]: "success",
    [DC_STATUS.IN_TRANSIT]: "warning",
    [DC_STATUS.PENDING]: "primary",
  } as Record<string, "success" | "warning" | "error" | "primary">,

  invoice: {
    [INVOICE_STATUS.PAID]: "success",
    [INVOICE_STATUS.PENDING]: "warning",
    [INVOICE_STATUS.OVERDUE]: "error",
  } as Record<string, "success" | "warning" | "error" | "primary">,
} as const;
