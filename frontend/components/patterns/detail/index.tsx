// DETAIL PAGE COMPONENTS - Consistent detail page layouts

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  PencilEdit01Icon,
  Tick02Icon,
  Cancel01Icon,
  PlusSignIcon
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

// ============================================================================
// DETAIL PAGE HEADER - Breadcrumb + Title + Actions
// ============================================================================

interface DetailHeaderProps {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel: string;
  status?: {
    label: string;
    color: "success" | "warning" | "error" | "primary";
  };
  actions?: React.ReactNode;
}

export const DetailHeader = React.memo(({
  title,
  subtitle,
  backHref,
  backLabel,
  status,
  actions
}: DetailHeaderProps) => (
  <div className="space-y-3">
    {/* Breadcrumb */}
    <Link
      href={backHref}
      className="inline-flex items-center gap-1 typo-body-sm hover:text-primary transition-colors"
    >
      <HugeiconsIcon icon={ArrowLeft02Icon} className="w-4 h-4" />
      Back to {backLabel}
    </Link>

    {/* Title Row */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="typo-headline-md">{title}</h1>
        {status && (
          <span className={`px-2 py-0.5 rounded typo-label-md ${status.color === "success" ? "bg-success/10 text-success" :
            status.color === "warning" ? "bg-warning/10 text-warning" :
              status.color === "error" ? "bg-error/10 text-error" :
                "bg-primary/10 text-primary"
            }`}>
            {status.label}
          </span>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>

    {subtitle && <p className="typo-body-sm">{subtitle}</p>}
  </div>
));
DetailHeader.displayName = "DetailHeader";

// ============================================================================
// INFO ITEM - Single label/value pair
// ============================================================================

interface InfoItemProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  href?: string;
}

export const InfoItem = React.memo(({ label, value, className, href }: InfoItemProps) => {
  const valueContent = (
    <div className="typo-body-md">
      {value ?? "—"}
    </div>
  );

  return (
    <div className={className}>
      <div className="typo-label-md mb-1.5">
        {label}
      </div>
      {href ? (
        <Link href={href} className="typo-body-md text-primary hover:underline">
          {value ?? "—"}
        </Link>
      ) : (
        valueContent
      )}
    </div>
  );
});
InfoItem.displayName = "InfoItem";

// ============================================================================
// EDITABLE INFO ITEM - For create/edit modes
// ============================================================================

interface EditableInfoItemProps extends InfoItemProps {
  editable?: boolean;
  onChange?: (value: string) => void;
  type?: "text" | "date" | "number";
  placeholder?: string;
}

export const EditableInfoItem = React.memo(({
  label,
  value,
  className,
  editable = false,
  onChange,
  type = "text",
  placeholder,
}: EditableInfoItemProps) => {
  return (
    <div className={className}>
      <div className="typo-label-md mb-1.5">
        {label}
      </div>
      {editable ? (
        <input
          type={type}
          value={(value as string) ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full px-2 py-1 typo-body-md bg-surface-sunken border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      ) : (
        <div className="typo-body-md">
          {value ?? "—"}
        </div>
      )}
    </div>
  );
});
EditableInfoItem.displayName = "EditableInfoItem";

// ============================================================================
// INFO GRID - Key-value pairs in a grid
// ============================================================================

interface InfoGridItem {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
  href?: string;
}

interface InfoGridProps {
  items?: InfoGridItem[];
  columns?: 2 | 3 | 4 | 6;
  children?: React.ReactNode;
}

export const InfoGrid = React.memo(({ items, columns = 4, children }: InfoGridProps) => {
  const colClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    6: "grid-cols-2 md:grid-cols-4 lg:grid-cols-6",
  }[columns];

  return (
    <div className={cn("grid gap-x-6 gap-y-4", colClass)}>
      {items?.map((item, i) => (
        <InfoItem
          key={i}
          label={item.label}
          value={item.value}
          href={item.href}
          className={cn(item.fullWidth && "col-span-full")}
        />
      ))}
      {children}
    </div>
  );
});
InfoGrid.displayName = "InfoGrid";

// ============================================================================
// INFO SECTION - Card wrapper with title (standard for all detail pages)
// ============================================================================

interface InfoSectionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export const InfoSection = React.memo(({
  title,
  children,
  className,
  headerClassName,
}: InfoSectionProps) => (
  <div className={cn("bg-surface border border-border rounded-lg overflow-hidden", className)}>
    <div className={cn("px-3 py-2 border-b border-border bg-surface-sunken/30", headerClassName)}>
      <span className="typo-label-md">
        {title}
      </span>
    </div>
    <div className="p-4">
      {children}
    </div>
  </div>
));
InfoSection.displayName = "InfoSection";

// ============================================================================
// LINE ITEMS HEADER - Standardized header for line items tables
// ============================================================================

interface LineItemsHeaderProps {
  counts: { label: string; value: number }[];
}

export const LineItemsHeader = ({ counts }: LineItemsHeaderProps) => (
  <div className="flex items-center gap-1.5">
    <span>Line Items</span>
    {counts.map((c, i) => (
      <React.Fragment key={c.label}>
        <span className="text-muted/50">•</span>
        <span className="text-secondary">{c.label}: {c.value.toLocaleString('en-IN')}</span>
      </React.Fragment>
    ))}
  </div>
);
LineItemsHeader.displayName = "LineItemsHeader";

// ============================================================================
// TABLE SECTION - Standardized table wrapper
// ============================================================================

interface TableSectionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export const TableSection = React.memo(({
  title,
  children,
  className,
  headerAction,
}: TableSectionProps) => (
  <div className={cn("bg-surface border border-border rounded-lg overflow-hidden", className)}>
    <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-sunken/30">
      <div className="typo-label-md">{title}</div>
      {headerAction && <div>{headerAction}</div>}
    </div>
    <div className="overflow-x-auto">
      {children}
    </div>
  </div>
));
TableSection.displayName = "TableSection";

// ============================================================================
// SECTION CARD - For detail page sections (with icon support)
// ============================================================================

interface DetailSectionProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const DetailSection = ({ title, icon, children, className }: DetailSectionProps) => (
  <div className={cn("bg-surface border border-border rounded-lg overflow-hidden", className)}>
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-sunken/30">
      {icon && <span className="text-primary">{icon}</span>}
      <h2 className="typo-headline-sm">{title}</h2>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

// ============================================================================
// TAB NAVIGATION - For detail pages with tabs
// ============================================================================

interface Tab {
  id: string;
  label: string;
  badge?: number;
}

interface DetailTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export const DetailTabs = ({ tabs, activeTab, onChange }: DetailTabsProps) => (
  <div className="flex items-center gap-1 border-b border-border" role="tablist">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        role="tab"
        id={`${tab.id}-tab`}
        aria-controls={`${tab.id}-panel`}
        aria-selected={activeTab === tab.id}
        onClick={() => onChange(tab.id)}
        className={cn(
          "px-4 py-2.5 typo-body-md transition-colors relative",
          activeTab === tab.id
            ? "text-primary"
            : "text-secondary hover:text-foreground"
        )}
      >
        <span className="flex items-center gap-2">
          {tab.label}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary typo-label-md rounded-full min-w-[18px]">
              {tab.badge}
            </span>
          )}
        </span>
        {activeTab === tab.id && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
        )}
      </button>
    ))}
  </div>
);

// ============================================================================
// TABLE COMPONENTS - Standardized table header and cell
// ============================================================================

interface TableHeaderProps {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  minWidth?: string;
  colSpan?: number;
  className?: string;
}

export const TableHeader = React.memo(({
  children,
  align = "left",
  width,
  minWidth,
  colSpan,
  className,
}: TableHeaderProps) => (
  <th
    className={cn(
      "py-2 px-3",
      align === "left" && "text-left",
      align === "center" && "text-center",
      align === "right" && "text-right",
      className
    )}
    style={{ width, minWidth }}
    colSpan={colSpan}
  >
    <span className="typo-label-md">
      {children}
    </span>
  </th>
));
TableHeader.displayName = "TableHeader";

interface TableCellProps {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

export const TableCell = React.memo(({
  children,
  align = "left",
  className,
}: TableCellProps) => (
  <td
    className={cn(
      "py-2 px-3 typo-body-md",
      align === "left" && "text-left",
      align === "center" && "text-center",
      align === "right" && "text-right tabular-nums",
      className
    )}
  >
    {children}
  </td>
));
TableCell.displayName = "TableCell";

// ============================================================================
// STATUS BADGE - Consistent status display
// ============================================================================

interface StatusBadgeProps {
  status: string;
  href?: string;
}

export const StatusBadge = React.memo(({ status, href }: StatusBadgeProps) => {
  const isActive = ["Created", "Active", "Completed", "Delivered", "Paid"].includes(status);
  const isPending = ["Pending", "In Progress"].includes(status);

  const classes = cn(
    "typo-body-md",
    isActive && "text-success",
    isPending && "text-subtle",
    !isActive && !isPending && "text-secondary"
  );

  if (href) {
    return (
      <Link href={href} className={cn(classes, "hover:underline")}>
        {status}
      </Link>
    );
  }

  return <span className={classes}>{status}</span>;
});
StatusBadge.displayName = "StatusBadge";

// ============================================================================
// ITEMS TABLE - For line items in detail pages
// ============================================================================

interface LineItem {
  id: string | number;
  description: string;
  specs?: string;
  ordered: number;
  dispatched: number;
  received: number;
  rejected: number;
  unit: string;
}

interface ItemsTableProps {
  items: LineItem[];
}

export const ItemsTable = React.memo(({ items }: ItemsTableProps) => (
  <div className="border border-border rounded-lg overflow-hidden">
    <table className="w-full">
      <thead>
        <tr className="bg-surface-sunken/50 border-b border-border">
          <th className="text-left py-2 px-3 typo-label-md">Item</th>
          <th className="text-right py-2 px-3 typo-label-md w-20">Ordered</th>
          <th className="text-right py-2 px-3 typo-label-md w-20">Dispatched</th>
          <th className="text-right py-2 px-3 typo-label-md w-20">Received</th>
          <th className="text-right py-2 px-3 typo-label-md w-20">Rejected</th>
          <th className="text-left py-2 px-3 typo-label-md w-16">Unit</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-surface-sunken/30">
            <td className="py-2 px-3">
              <div className="typo-body-md">{item.description}</div>
              {item.specs && <div className="typo-body-sm">{item.specs}</div>}
            </td>
            <td className="py-2 px-3 text-right">
              <span className="typo-body-md tabular-nums text-foreground">{item.ordered.toLocaleString("en-IN")}</span>
            </td>
            <td className="py-2 px-3 text-right">
              <span className="typo-body-md tabular-nums text-warning">{item.dispatched.toLocaleString("en-IN")}</span>
            </td>
            <td className="py-2 px-3 text-right">
              <span className="typo-body-md tabular-nums text-success">{item.received.toLocaleString("en-IN")}</span>
            </td>
            <td className="py-2 px-3 text-right">
              <span className="typo-body-md tabular-nums text-error">{item.rejected.toLocaleString("en-IN")}</span>
            </td>
            <td className="py-2 px-3">
              <span className="typo-label-md">{item.unit}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
));
ItemsTable.displayName = "ItemsTable";

// ============================================================================
// SUMMARY BAR - Bottom summary stats
// ============================================================================

interface SummaryItem {
  label: string;
  value: string | number;
  color?: "default" | "success" | "warning" | "error";
}

interface SummaryBarProps {
  items: SummaryItem[];
}

export const SummaryBar = ({ items }: SummaryBarProps) => (
  <div className="flex items-center justify-end gap-6 px-4 py-3 bg-surface-sunken/50 border-t border-border">
    {items.map((item, i) => (
      <div key={i} className="flex items-center gap-2">
        <span className="typo-label-md text-secondary">{item.label}</span>
        <span className={`typo-headline-sm ${item.color === "success" ? "text-success" :
          item.color === "warning" ? "text-warning" :
            item.color === "error" ? "text-error" :
              "text-foreground"
          }`}>
          {item.value}
        </span>
      </div>
    ))}
  </div>
);

// ============================================================================
// ACTION BUTTONS - Standard action buttons
// ============================================================================

export const ActionButtons = {
  Edit: ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-btn-horiz py-btn-vert typo-body-md bg-surface border border-border rounded-md hover:bg-surface-sunken transition-colors"
    >
      <HugeiconsIcon icon={PencilEdit01Icon} className="w-4 h-4" />
      Edit
    </button>
  ),

  Save: ({ onClick, loading }: { onClick: () => void; loading?: boolean }) => (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 typo-body-md text-white bg-primary rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors"
    >
      <HugeiconsIcon icon={Tick02Icon} className="w-4 h-4" />
      {loading ? "Saving..." : "Save"}
    </button>
  ),

  Cancel: ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 typo-body-md text-secondary bg-transparent border border-border rounded-md hover:bg-surface-sunken transition-colors"
    >
      <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
      Cancel
    </button>
  ),

  CreateDC: ({ href, disabled }: { href: string; disabled?: boolean }) => (
    <Link
      href={disabled ? "#" : href}
      onClick={(e) => disabled && e.preventDefault()}
      className={`flex items-center gap-1.5 px-3 py-1.5 typo-body-md rounded-md transition-colors ${disabled
        ? "bg-surface text-subtle cursor-not-allowed"
        : "bg-primary text-white hover:bg-primary-hover"
        }`}
    >
      <HugeiconsIcon icon={PlusSignIcon} className="w-4 h-4" />
      Create DC
    </Link>
  ),
};
