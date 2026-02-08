# Aether Design System v3.0

A comprehensive, token-based design system for the SenstoSales ERP application. Built for consistency, accessibility, and modern aesthetics with Material Design Typography v3.0.

## Table of Contents

1. [Overview](#overview)
2. [Design Tokens](#design-tokens)
3. [Typography v3.0](#typography-v30)
4. [Component Library](#component-library)
5. [Usage Guidelines](#usage-guidelines)
6. [File Structure](#file-structure)

---

## Overview

Aether Design System provides a cohesive visual language for the SenstoSales ERP application. It emphasizes:

- **Consistency**: Every UI element follows strict design tokens
- **Accessibility**: WCAG 2.1 AA compliant color contrast and interactions
- **Performance**: CSS-first approach with Tailwind CSS v4
- **Modern Aesthetics**: Clean, professional ERP interface
- **Type Safety**: Full TypeScript support
- **Typography v3.0**: 15-class Material Design system

### Key Features

- ✅ Light/Dark mode support
- ✅ 4px base spacing system
- ✅ Semantic color tokens
- ✅ OKLCH color support
- ✅ CSS-first `@theme` block (Tailwind v4)
- ✅ Consistent elevation shadows
- ✅ Memoized components for performance
- ✅ Typography v3.0 (Material Design 3 compliance)

---

## Design Tokens

All tokens are defined in `frontend/app/globals.css` using Tailwind CSS v4's `@theme` block.

### Color Primitives

```css
/* Neutral Scale (Cool Gray) */
--color-neutral-50: #f8fafc;   /* background */
--color-neutral-100: #f1f5f9;  /* surface-sunken */
--color-neutral-200: #e2e8f0;  /* border */
--color-neutral-500: #64748b;  /* text-tertiary */
--color-neutral-600: #475569;  /* text-secondary */
--color-neutral-900: #0f172a;  /* text-primary */

/* Primary Scale (Royal Blue) */
--color-blue-600: #2563eb;     /* primary */
--color-blue-700: #1d4ed8;     /* primary-hover */

/* Status Colors */
--color-emerald-600: #059669;  /* success */
--color-amber-600: #d97706;    /* warning */
--color-rose-600: #e11d48;     /* error */
--color-cyan-600: #0891b2;     /* info */
```

### Semantic Color Tokens

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--background` | `#f8fafc` | `#1e1e1e` | Page background |
| `--surface` | `#ffffff` | `#252526` | Cards, panels |
| `--surface-elevated` | `#ffffff` | `#2d2d2d` | Elevated elements |
| `--surface-sunken` | `#f1f5f9` | `#181818` | Input backgrounds |
| `--border` | `#e2e8f0` | `rgba(255,255,255,0.08)` | Borders |
| `--primary` | `#2563eb` | `#3794ff` | Primary actions |
| `--success` | `#059669` | `#4ec9b0` | Success states |
| `--warning` | `#d97706` | `#dcdcaa` | Warning states |
| `--error` | `#e11d48` | `#f44747` | Error states |

### Text Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--text-primary` | `#0f172a` | `#cccccc` | Primary content |
| `--text-secondary` | `#475569` | `#999999` | Secondary/labels |
| `--text-tertiary` | `#64748b` | `#6c6c6c` | Placeholders, hints |
| `--text-disabled` | `#94a3b8` | `#4c4c4c` | Disabled text |

**Utility Classes:**
- `.text-foreground` → `--text-primary`
- `.text-secondary` → `--text-secondary` (replaces `text-muted`)
- `.text-tertiary` → `--text-tertiary` (replaces `text-subtle`)

---

## Typography v3.0

Typography v3.0 implements Material Design 3 standards with 15 semantic typography classes. All text styling uses the typography scale exclusively - no inline text sizing.

### Typography Classes

| Class | Size | Weight | Letter Spacing | Usage |
|-------|------|--------|----------------|-------|
| `text-display-large` | 3.5rem (56px) | 400 | -0.015em | Hero headings |
| `text-display-medium` | 2.8rem (45px) | 400 | 0 | Page titles |
| `text-display-small` | 2.25rem (36px) | 400 | 0 | Section heroes |
| `text-headline-large` | 2rem (32px) | 400 | 0 | Major sections |
| `text-headline-medium` | 1.75rem (28px) | 400 | 0 | Sub-sections |
| `text-headline-small` | 1.5rem (24px) | 400 | 0 | Card titles |
| `text-title-large` | 1.375rem (22px) | 500 | 0 | Dialog titles |
| `text-title-medium` | 1rem (16px) | 500 | 0.015em | Emphasized body |
| `text-title-small` | 0.875rem (14px) | 500 | 0.01em | Table headers, labels |
| `text-body-large` | 1rem (16px) | 400 | 0.031em | Primary body text |
| `text-body-medium` | 0.875rem (14px) | 400 | 0.025em | Standard body text |
| `text-body-small` | 0.75rem (12px) | 400 | 0.04em | Secondary text |
| `text-label-large` | 0.875rem (14px) | 500 | 0.007em | Button labels |
| `text-label-medium` | 0.75rem (12px) | 500 | 0.05em | Form labels, badges |
| `text-label-small` | 0.6875rem (11px) | 500 | 0.05em | Captions, timestamps |

### Usage Examples

```tsx
// Page title
<h1 className="text-headline-medium text-foreground">Purchase Orders</h1>

// Card title
<h2 className="text-headline-small text-foreground">Order Details</h2>

// Body text
<p className="text-body-medium text-secondary">Order description here</p>

// Table header
<th className="text-title-small text-secondary">Quantity</th>

// Button
<button className="text-label-large">Save Changes</button>

// Caption/Helper text
<span className="text-label-small text-tertiary">Last updated 2 mins ago</span>
```

### Typography Migration (from v2)

| Old Class | New Class | Notes |
|-----------|-----------|-------|
| `typo-title` | `text-headline-medium` | Page titles |
| `typo-heading` | `text-headline-small` | Section headings |
| `typo-body` | `text-body-medium` | Standard body text |
| `typo-body-secondary` | `text-body-medium text-secondary` | Secondary text |
| `typo-label` | `text-label-medium` | Form labels |
| `typo-caption` | `text-label-small` | Captions |
| `typo-value` | `text-title-medium` | Stat values |

### Legacy Aliases (Deprecated)

The following legacy classes are deprecated and will be removed in v4:
- `text-muted` → Use `text-secondary`
- `text-subtle` → Use `text-tertiary`
- `text-muted-foreground` → Use `text-secondary` or `text-tertiary`

### Font Family

We use **Google Sans** across the entire application for a clean, consistent, and highly readable interface in both UI and data-heavy views. Google Sans is the sole font family - no other fonts are used.

```css
font-family: "Google Sans", Arial, sans-serif;
```

### Spacing Scale

Based on 4px base unit:

| Token | Value | Pixels |
|-------|-------|--------|
| `--space-1` | 0.25rem | 4px |
| `--space-2` | 0.5rem | 8px |
| `--space-3` | 0.75rem | 12px |
| `--space-4` | 1rem | 16px |
| `--space-6` | 1.5rem | 24px |
| `--space-8` | 2rem | 32px |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 0.25rem (4px) | Small elements |
| `--radius-md` | 0.375rem (6px) | Buttons, inputs |
| `--radius-lg` | 0.5rem (8px) | Cards |
| `--radius-xl` | 0.75rem (12px) | Large cards |
| `--radius-2xl` | 1rem (16px) | Modals |

### Shadows

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 3px 0 rgb(0 0 0 / 0.1)` |
| `--shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1)` |
| `--shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1)` |

---

## Component Library

### Button Component

**Location:** `frontend/components/common/Button.tsx`

**Variants:**
- `primary` - Main actions (bg-primary, white text)
- `secondary` - Alternative actions
- `outline` - Low emphasis (border only)
- `ghost` - Minimal emphasis
- `destructive` - Danger actions (text-error)

**Sizes:**
- `sm` - Small buttons (h-8)
- `md` - Default (h-9)
- `lg` - Large buttons (h-11)
- `compact` - Icon-only buttons (h-7, w-7)

```tsx
import { Button } from "@/components/common";

<Button variant="primary" size="sm">Save</Button>
<Button variant="outline" size="compact" aria-label="Close"><X /></Button>
```

**Standards:**
- Border radius: `rounded-md` (6px)
- Standard height: `h-9` (36px)
- Small height: `h-8` (32px)
- Press effect: `active:scale-[0.98]`
- Text: Always use `text-label-large` (font-medium 14px)

### Card Component

**Standard Pattern:**
```tsx
<div className="bg-surface border border-border rounded-lg overflow-hidden">
  <div className="px-3 py-2 border-b border-border bg-surface-sunken/30">
    <span className="text-label-medium text-secondary uppercase tracking-wider">
      Section Title
    </span>
  </div>
  <div className="p-4">
    {/* Content */}
  </div>
</div>
```

### Input Component

**Standards:**
- Height: `h-8` (32px)
- Border: `border-border`
- Focus: `focus:border-primary focus:ring-2 focus:ring-primary/20`
- Border radius: `rounded-md`
- Label: `text-label-medium`

```tsx
import { Input } from "@/components/common";

<Input 
  type="text"
  placeholder="Enter value"
  className="h-8"
/>
```

### Badge Component

**Variants:**
- `soft` - Subtle background (default)
- `solid` - Filled background
- `outline` - Border only

**Colors:** `primary`, `success`, `warning`, `error`, `secondary`

```tsx
import { Badge } from "@/components/common";

<Badge variant="soft" color="success" size="sm">Active</Badge>
```

---

## Usage Guidelines

### ✅ DO

- Use semantic color tokens (`text-foreground`, `text-secondary`, `text-tertiary`)
- Use typography v3.0 classes (`text-body-medium`, `text-label-large`, etc.)
- Use `font-medium` (500) for labels and buttons
- Use normal weight (400) for content text
- Import components from `@/components/common` (never deep imports)
- Import patterns from `@/components/patterns`
- Import table cells from `@/components/ui/table`
- Use standardized table cell components (CellRef, CellNum, CellDate)
- Add `aria-label` to icon-only buttons
- Use `tabular-nums` for numeric values

### ❌ DON'T

- Don't use arbitrary Tailwind values (`text-[13px]`, `p-[17px]`, `w-[100px]`)
- Don't use hardcoded hex colors
- Don't use legacy color tokens (`text-muted`, `text-subtle`, `text-muted-foreground`)
- Don't skip `aria-label` on icon-only buttons
- Don't use deep imports like `@/components/common/Button`
- Don't use inline text sizing - always use typography classes

### Import Patterns

```tsx
// ✅ CORRECT - Import from common barrel
import { Button, Badge, Input, DataTable } from "@/components/common";

// ✅ CORRECT - Import patterns
import { 
  PageHeader, 
  StatCard, 
  StatCardRow,
  Layout,
  fmtNum,
  fmtCurr,
  fmtDate
} from "@/components/patterns";

// ✅ CORRECT - Import table cells
import { 
  CellRef, 
  CellNum, 
  CellDate, 
  CellCurr,
  CellStatus 
} from "@/components/ui/table";

// ✅ CORRECT - Import from lib/formatters
import { fmtNum, fmtCurr, fmtDate } from "@/lib/formatters";

// ❌ WRONG - Deep imports
import { Button } from "@/components/common/Button";
```

### Table Header Pattern

```tsx
<thead>
  <tr className="bg-surface-sunken/50 border-b border-border">
    <th className="py-2 px-3 text-left text-title-small text-secondary">
      Column Name
    </th>
  </tr>
</thead>
```

### Table Cell Patterns

```tsx
// Reference with link
<td className="py-2 px-3">
  <CellRef value={po_number} href={`/po/${po_number}`} />
</td>

// Number (right-aligned)
<td className="py-2 px-3 text-right">
  <CellNum value={quantity} />
</td>

// Currency
<td className="py-2 px-3 text-right">
  <CellCurr value={amount} />
</td>

// Date
<td className="py-2 px-3">
  <CellDate value={date} />
</td>

// Status badge
<td className="py-2 px-3 text-center">
  <CellStatus value={status} options={statusMaps.po} />
</td>
```

---

## File Structure

```
frontend/
├── app/
│   ├── globals.css              # All design tokens (@theme block)
│   │                           # Typography v3.0 scale defined here
│   └── layout.tsx               # Root layout with providers
├── components/
│   ├── common/                  # Base UI components
│   │   ├── index.ts             # SINGLE EXPORT POINT
│   │   ├── Button.tsx           # Button component
│   │   ├── Card.tsx             # Card component
│   │   ├── Input.tsx            # Input component
│   │   ├── Badge.tsx            # Badge component
│   │   ├── DataTable.tsx        # Data table component
│   │   └── ...                  # Other common components
│   ├── patterns/                # Composite UI patterns
│   │   ├── index.ts             # PageHeader, StatCard, etc.
│   │   ├── detail/              # Detail view components
│   │   ├── page-header.tsx      # Page header component
│   │   ├── stat-card.tsx        # Stat card components
│   │   └── ...                  # Other patterns
│   ├── ui/                      # UI primitives
│   │   └── table/               # Table system
│   │       ├── index.ts         # Barrel export
│   │       ├── cells.tsx        # Cell components
│   │       └── columns.tsx      # Column factories
│   └── modules/                 # Page-specific components
│       ├── po/                  # PO-specific components
│       ├── dc/                  # DC-specific components
│       ├── invoice/             # Invoice-specific components
│       └── srv/                 # SRV-specific components
├── lib/
│   ├── formatters.ts            # fmtNum, fmtCurr, fmtDate
│   └── utils.ts                 # Helper utilities
└── docs/                        # Typography docs (deprecated - to be removed)
```

---

## Browser Support

- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

Requires CSS Custom Properties (variables) support.

---

## Contributing

When adding new components:

1. Use existing design tokens exclusively
2. Follow the typography v3.0 scale (no inline text sizing)
3. Support both light and dark modes
4. Ensure accessibility (keyboard navigation, ARIA labels)
5. Add to the component index exports
6. Use React.memo() for performance on list items
7. Follow font weight standards (normal for content, medium for labels)
8. Run `npm run lint:typography` to validate

---

## Changelog

### v3.0 (February 2026)
- **Typography v3.0**: Implemented 15-class Material Design system
- **Removed legacy aliases**: `text-muted`, `text-subtle`, `text-muted-foreground`
- **Button standards**: Fixed text colors with `!text-white` for colored buttons
- **Centralized components**: LineItemsHeader moved to common
- **Validation**: Added typography linting with `npm run lint:typography`

### v2.0 (Previous)
- Initial Tailwind CSS v4 migration
- CSS-first `@theme` block
- Semantic color tokens
- Component registry pattern
