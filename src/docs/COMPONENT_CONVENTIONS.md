# FlowAI — Component Conventions

**Last updated:** 2026-05-05  
**Status:** Authoritative — all contributors must follow these conventions

---

## 1. Tooltip Naming Convention (Intentional Dual-File)

Two `Tooltip` components exist in `components/ui/` and **both are intentional, permanent, and correct**:

| File | Import path | Type | When to use |
|------|-------------|------|-------------|
| `components/ui/Tooltip.jsx` (capital T) | `@/components/ui/Tooltip` | Custom portal-based tooltip | Anywhere in the main product — sidebar nav, buttons, form labels. Renders via React portal, supports auto-flip, 500ms delay, Escape to dismiss. |
| `components/ui/tooltip.jsx` (lowercase t) | `@/components/ui/tooltip` | Radix UI / shadcn/ui tooltip | Only where Radix UI composition is required — e.g., inside Radix-based popover trees or when a design system override is needed. |

### Rule: match case to intent

```jsx
// ✅ CORRECT — main product UI (sidebar, buttons, labels)
import Tooltip from '@/components/ui/Tooltip';
<Tooltip content="Helpful hint"><button>...</button></Tooltip>

// ✅ CORRECT — Radix/shadcn composition contexts
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ❌ WRONG — mixing cases or using the wrong one for context
import Tooltip from '@/components/ui/tooltip';       // lowercase file, capital import name
import { Tooltip } from '@/components/ui/Tooltip';   // capital file, named import (doesn't exist)
```

### Verified import audit (2026-05-05)

Files using capital `Tooltip` (custom portal):
- `components/layout/Sidebar.jsx` — `import Tooltip from '@/components/ui/Tooltip'` ✅
- `pages/Clearance.jsx` — `import Tooltip from '@/components/ui/Tooltip'` ✅

Files using lowercase `tooltip` (Radix/shadcn):
- Various `components/ui/*` internal components (shadcn compositions) ✅

**No cross-contamination found.** All imports are consistent.

---

## 2. File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Pages | PascalCase | `pages/MainDashboard.jsx` |
| Components | PascalCase | `components/demo/ClearanceSimulator.jsx` |
| shadcn/ui components | lowercase | `components/ui/button.jsx`, `components/ui/input.jsx` |
| Custom UI components | PascalCase | `components/ui/Tooltip.jsx` |
| Lib / utilities | camelCase | `lib/auditLogger.js`, `lib/contentProtection.js` |
| Backend functions | camelCase | `functions/orchestrate.js`, `functions/crawlPage.js` |
| Data files | camelCase | `data/demo/products.json` |
| Docs | SCREAMING_SNAKE | `docs/FLOWAI_ARCHITECTURE.md` |

---

## 3. Component Size Convention

- **Maximum file size:** ~200 lines for components, ~400 lines for pages
- When a page grows beyond ~400 lines: extract logical sections into focused components
- One component per file — no multi-export component files
- Exception: small helper components (< 20 lines) may be co-located with their parent in the same file if they are never reused elsewhere

---

## 4. Import Order Convention

```jsx
// 1. React core
import { useState, useEffect } from 'react';

// 2. React Router
import { useNavigate, Link } from 'react-router-dom';

// 3. Third-party libraries
import { motion } from 'framer-motion';

// 4. Internal lib / SDK
import { base44 } from '@/api/base44Client';

// 5. shadcn/ui components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// 6. Custom UI components
import Tooltip from '@/components/ui/Tooltip';

// 7. Feature components
import ClearanceWizard from '@/components/clearance/ClearanceWizard';

// 8. Icons
import { Zap, Shield } from 'lucide-react';

// 9. Data
import products from '@/data/demo/products.json';
```

---

## 5. Tailwind Convention — No Dynamic Class Construction

Never construct Tailwind class names dynamically from runtime values:

```jsx
// ❌ WRONG — Tailwind cannot scan this
<div className={`bg-${color}-500`} />

// ✅ CORRECT — full class strings, even in maps
const COLOR_MAP = {
  primary: 'bg-primary text-primary-foreground',
  amber:   'bg-amber-500/10 text-amber-400',
  red:     'bg-red-500/10 text-red-400',
};
<div className={COLOR_MAP[color]} />
```

Only add to `safelist` in `tailwind.config.js` when class values come from runtime API responses or entity data the scanner cannot see.

---

## 6. Demo Tier Component Convention

Components shared across demo tiers live in `components/demo/`:

| Component | Used by tiers |
|-----------|--------------|
| `SandboxBanner` | 2, 3, 4 |
| `DemoFooter` | 1, 2, 3, 4 |
| `ClearanceSimulator` | 1, 2, 3 |
| `CostChart` | 1, 2 |
| `OrchestratorDemo` | 1, 2 |

Demo pages do NOT use `AppLayout`. They render their own `<header>` and `<DemoFooter />` directly.

---

## 7. Routes Convention

All routes are defined in `App.jsx` and updated in the same commit as the new page. No page is merged without a corresponding route entry.

**Public routes (no AppLayout):** `/`, `/landing`, `/veuaas`, `/demo`, `/live-demo`, `/enterprise-demo`  
**Authenticated routes (inside AppLayout):** all others

The `LandingPage` at `/` is the FlowAI internal workspace entry — not a marketing page. The marketing page is `VEUaaSMarketing` at `/veuaas`.