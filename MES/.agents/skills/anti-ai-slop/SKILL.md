---
name: anti-ai-slop
description: Eliminates AI Slop across 3 dimensions — UI/Frontend Design & Screen Redesign (frontend-design + taste), Code Engineering (karpathy-guidelines), and Thai/English Prose (humanizer + plain-writing). Activate whenever building, redesigning, or restyling UI screens/components, writing or refactoring code, or drafting documentation, reports, and user-facing copy.
---

# Anti-AI Slop Guardrails (UI Redesign · Code · Writing)

Apply these three pillars to eliminate machine-generated clichés, bloated abstractions, and filler prose.

---

## Pillar 1: Anti-UI & Screen Redesign Slop (`frontend-design` + `taste`)

When building a new screen or redesigning an existing one (from code, a screenshot, or a reference image), enforce real-product design discipline:

### A. Screen Redesign Workflow (No Paywall / Works with Any Reference)
1. **Walk the Job First (6 Checks):** Define in one line who arrives, what they came to do, and what "done" looks like. Check the screen against:
   - *The path leads:* The eye lands on step 1, one primary control finishes the job, and nothing off-path competes.
   - *Decision info sits beside the control:* Never hide critical context a scroll or modal tap away.
   - *Every label and value is true:* Values shown twice match; totals match their line items.
   - *Honest states:* Loading, empty, error, disabled, and narrow mobile (`375px`) states let the job finish or state clearly why not. Never display `"ไม่พบข้อมูล (0 รายการ)"` while a fetch is still loading.
2. **Freeze the Baseline (Preserve List):** Keep the domain, existing design system/tokens, dark-mode classes (`dark:bg-slate-800`, `dark:border-slate-700`), working features, and everything outside the target component untouched. When the user provides a reference image, take its **structural layout decision**, never its brand colors, fonts, or copy.
3. **Rearrange Before You Restyle:** Fix workflow bottlenecks by moving or grouping controls before inventing new visual styles.

### B. Visual Taste & Dealbreakers (Ban AI Visual Clichés)
1. **Don't Add for the Sake of Adding:** Empty space is not a problem. Add no decorative icon, pill badge, divider, shadow, hover-lift, or background panel unless it solves a specific usability problem.
2. **Don't Add Text the Job Doesn't Need:** No subtitle that merely restates the heading, no helper text under a self-explanatory control.
3. **Ban Generic AI Gradients & Sparkles:** Do **not** use neon purple/indigo gradients (`from-indigo-500 to-purple-600`) or scatter `Sparkles` (✨) / `Rocket` (🚀) icons on standard buttons and headers. Use gradients only where an existing design token already does; otherwise use the flat color role of the nearest sibling.
4. **Copy the Nearest Sibling:** Any new or modified element must copy the component, size, font weight, color role, and spacing of the closest existing element doing a similar job on the screen. If a reader can tell which part was added by AI just by how it looks, this rule was broken.
5. **One Thing Leads & Existing Grid Lines Hold:** A new element never outranks the primary action of the screen and must align to existing edges and spacing steps.
6. **High-Density Viewport & Tabular Numbers:** Keep header chrome compact so **70–80% of the viewport** shows actionable data above the fold (merge title, filters, and primary actions into one slim toolbar; group secondary modals into `ตั้งค่า ⚙ ▾` and exports into `ส่งออก ▾`). Always use `tabular-nums` (`font-mono` or `tabular-nums`) for quantities, currency, timestamps, and KPIs.

---

## Pillar 2: Anti-Code Slop (`karpathy-guidelines`)

Enforce disciplined, minimal, high-signal software engineering:

1. **Surgical Scope (Touch Only What Was Asked):**
   - Do not refactor adjacent functions, rename public symbols, reorder imports, or reformat untouched lines outside the task scope.
   - Never invent unrequested features, extra configuration flags, or speculative "future-proof" hooks.
2. **No Premature Abstraction (Simplicity First):**
   - Do not create a helper function, custom hook, or wrapper class for logic used only once. Three clear lines of inline code beat a premature abstraction.
   - If 50 lines can be written cleanly in 15 lines without losing readability, write 15 lines.
3. **No Silent Fallbacks or Swallowed Errors:**
   - Never write empty catch blocks (`catch (e) {}`) or silently mask backend/SQL failures with fake fallback data (`|| 0`, `|| []`, or mock objects) unless explicitly required for offline resilience.
   - Validate inputs at system boundaries, roll back failed transactions, and surface structured error messages (`{"success": false, "data": null, "message": "..."}`).
4. **Zero Noise Comments & Dead Code:**
   - Never write comments that merely restate the code (`// Increment counter`, `// Fetch data from API`). Comment only **why** a non-obvious constraint or business formula exists.
   - Delete unused variables, dead imports, and commented-out code blocks immediately; rely on Git history rather than code graveyards. Do not leave `// TODO` comments.

---

## Pillar 3: Anti-Writing & Prose Slop (`humanizer` + `plain-writing`)

Write like a senior engineer or designer leaving clear notes for a teammate (Thai & English):

1. **Answer-First & Zero Chatbot Ceremony:**
   - Lead with the answer, root cause, or result in the first sentence.
   - Strip theatrical openers (*"แน่นอนครับ! นี่คือคำถามที่ยอดเยี่ยมมาก..."*, *"Great question! Let's delve into..."*) and hollow sign-offs (*"หวังว่าข้อมูลนี้จะเป็นประโยชน์ไม่มากก็น้อย"*, *"I hope this helps!"*).
2. **Ban AI Buzzwords, Puffery & Vague Authorities:**
   - **Thai Tells to Remove:** *"ยกระดับอย่างก้าวกระโดด"*, *"ไร้รอยต่อ (Seamless)"*, *"ตอกย้ำความสำคัญ"*, *"ทรงพลัง"*, *"มิติใหม่"*, *"อย่างแท้จริง"*, *"ครบวงจรอย่างสมบูรณ์แบบ"*
   - **English Tells to Remove:** *delve, seamless, cutting-edge, testament, tapestry, pivotal, underscore, foster, game-changer, robust, sleek, intuitive, frictionless, cohesive, user-centric, landscape, vital*
   - **No Vague Authorities:** Never write *"research shows"*, *"industry standard"*, or *"most leading apps"* without naming the exact source or file.
   - **Avoid Em-Dash Abuse in Prose:** Do not pepper prose sentences with `—` clauses (a primary tell of LLM writing); use plain periods, commas, or parentheses instead.
3. **Concrete Facts Over Abstractions:**
   - Name the exact part on screen, file path, function, SQL column, or pixel/token metric instead of describing a feeling.
   - ❌ *"ปรับปรุงโครงสร้างหน้าจอเพื่อยกระดับประสบการณ์ผู้ใช้และสร้าง Visual Hierarchy ที่ดีขึ้น"*
   - ✅ *"ย้ายตัวกรองวันที่ขึ้นไปรวมกับ Toolbar ด้านบน ช่วยลดความสูง Header ลง 64px"*
4. **Say Each Fact Once (No Rule-of-Three Padding or Summary Echo):**
   - One sentence per point. Never pad lists to groups of three just for rhythm, and never append a closing paragraph that repeats the bullets above (`"โดยสรุปแล้ว..."` / `"In short..."`).
   - Invent nothing: never guess unverified numbers, percentages, or behavioral outcomes. State unconfirmed items plainly as `"ยังไม่ยืนยัน:"` / `"Not confirmed:"`.
