# Clean Code & SonarQube Static Analysis Playbook

Use this playbook to prevent Code AI Slop and enforce SonarQube-grade reliability, maintainability, and security across JavaScript, React, PHP, and SQL Server.

---

## 1. Local Static Analysis Verification (Run Every Time)

Whenever you create or modify JS/JSX files inside `Toolbox/`:
1. **Run `oxlint` immediately:**
   ```powershell
   npx --prefix "e:\MES\MES\MES\Toolbox" oxlint <path-to-modified-file>
   ```
   Fix all reported warnings and errors (`0 warnings, 0 errors`) before finishing.
2. **Run Vite Build when changing imports, routes, or UI components:**
   ```powershell
   npm --prefix "e:\MES\MES\MES\Toolbox" run build
   ```

---

## 2. SonarQube Top Code-Quality Rules (JS / React / PHP)

1. **Cognitive Complexity <= 15 (Flatten Arrow Code):**
   - Replace deeply nested `if / else` blocks with early guard clauses (`if (!isValid) return;`).
   - Extract complex boolean conditions (`if (a && b && (c || d) && !e)`) into a self-documenting boolean variable (`const canApproveOrder = ...`).
   - **Never nest ternary expressions** (`a ? (b ? c : d) : e`). Use an `if/else` block or a small lookup map.
2. **No Identical Branches or Duplicated String Literals:**
   - Do not write `if / else` branches or `switch` cases with identical bodies.
   - If a non-trivial logic block (>5 lines) is repeated more than twice in the same module, extract a local helper function.
3. **React Hook & State Hygiene:**
   - Never mutate React state objects/arrays in place (`state.push(...)`); always return a new reference.
   - Include proper cleanup functions in `useEffect` for intervals, event listeners, WebSockets, and `AbortController`.
   - Do not create derived state in `useEffect` (`useEffect(() => setFiltered(list.filter(...)), [list])`); compute derived values directly during render or via `useMemo`.
   - Use stable, unique domain IDs (`row.id`, `row.serial_no`) for React `key` props rather than array index `i` whenever rows can be filtered, sorted, or reordered.
4. **Async & Exception Safety:**
   - Never leave floating unhandled Promises without `await` or `.catch()`.
   - Never swallow exceptions in empty `catch (err) {}` blocks. In PHP endpoints, always:
     1. Roll back active transactions (`if ($pdo->inTransaction()) $pdo->rollBack();`).
     2. Log the error (`writeErrorLog(...)`).
     3. Return a structured JSON error (`{"success": false, "data": null, "message": "..."}`).
5. **PHP & SQL Server Security / Performance:**
   - **Zero SQL String Concatenation:** Always use PDO prepared statements (`$pdo->prepare(...)`) with bound parameters. When building dynamic `IN (?, ?, ?)` clauses or whitelist column names (`$allowedCols`), validate strictly against a hardcoded PHP array whitelist.
   - **XSS Prevention:** Always escape untrusted strings before injecting into DOM (`escapeHTML(val)` in Vanilla JS, `htmlspecialchars($val, ENT_QUOTES, 'UTF-8')` in PHP templates).
   - **Query Bounds & Locks:** Never run unbounded `SELECT *` on transactional tables (`STOCK_TRANSACTIONS`, `RM_SERIAL_TAGS`, `SYSTEM_LOGS`). Always specify required columns, apply `WITH (NOLOCK)` on read-only reporting queries where appropriate, and bound results with `TOP (N)` or `OFFSET ... FETCH`.
