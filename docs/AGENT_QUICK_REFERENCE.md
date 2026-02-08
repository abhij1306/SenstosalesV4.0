# Agent Quick Reference Card
## SenstoSales ERP - Development Guide

**Version**: 4.4.0  
**Last Updated**: 2026-02-07

---

## 🚀 START HERE

### Before You Begin
```bash
cd frontend
npm ci
npm run dev
```

### When You Finish
```bash
npm run build  # MUST PASS
cd backend
pytest tests/ -v  # SHOULD PASS
```

---

## 📋 TOKEN REFERENCE

### Typography
```
Labels/Headers:  typo-label  (text-xs uppercase tracking-wider text-secondary)
Content:         typo-body   (text-sm text-foreground)
Page Title:      typo-title  (text-2xl font-semibold tracking-tight)
Buttons:         text-sm font-medium
Table Headers:   typo-table-header
Table Cells:     text-sm tabular-nums
```

### Colors (Semantic)
```
Primary text:    text-foreground  (--text-primary)
Secondary:       text-secondary   (--text-secondary)
Tertiary:        text-tertiary    (--text-tertiary)
Success:         text-success
Warning:         text-warning
Error:           text-error
```

### Spacing & Sizing
```
Container:       max-w-container (1600px)
Page gutter:     px-container (1.5rem)
Section gap:     gap-2 (8px via Layout.colGap)
Card padding:    p-3
Table cell:      py-2 px-3
Button height:   h-size-sm (32px), h-size-md (40px)
Input height:    h-size-sm (32px)
Input widths:    w-input-xs (128px), w-input-sm (192px), w-input-md (256px)
```

---

## 🧩 COMPONENT PATTERNS

### Import Standards
```tsx
// ✅ CORRECT - Single entry points
import { Button, Input, DataTable } from "@/components/common";
import { PageHeader, StatCard, StatCardRow } from "@/components/patterns";
import { CellNum, CellDate, CellStatus } from "@/components/ui/table";
import { fmtNum, fmtCurr, fmtDate } from "@/lib/formatters";

// ❌ WRONG - Deep imports
import { Button } from "@/components/common/Button";
```

### Page Header
```tsx
<PageHeader
  title="Page Title"
  subtitle="Description"
  onBack={() => router.back()}
  action={<ButtonGroup />}
/>
```

### Stat Card
```tsx
<StatCardRow>
  <StatCard
    title="Label"
    value={fmtNum(value)}
    icon={<HugeiconsIcon icon={IconName} className="w-size-icon h-size-icon" />}
    color="primary"
    onClick={() => handleFilter()}  // Optional: makes it clickable
    isActive={isFilterActive}        // Optional: shows active state
  />
</StatCardRow>
```

### Card Container
```tsx
<div className="bg-surface border border-border rounded-lg overflow-hidden">
  <div className="px-3 py-2 border-b border-border bg-surface-sunken/30">
    <span className="typo-label">Section Title</span>
  </div>
  <div className="p-4">
    {/* Content */}
  </div>
</div>
```

### Table
```tsx
<table className="w-full border-collapse">
  <thead>
    <tr className="bg-surface-sunken/50 border-b border-border">
      <th className="py-2 px-3 text-left typo-table-header">Column</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-border/40 hover:bg-surface-sunken/30">
      <td className="py-2 px-3 typo-body">{value}</td>
    </tr>
  </tbody>
</table>
```

### Info Grid
```tsx
<InfoGrid columns={4}>
  <InfoItem label="Field Label" value={fieldValue} />
</InfoGrid>
```

---

## ⚡ PERFORMANCE RULES

### DO
- Use `React.memo()` for list items
- Use `useMemo()` for columns/data
- Use `useCallback()` for event handlers
- Import from barrel exports (`@/components/patterns`)
- Use design tokens (`h-size-sm`, `w-input-md`, `typo-label`)

### DON'T
- Use hardcoded pixel values (`w-48`, `h-8`)
- Use legacy color names (`text-muted`, `text-subtle`)
- Create inline objects in render
- Use anonymous functions in render
- Deep import from component files

---

## ♿ ACCESSIBILITY CHECKLIST

- [ ] All icon-only buttons have `aria-label`
- [ ] All images have `alt` text
- [ ] Form inputs have associated labels
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators are visible
- [ ] Keyboard navigation works

---

## 🐛 COMMON ISSUES

### Issue: Token not working
**Cause:** Using old hardcoded values  
**Fix:** Use `h-size-sm` instead of `h-8`, `w-input-sm` instead of `w-48`

### Issue: Import error
**Cause:** Deep import from component file  
**Fix:** Import from `@/components/patterns` or `@/components/ui/table`

### Issue: Font weight looks wrong
**Cause:** Using `font-medium` on content  
**Fix:** Content should be normal weight (400), labels use `font-semibold` (600)

### Issue: Color looks different
**Cause:** Using `text-muted` or `text-subtle`  
**Fix:** Use `text-secondary` or `text-tertiary`

---

## 📁 FILE STRUCTURE

```
frontend/
├── app/                    # Next.js pages
│   ├── globals.css         # Design tokens
│   ├── layout.tsx
│   ├── page.tsx            # Dashboard
│   ├── po/                 # Purchase Orders
│   ├── dc/                 # Delivery Challans
│   ├── invoice/            # Invoices
│   ├── srv/                # Store Receipt Vouchers
│   ├── delivery-tracker/   # Delivery tracking
│   └── procurement/        # Procurement intelligence
├── components/
│   ├── common/             # Base components (Button, Input, etc.)
│   │   └── index.ts        # Export barrel
│   ├── patterns/           # Composite patterns (NEW)
│   │   ├── index.ts        # PageHeader, StatCard, etc.
│   │   ├── detail/         # Detail view components
│   │   └── ...
│   ├── ui/                 # UI primitives (NEW)
│   │   └── table/          # Table cells, columns
│   └── modules/            # Page-specific components
│       ├── po/
│       ├── dc/
│       └── ...
├── lib/
│   ├── formatters.ts       # fmtNum, fmtCurr, fmtDate
│   └── utils.ts            # Helper utilities
├── store/                  # Zustand stores
├── hooks/                  # Custom React hooks
└── docs/
    ├── DESIGN_SYSTEM.md    # Full design system docs
    ├── AGENT_QUICK_REFERENCE.md  # This file
    └── TODO.md             # Remaining work
```

---

## 🔗 USEFUL LINKS

- Main Guide: `AGENTS.md` (project root)
- Design System: `docs/DESIGN_SYSTEM.md`
- Remaining Work: `docs/TODO.md`
- Database Schema: `docs/DATABASE_SCHEMA.md`
- Business Logic: `docs/BUSINESS_LOGIC_SPEC.md`

---

## 📞 ESCALATION

Stuck for >30 minutes?
1. Check this reference card
2. Check `AGENTS.md` for detailed instructions
3. Check `docs/TODO.md` for known issues
4. Review similar components in `components/patterns/`

---

**Remember:** Consistency > Perfection. Follow the patterns, use the tokens, and ask when unsure.
