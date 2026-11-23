---
name: mes-ui-ux-standards
description: Enterprise MES High-Density Slim Workspace UI/UX Standards (Option A) — Prevents tab bloat, excessive vertical headers, cluttered multi-button toolbars, and buried mobile field-worker workflows.
---

# MES UI/UX Standards: Slim Workspace & Direct Route Architecture

Apply these rules whenever designing, refactoring, or auditing ANY module in `Toolbox/src/modules/*` or `page/*`.

## 1. Anti-Tab-Bloat & Route Splitting (1 Module = Dedicated Routes)
- **Maximum 2–3 closely coupled tabs per page.** Keep tightly linked workflows in the same workspace (e.g., `/manpower` = `Overview` + `Daily Attendance` + `Employee Master` with in-page quick shortcuts; `/manpower/grading` = `Grading 4D` + `Grading Trends` + `Skill Matrix`), rather than cramming 6–8 unrelated pages or splitting inseparable workflows.
- Move Admin-only plant-wide calendars/config into `SYSTEM ADMIN` (`/system-settings?tab=holidays`), and group management/workforce evaluation modules logically under `MANAGEMENT` (`/manpower`, `/manpower/grading`, `/audit-5s`) — NEVER leave 5S or HR workflows stranded under unrelated sections such as Quality/Maintenance.
- **Role-Focused Field Entry**: Field workers, inspectors, technicians, and committee auditors (e.g. `/pe/tech`, `/audit-5s`, `/scan-barcode`) MUST have a dedicated, clutter-free direct route without Admin tabs or unrelated settings.

## 2. Vertical Chrome Budget & Single-Row Slim Toolbar
- Keep header chrome compact so **at least 70–80% of the 1080p desktop viewport** is usable data (table, calendar, board, or chart) above the fold.
- **Ban Redundant Stacked Bars**: Do NOT stack `Hero Title Banner (with 2-line subtitle)` + `Page Filter Bar` + `Tab Strip` + `Sub-Module Action Bar (10+ flat buttons)` + `Extra Summary Strip`.
- **Single-Row Slim Toolbar**: Merge the compact module title/breadcrumb, primary filters (`Date`, `Group`, `Line`, `Search`), and primary actions into ONE clean toolbar row (`bg-white dark:bg-slate-800 rounded-xl border px-3.5 py-2`), allowing natural responsive wrap on `375px` mobile.
- **Group Secondary Actions into Menus**:
  - Group >2 configuration modals (Weightage, Criteria, Rules, Formula Guide, Committee Setup) into a single **`ตั้งค่า ⚙ ▾`** dropdown menu.
  - Group export formats (Excel, CSV, Print/PDF) into a single **`ส่งออก ▾`** dropdown button.
  - Place bulk page Save actions in a clear **Floating Action Button (FAB)** at bottom-right **offset to `right-24 sm:right-24 bottom-20 sm:bottom-6`** so it NEVER overlaps the Global AI Copilot button (`right-4 sm:right-6`).

## 3. Data Tables, KPIs & Honest Loading States
- **Honest Loading States**: When `loading === true` and `rows.length === 0`, NEVER render empty-data text such as `"ไม่พบข้อมูล (0 คน)"`. Render an explicit loading row/skeleton (`กำลังโหลดและประมวลผลข้อมูล...`) so users never mistake an active fetch for empty data.
- **Interactive KPI Cards**: Summary KPI cards on operational/executive pages should act as quick drilldowns (click to filter or open the matching employee/item detail modal) and include Eye visibility toggles for confidential THB cost/wage metrics.
- **Sortable Sticky Tables**: Data tables of >=20 rows MUST support click-to-sort column headers and sticky `<thead>` inside responsive scrollable containers.
- **No Unbounded Selectors / Legacy Parity Check**: When porting a legacy `/page/<module>/` screen into `Toolbox`, verify 1:1 parity for manual fetch/sync date range pickers, Soft vs Hard reset options, profile drilldowns, and export formats (CSV/XLSX/PDF) before removing legacy links.

## 4. Responsive & Industrial Touch Ergonomics
- Maintain `min-h-[44px]` touch targets on primary buttons, inputs, and mobile audit controls (`375px` mobile baseline).
- Use formal industrial Thai/English labels throughout; keep dark-mode utility classes consistent (`dark:bg-slate-800`, `dark:border-slate-700`, `dark:text-white`).
- When a shared UI pattern is updated, apply it consistently and document module route/UX changes in `Toolbox/ARCHITECTURE.md`.
