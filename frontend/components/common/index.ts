"use client";

/**
 * Common Components - Aether Design System
 * Standardized component exports for consistent UI
 */

// ============================================================================
// PRIMITIVES
// ============================================================================
export { Button, type ButtonProps } from "./Button";
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, type CardProps } from "./Card";
export { Input, Label, HelperText, FormGroup, type InputProps } from "./Input";
export { Badge, StatusBadge, type BadgeProps } from "./Badge";

// ============================================================================
// NAVIGATION
// ============================================================================
export { SidebarNav } from "./SidebarNav";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./Tabs";

// ============================================================================
// OVERLAYS
// ============================================================================
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./Dialog";
export { Popover, PopoverTrigger, PopoverContent } from "./popover";
export { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./Tooltip";

// ============================================================================
// FEEDBACK
// ============================================================================
export { ToastProvider, useToast } from "./Toast";
export { EmptyState } from "./EmptyState";
export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTable,
  SkeletonStatCard,
  type SkeletonProps,
} from "./Skeleton";

// ============================================================================
// DATA DISPLAY
// ============================================================================
export { DataTable, type Column } from "./DataTable";
export { MetadataItem, type MetadataItemProps } from "./MetadataItem";
export { Pagination } from "./Pagination";

// ============================================================================
// FORMS
// ============================================================================
export { Checkbox } from "./Checkbox";
export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./Select";
export { Autocomplete } from "./Autocomplete";
export { AsyncAutocomplete } from "./AsyncAutocomplete";
export { GlobalSearch } from "./GlobalSearch";
export { QuantityInput } from "./QuantityInput";
export { GranularInput } from "./GranularInput";

// ============================================================================
// LAYOUT
// ============================================================================
export { Box, Flex, Stack, Grid } from "./Layout";

// ============================================================================
// TEMPLATES
// ============================================================================
export { ListPageTemplate } from "./ListPageTemplate";
export { DocumentTemplate } from "./DocumentTemplate";

// ============================================================================
// THEME
// ============================================================================
export { ThemeProvider } from "./ThemeProvider";
export { ThemeToggle } from "./ThemeToggle";

// ============================================================================
// UTILITIES
// ============================================================================
export { ActionConfirmationModal } from "./ActionConfirmationModal";
export { FileUploadModal } from "./FileUploadModal";

// ============================================================================

export { FieldGroup } from "./FieldGroup";
export { HeaderActions } from "./HeaderActions";

// ============================================================================
// DATE PICKER COMPONENTS
// ============================================================================
export * from "./Calendar";
export { DatePicker, DatePickerCompact, type DatePickerProps, type DatePickerCompactProps } from "./DatePicker";
export { DateRangePicker, type DateRangePickerProps, type DateRange } from "./DateRangePicker";
