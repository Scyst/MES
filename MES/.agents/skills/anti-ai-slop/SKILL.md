---
name: anti-ai-slop
description: Eliminates AI Slop across 3 dimensions — UI/Frontend Design (frontend-design), Code Engineering (karpathy-guidelines), and Thai/English Prose (humanizer). Activate whenever building or redesigning UI components, writing or refactoring code, or drafting documentation, reports, and user-facing copy.
---

# Anti-AI Slop Guardrails (UI · Code · Writing)

Apply these three pillars to eliminate machine-generated clichés, bloated abstractions, and filler prose.

---

## Pillar 1: Anti-UI & Frontend Slop (`frontend-design`)

Prevent generic "AI-generated template" aesthetics when creating or modifying web pages, dashboards, and components:

1. **Ban AI Visual Clichés:**
   - Do **not** default to neon purple/indigo gradients (`from-indigo-500 to-purple-600`) or glowing rainbow borders unless explicitly part of an AI Copilot badge.
   - Do **not** scatter `Sparkles` (✨), `Rocket` (🚀), or decorative icons on standard CRUD buttons and section headers.
   - Do **not** wrap every element in heavy nested cards (`rounded-3xl shadow-2xl backdrop-blur-xl`) or meaningless Bento grids that waste screen real estate.
2. **Information Density & Viewport Discipline:**
   - Keep header chrome compact so **70–80% of the viewport** displays actionable data above the fold.
   - Never stack redundant bars (`Hero Banner` + `Subtitle` + `Filter Strip` + `Tab Bar` + `10-Button Action Row`). Merge title, primary filters, and primary actions into a single slim toolbar; group secondary actions into `ตั้งค่า ⚙ ▾` or `ส่งออก ▾` menus.
3. **Typography, Alignment & Honest States:**
   - Use `tabular-nums` (`font-mono` or `tabular-nums`) for financial figures, quantities, timestamps, and KPIs so columns align vertically.
   - Establish hierarchy through font weight, size contrast, and whitespace rhythm rather than loud background colors.
   - **Honest Loading & Empty States:** Never display `"ไม่พบข้อมูล (0 รายการ)"` while a fetch is still in flight; render an explicit skeleton or loading state until data resolves.
   - Respect the project's existing design tokens, dark-mode classes (`dark:bg-slate-800`, `dark:border-slate-700`), and `44x44px` minimum mobile touch targets (`375px` baseline).

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

## Pillar 3: Anti-Writing & Prose Slop (`humanizer`)

Write like a senior engineer or designer speaking directly to a teammate (Thai & English):

1. **Answer-First (No Chatbot Ceremony):**
   - Lead with the conclusion, root cause, or result in the first sentence.
   - Strip theatrical openers (*"แน่นอนครับ! นี่คือคำถามที่ยอดเยี่ยมมาก..."*, *"Great question! Let's delve into..."*) and hollow sign-offs (*"หวังว่าข้อมูลนี้จะเป็นประโยชน์ไม่มากก็น้อย"*, *"I hope this helps!"*).
2. **Ban AI Buzzwords & Marketing Puffery:**
   - **Thai Tells to Remove:** *"ยกระดับอย่างก้าวกระโดด"*, *"ไร้รอยต่อ (Seamless)"*, *"ตอกย้ำความสำคัญ"*, *"ทรงพลัง"*, *"มิติใหม่"*, *"อย่างแท้จริง"*, *"ครบวงจรอย่างสมบูรณ์แบบ"*
   - **English Tells to Remove:** *delve, seamless, cutting-edge, testament, tapestry, pivotal, underscore, foster, game-changer, robust, sleek, intuitive, user-centric, landscape, vital*
3. **Concrete Facts Over Vague Abstractions:**
   - Name the exact file, function, SQL column, button label, or pixel/token metric instead of vague praise.
   - ❌ *"ปรับปรุงโครงสร้างหน้าจอเพื่อยกระดับประสบการณ์ผู้ใช้ให้ดียิ่งขึ้น"*
   - ✅ *"ยุบแถบตัวกรองและปุ่ม Export รวมเข้ากับ Toolbar แถวเดียว ช่วยประหยัดพื้นที่แนวตั้ง 64px"*
4. **Say Each Fact Once (No Summary Echo):**
   - One point per bullet or sentence. Never append a closing paragraph that simply repeats the bullets above (`"โดยสรุปแล้ว การแก้ไขข้างต้นจะช่วยให้..."` / `"In short, these changes ensure..."`).
   - Never invent unverified numbers, percentages, or behavioral outcomes. State unconfirmed items plainly as `"ยังไม่ยืนยัน:"` / `"Not confirmed:"`.
