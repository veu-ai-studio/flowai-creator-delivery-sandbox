# FlowAI — Sprint UX-B: Readability and Navigation Standards

**STATUS:** 📋 Queued — submit after Sprint UX-A is verified  
**PLATFORM:** FlowAI (truthful-flow-logic-lab.base44.app)  
**DATE QUEUED:** 2026-05-02  

---

## PURPOSE

Establish and apply consistent readability and navigation standards across the entire FlowAI platform and extend these standards to every product FlowAI processes through its Capability Transfer engine.

---

## CRITICAL GUARDRAIL

All existing functionality preserved completely. This sprint touches visual presentation and navigation structure only — no business logic, no entity changes, no LLM prompt changes. Read all existing layout and page files before writing any code.

---

## COMPONENT 1 — TYPOGRAPHY STANDARDS

Apply consistent typography across every page in FlowAI:

**Heading hierarchy:**
- Page titles (H1): 24px, font-weight 600, color: white
- Section headers (H2): 18px, font-weight 600, color: white
- Card titles (H3): 15px, font-weight 500, color: white
- Labels and field names: 13px, font-weight 500, color: muted gray
- Body text and descriptions: 13px, font-weight 400, color: light gray
- Helper text and captions: 12px, font-weight 400, color: muted gray
- Code and technical values: 12px, monospace font, color: blue accent

**Line height:**
- All body text: 1.6 line height minimum — never compressed
- All headings: 1.3 line height

**Contrast:**
- All text must meet WCAG AA contrast ratio minimum — 4.5:1 for body text, 3:1 for large text
- No light gray text on dark gray background that blends together
- Status text (success, warning, error) must be distinctly colored — never rely on color alone, always include an icon

Apply these standards to every page, card, modal, tooltip, and status message across the entire platform.

---

## COMPONENT 2 — INFORMATION DENSITY STANDARDS

**Problem:** Several pages in FlowAI present too much information at once — the Activity Log, Governance Timeline, and Run History are dense and hard to scan.

**Cards:**
- Every card must have clear visual hierarchy — title prominent, secondary info smaller
- Minimum 16px padding inside every card
- Clear separation between cards — minimum 12px gap
- No card should contain more than 5 data points without an expand/collapse option

**Tables and lists:**
- Every table row: minimum 44px height for comfortable clicking
- Alternating row shading for tables with more than 5 rows
- Column headers always sticky when table scrolls
- Maximum 6 columns visible by default — additional columns accessible via column picker

**Long content:**
- Any text content longer than 3 lines gets truncated with "Show more" expand
- Any list longer than 5 items gets "Show all" pagination
- Any page taller than 3 screen heights gets a floating "Back to top" button

---

## COMPONENT 3 — NAVIGATION STANDARDS

**Primary navigation — Sidebar:**
- Active page: highlighted with accent color background, white text, left border indicator
- Hover state: subtle background highlight, cursor pointer
- Collapsed sections: show section icon and name only, expand on click
- Expanded sections: show all items with 8px indent
- Section labels: uppercase, 11px, letter-spacing 0.08em, muted color
- Scroll behavior: sidebar scrolls independently from main content
- Current section: automatically expands when user navigates to a page within it

**Breadcrumb navigation:**
Add a breadcrumb bar below the page title on every page:
- Home → PRODUCTION → Clearance → SAIGE Clearance Wizard
- Home → OPERATE → Autonomous Engine → Active Session
- Home → CREATE → Creator Studio → Describe and Build

Breadcrumb items are clickable — clicking any level navigates there directly.

**Back button behavior:**
Define logical parent pages for every page:
- Any wizard step → wizard start page
- Any product detail → portfolio or clearance list
- Any session detail → Autonomous Engine
- Any audit result → QA/Audit page

**Page-level navigation (sticky in-page nav):**
- Governance Dashboard: Active Queue | Timeline | System Health | Self-Test History | Audit History | Cap. Transfers | Settings
- Clearance Wizard: Step 1 | Step 2 | Step 3 | Step 4 | Step 5 | Step 6
- Creator Studio: Mode Selection | Form | Results

---

## COMPONENT 4 — STATUS AND FEEDBACK STANDARDS

**Loading states:**
- Every button that triggers an LLM call or database operation shows a loading spinner immediately on click
- Loading spinner replaces button text — not added alongside it
- Loading message updates to show progress: "Analyzing..." → "Generating..." → "Saving..." → "Done"
- Never show a blank screen while loading — always show a skeleton placeholder

**Success states:**
- Every successful action shows a green success message for 3 seconds then auto-dismisses
- Success message appears at the top of the relevant card — not as a browser alert
- Format: "✅ [Action] completed successfully"

**Error states:**
- Every error shows a red error message that does not auto-dismiss — requires user acknowledgment
- Error message includes: what went wrong (plain English), what to do next, and a retry button where applicable
- Format: "❌ [Action] failed — [plain English reason]. [Suggested next step]"

**Empty states:**
- Every empty state shows: a relevant icon, plain English explanation, clear call to action button
- Never show a blank white space

---

## COMPONENT 5 — MOBILE AND RESPONSIVE STANDARDS

**Breakpoints:**
- Desktop: 1200px and above — full sidebar, full content
- Tablet: 768px-1199px — collapsed sidebar with icon-only mode, full content
- Mobile: below 768px — hidden sidebar with hamburger menu, stacked content

**Touch targets:**
- Every clickable element minimum 44px height and 44px width on mobile
- Minimum 8px gap between touch targets

**Sidebar on tablet/mobile:**
- Collapses to icon-only mode showing section icons
- Overlay mode on mobile — sidebar overlays content rather than pushing it

---

## COMPONENT 6 — CAPABILITY TRANSFER — READABILITY STANDARDS

Add a new transferable capability to the Capability Transfer selector:

**☐ Readability and Navigation Standards**  
When selected, the generated Capability Transfer sprint includes:
- Typography hierarchy matching FlowAI standards
- Consistent card padding and information density
- Breadcrumb navigation
- Loading, success, and error state standards
- Mobile responsive breakpoints

---

## ACCEPTANCE CRITERIA

1. All page titles are 24px font-weight 600 across every page
2. All body text is minimum 13px with 1.6 line height
3. All text meets WCAG AA contrast ratio
4. All cards have minimum 16px padding and clear visual hierarchy
5. All table rows are minimum 44px height
6. Breadcrumb navigation appears on every page showing correct path
7. Breadcrumb items are clickable and navigate correctly
8. Back button navigates to logical parent page on every page
9. Active sidebar item shows accent color highlight and left border
10. Current section auto-expands when user navigates to a page within it
11. In-page navigation appears on Governance Dashboard, Clearance Wizard, and Creator Studio
12. Every button shows loading spinner immediately on click during LLM or database operations
13. Success messages appear for 3 seconds and auto-dismiss
14. Error messages do not auto-dismiss and include retry button
15. Every empty state shows icon, explanation, and call to action
16. Sidebar collapses to icon-only mode on tablet screens
17. All touch targets are minimum 44px on mobile
18. Readability and Navigation Standards appears as transferable capability in Capability Transfer selector
19. Generated Capability Transfer sprint correctly includes readability standards when selected
20. All existing functionality works with zero regression
21. Bundle hash changes confirming deployment
22. All changes consistent with existing FlowAI dark theme

---

## WHAT NOT TO CHANGE

All existing business logic, LLM calls, entity schemas, governance features, sprint generation, audit engines, clearance protocol, creator studio, marketplace, production bridge, GTM features. Visual and navigation layer only.

---

## SPRINT QUEUE

| Sprint | Description | Status |
|---|---|---|
| Sprint 5-10 | Core platform | ✅ Complete |
| Sprint UX-A | Zero-typing, AI Assistant, Tooltips | 🔄 In progress |
| Sprint UX-B | Readability and Navigation | 📋 Queued — this document |
| Examination | FlowAI comprehensive validation | 📋 After UX-B verified |
| SAIGE Clearance | First product through clearance | 📋 After examination passes |
| PressAI Clearance | Second product through clearance | 📋 In parallel with SAIGE |