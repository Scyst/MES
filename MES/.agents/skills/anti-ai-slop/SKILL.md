---
name: anti-ai-slop
description: Eliminates AI Slop and enforces production quality across 4 pillars — UI/Screen Redesign (Mobbin taste), Modern Web Platform & INP Performance (Google Modern Web Guidance), Clean Code & Static Analysis (Karpathy + SonarQube + oxlint), and Plain Human Writing (Humanizer). Activate whenever designing/refactoring UI, writing JS/React/PHP/SQL code, optimizing performance, or drafting reports and user-facing copy.
---

# Anti-AI Slop & Production Craft Guardrails (4 Pillars)

Apply these four pillars to prevent machine-generated clichés, legacy web bloat, over-engineered code, and robotic prose. Load the linked `references/*.md` playbook whenever a task dives deep into that domain.

---

## Pillar 1: UI Redesign & Visual Taste (Anti-UI Slop)
*Deep-dive playbook:* [references/ui-redesign-and-taste.md](./references/ui-redesign-and-taste.md)

1. **6-Step Job Walk & Freeze Baseline:**
   - Before changing a screen, define the user's job in one line (who arrives, what they do, what "done" looks like).
   - **Preserve List:** Keep the domain, existing design system/tokens, dark-mode classes (`dark:bg-slate-800`, `dark:border-slate-700`), working features, and everything outside the target region untouched. When given a reference screenshot, take its **structural layout decision**, never its brand palette, font, or copy.
   - **Rearrange Before You Restyle:** Fix workflow bottlenecks by moving or grouping controls before inventing new visual treatments.
2. **Visual Taste & Dealbreakers:**
   - **Don't Add for the Sake of Adding:** Empty space is not a flaw. Add no decorative icon, pill badge, divider, hover-lift, or card wrapper unless it solves a named usability problem.
   - **Ban Generic AI Clichés:** Never default to neon purple/indigo gradients (`from-indigo-500 to-purple-600`), glowing borders, or `Sparkles` (✨) / `Rocket` (🚀) icons on standard buttons and headers.
   - **Copy the Nearest Sibling:** Every new element must match the component, size, weight, color role, and spacing step of its closest sibling doing a similar job.
   - **High-Density Viewport & Tabular Numbers:** Reserve **70–80% of the viewport** for actionable data above the fold (single-row slim toolbar; group secondary configs into `ตั้งค่า ⚙ ▾` and exports into `ส่งออก ▾`). Always apply `tabular-nums` to numbers, quantities, currency, and timestamps.
   - **Honest Loading States:** Never render `"ไม่พบข้อมูล (0 รายการ)"` while a fetch is in flight; render an explicit loading indicator or skeleton until data resolves.

---

## Pillar 2: Modern Web Platform & INP Performance (Anti-Legacy Web Bloat)
*Deep-dive playbook:* [references/modern-web-platform.md](./references/modern-web-platform.md)

1. **Zero Main-Thread Freezes (INP <= 200ms):**
   - **Never mutate `innerHTML +=` or `appendChild` inside large loops** ($O(N^2)$ DOM re-parse). Accumulate strings in an array and assign `tbody.innerHTML = rows.join('')` once, or paginate/virtualize rows (>200 items).
   - **Cancel Stale Requests:** Use `AbortController` on filter/tab/search fetches so rapid user clicks never cause out-of-order state overwrites.
   - **Pause Background Work:** Gate timers, polling, and heavy charts with `document.visibilityState === 'visible'` and `IntersectionObserver`.
   - **Debounce & Pre-Index Search:** Debounce text search inputs (`250–300ms`) and pre-compute lowercase `_search` strings on dataset load rather than running multi-field `.toLowerCase()` on every keystroke.
2. **Native CSS Over JS Workarounds (Baseline 2024–2026):**
   - Use `:user-invalid` / post-interaction state for form errors (never show red errors on untouched empty fields), `overscroll-behavior: contain` on modals/drawers, `content-visibility: auto` on long off-screen sections, `text-wrap: balance` on headings, and `@media (prefers-reduced-motion: reduce)` for animations.

---

## Pillar 3: Clean Code & Static Analysis (Karpathy + SonarQube Rules)
*Deep-dive playbook:* [references/sonar-code-quality.md](./references/sonar-code-quality.md)

1. **Surgical Scope & Simplicity (Karpathy Guidelines):**
   - Touch only the lines required by the task. Never refactor adjacent code, rename public symbols, or invent unrequested features.
   - **No Premature Abstraction:** Do not create a helper function, hook, or wrapper for logic used only once.
2. **SonarQube High-Severity Rules:**
   - **Cognitive Complexity <= 15:** Flatten deep `if/else` pyramids using early `return` / `continue` guard clauses. Never nest ternary operators (`a ? b : c ? d : e`).
   - **No Silent Catch or Fake Fallbacks:** Never write empty `catch (e) {}` or mask SQL/API failures with silent `|| 0` / `|| []` fallbacks. Roll back active DB transactions, log context, and return structured errors.
   - **Zero Dead Code & Noise Comments:** Delete unused imports, dead variables, and commented-out code blocks. Comment only **why** a non-obvious business rule exists, never **what** the line does.
   - **Security & XSS/SQLi:** Always use parameterized PDO statements, wrap dynamic HTML interpolations in `escapeHTML()` / `htmlspecialchars()`, and avoid `SELECT *` on transactional tables.
3. **Mandatory Local Verification:**
   - Whenever modifying JS/JSX files in `Toolbox/`, run `npx oxlint <modified_files>` (and `npm run build` for UI/bundle changes) to verify `0 warnings, 0 errors` before claiming completion.

---

## Pillar 4: Plain Human Writing (Humanizer + Plain-Writing)

1. **Answer-First & Zero Ceremony:**
   - Lead with the answer, root cause, or result in sentence one. Strip chatbot openers (*"แน่นอนครับ! ยินดีอย่างยิ่ง..."*, *"Great question!"*) and hollow closers (*"หวังว่าจะเป็นประโยชน์นะครับ"*).
2. **Ban AI Buzzwords & Em-Dash Abuse:**
   - **Banned Thai Tells:** *"ยกระดับอย่างก้าวกระโดด"*, *"ไร้รอยต่อ"*, *"ตอกย้ำความสำคัญ"*, *"ทรงพลัง"*, *"มิติใหม่"*, *"อย่างแท้จริง"*, *"ครบวงจรอย่างสมบูรณ์แบบ"*
   - **Banned English Tells:** *delve, seamless, cutting-edge, testament, tapestry, pivotal, underscore, foster, game-changer, robust, sleek, frictionless, cohesive, landscape*
   - **No Em-Dash (`—`) Chains in Prose:** Replace `—` clauses in prose sentences with plain periods, commas, or parentheses.
3. **Concrete Proof & Say It Once:**
   - Name the exact component, file path, SQL column, or metric (`"ลดเวลาค้าง Main Thread จาก 8.4s เหลือ 45ms"`) instead of abstract claims (*"ช่วยเพิ่มประสิทธิภาพอย่างเห็นได้ชัด"*).
   - Never append a summary paragraph that repeats the bullet points above.
