# Modern Web Platform & INP Performance Playbook (Baseline 2024–2026)

AI models frequently generate outdated, JavaScript-heavy workarounds because legacy patterns dominate training corpora. Use modern native browser APIs and main-thread discipline instead.

---

## 1. Main-Thread & Interaction to Next Paint (INP) Discipline

Data-heavy industrial dashboards (PO tables, BOM matrices, stock ledgers, OEE logs) freeze when DOM mutations or O(N×M) loops block the main thread.

### A. Single-Pass Batch DOM Rendering (Never `innerHTML +=` in a Loop)
- **Anti-Pattern ($O(N^2)$ freeze):**
  ```javascript
  // ❌ BAD: Forces browser to serialize, destroy, and re-parse the entire tbody on every iteration
  items.forEach(item => {
    tbody.innerHTML += `<tr><td>${escapeHTML(item.name)}</td></tr>`;
  });
  ```
- **Modern Pattern ($O(N)$ single pass):**
  ```javascript
  // ✅ GOOD: Build array in memory, assign innerHTML once (or use DocumentFragment)
  const rows = new Array(items.length);
  for (let i = 0; i < items.length; i++) {
    rows[i] = `<tr><td>${escapeHTML(items[i].name)}</td></tr>`;
  }
  tbody.innerHTML = rows.join('');
  ```

### B. Lazy Modal Rendering & Viewport Capping
- Never build hidden DOM trees (e.g., 20,000 BOM detail badges inside a closed modal) during initial page load. Store the raw JSON data in memory and render the modal's DOM **only when the user opens it** (`showModal === true`), capping initial visible rows (e.g., 50–300 rows with a "Show all / Load more" control or pagination).

### C. Cancel Stale Fetches with `AbortController`
- When users switch tabs, dates, or filters rapidly, cancel the previous in-flight request so a slow old response never overwrites a fast new response:
  ```javascript
  let activeController = null;
  async function loadReport(params) {
    if (activeController) activeController.abort();
    activeController = new AbortController();
    const res = await fetch(url, { signal: activeController.signal });
    // ...
  }
  ```

### D. Pause Background Polling & Animations
- When polling live telemetry or rendering canvas/WebGL/charts, pause work when the tab is hidden:
  ```javascript
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopPolling();
    else startPolling();
  });
  ```

### E. Pre-Index Client-Side Search
- When filtering hundreds or thousands of rows client-side, pre-compute a single lowercase `_search` string once when data arrives (`row._search = `${row.part_no} ${row.desc}`.toLowerCase()`), and debounce the input by `250–300ms`.

---

## 2. Modern Native CSS & HTML Over JS Hacks

1. **Form Validation Feedback (`:user-invalid`):**
   - Never show red validation borders on empty required fields before the user interacts with them. Use `:user-invalid` (or track touched state on blur/submit) and synchronize `aria-invalid` for accessibility.
2. **Prevent Background Scroll Bleed (`overscroll-behavior: contain`):**
   - Apply `overscroll-behavior: contain` (Tailwind `overscroll-contain`) on scrollable modal bodies, drawers, and chat panels so scrolling to the bottom on mobile never scrolls the page behind it.
3. **Off-Screen Rendering Optimization (`content-visibility: auto`):**
   - For long pages with multiple below-the-fold cards or sections, use `content-visibility: auto; contain-intrinsic-size: auto 400px;` to skip layout/paint of off-screen sections until scrolled near.
4. **Parent & Sibling State Styling (`:has()`):**
   - Use CSS `:has()` (e.g., `label:has(input:checked)`, `fieldset:has(:user-invalid)`) to style parent containers based on child input state without adding JS event listeners.
5. **Auto-Growing Inputs (`field-sizing: content`):**
   - Use `field-sizing: content` (with `min-h-*` and `max-h-*`) on textareas and dynamic inputs so they resize natively without JS `el.style.height = el.scrollHeight + 'px'` layout thrashing.
6. **Balanced Typography & Tabular Figures:**
   - Use `text-wrap: balance` on multi-line headings/modal titles and `text-wrap: pretty` on body copy.
   - Use `font-variant-numeric: tabular-nums` (`tabular-nums`) on all numeric tables, counters, timers, and financial cards.
7. **Motion & Theme Preferences:**
   - Respect `@media (prefers-reduced-motion: reduce)` for all CSS transitions/animations, and set `color-scheme: light dark` on the root element so native scrollbars, date pickers, and form controls match the active theme automatically.
