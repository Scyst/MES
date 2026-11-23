# UI Redesign & Visual Taste Playbook

Use this playbook when redesigning an existing screen, building a new view, or translating a reference screenshot into the project's design system.

---

## 1. The 6-Step Job Walk (Diagnose Before Designing)

Before moving or styling anything, write the screen's **Job** in one sentence:
> *"Who arrives, what they came to do, and what 'done' looks like."* (e.g., *"A maintenance supervisor filtering stock ledger transactions by MAINTENANCE warehouse and exporting an Excel report."*)

Walk the screen as that person through 6 checks. Every failure is a candidate fix:
1. **The path leads:** The eye lands immediately on step 1, one primary button finishes the job, and no secondary control outranks it.
2. **Decision info sits beside its control:** Filters, counts, and unit labels sit directly next to the input or table they govern, not hidden a scroll or modal tap away.
3. **Nothing the job needs is missing:** Required filters, date ranges, export actions, and drilldowns are reachable.
4. **Every label and value is true:** A total equals the sum of its rows; a metric shown in two places shows the exact same number; an icon-only button uses a universally understood icon (`×`, `⚙`, `🔍`) with a `title` tooltip.
5. **Every state is honest:**
   - **Loading:** Render a skeleton or `"กำลังโหลดและประมวลผลข้อมูล..."`. Never flash `"ไม่พบข้อมูล (0 รายการ)"` while `loading === true`.
   - **Empty:** State clearly why no rows matched (e.g., `"ไม่พบรายการเคลื่อนไหวในช่วงวันที่และตัวกรองที่เลือก"`) with a quick way to reset filters.
   - **Error:** Show the structured error message and a retry action without crashing the page.
   - **Narrow Viewport (`375px`):** Controls wrap cleanly without horizontal page overflow; touch targets are at least `44x44px`.
6. **Platform minimums hold:** Text contrast, readable font sizes (`>= 12px` for badges/captions, `>= 14px` for body/inputs), and sticky table headers (`sticky top-0`) on scrollable grids.

---

## 2. Freeze the Baseline (The Preserve List)

When redesigning an existing screen or applying ideas from a reference screenshot:
1. **Take the reference's structure, never its brand:** Borrow *where* things sit and *how* the workflow is grouped, but build it strictly with the project's own Tailwind tokens, components, and Thai/English industrial terminology.
2. **Preserve working functionality:** Never drop an existing filter, export option, keyboard shortcut, or data column unless the user explicitly asked to remove it.
3. **Stay inside the target boundary:** If asked to redesign a modal or a single tab, do not alter the global navbar, theme tokens, or sibling tabs.

---

## 3. Seven Rules of Visual Taste

Left unchecked, AI defaults to the same habits on every screen: a purple gradient, a pill badge on every word, an icon beside every label, a subtitle restating the title, and a card around everything. Follow these 7 rules instead:

1. **Change the least that solves the problem:** Rearrange before you restyle. If moving a filter bar into the header fixes the layout, keep the existing button and input styles intact.
2. **Copy the nearest sibling:** A new control must copy the exact height (`h-9` or `h-10`), border radius (`rounded-lg` or `rounded-xl`), border color (`border-slate-200 dark:border-slate-700`), font weight, and padding of the closest existing control doing a similar job.
3. **One thing leads:** Giving every card a bold border, shadow, and accent color makes nothing stand out. Use one primary accent button per view; keep supporting containers flat and quiet.
4. **Group by proximity, not boxes-inside-boxes:** The gap inside a related group (`gap-2`) must be smaller than the gap between separate groups (`gap-4` or `gap-6`). Prefer whitespace or a single subtle border over 3 levels of nested cards.
5. **Align to existing grid lines:** Every new element must snap to an existing left/top alignment edge and spacing scale.
6. **The same job looks the same:** Two elements doing the same job (e.g., status badges or KPI cards) share one consistent visual pattern across the module.
7. **Cut decorative stock details:** Never add unrequested avatars, decorative sparklines, fake percentage trend badges (`+12.5%`), or subtitles that repeat the heading.
