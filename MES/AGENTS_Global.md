<SYSTEM_DIRECTIVES>

<!-- ============================================================
     AGENT.md — Multi-Agent Engineering Standards
     Project: MES (Manufacturing Execution System)
     Stack: PHP API · React/Vite · SQL Server 2016 · Node-RED
     Environment: Internet-facing (HTTPS) — accessed by employees via personal mobile devices
     Last Updated: 2026-07-24
     ============================================================ -->

<CRITICAL_CONSTRAINTS>
- DEPLOYMENT: NEVER write/generate deployment scripts (e.g., deploy_ftp.js, bash scripts). ALWAYS use `call_mcp_tool` -> `mes-custom-mcp/ftp_upload_file`.
- GIT_DESTRUCTIVE: NEVER use `git reset --hard` or `git clean -fd`. USE `git checkout -- <file>` or `git revert` instead.
- GIT_COMMIT: NEVER commit blindly. ALWAYS run `git status` first. ONLY commit specifically modified files (`git commit -m "msg" file1 file2`).
- VERIFICATION: NEVER claim a task is complete without executing a test (e.g., lint, build, test command, npm run dev). DO NOT guess fixes.
- SCOPE_DISCIPLINE: NEVER modify files outside the scope of the current task. If a tangential fix is discovered, log it in `task.md` as a separate item — do NOT silently fix it.
</CRITICAL_CONSTRAINTS>

<EXECUTION_PROTOCOLS>
- MCP_FIRST: IF a task requires external data (DB, FTP, Logs, Node-RED), THEN you MUST proactively execute `call_mcp_tool` without asking the user.
- DOCS_BEFORE_CODE: ALWAYS read module-level .md files BEFORE writing code to understand context.
- DOCS_AFTER_CODE: ALWAYS update ROADMAP.md, ARCHITECTURE.md, or module-level .md IMMEDIATELY after a feature is completed. Include formulas, logic, and data structures.
- MILESTONE_COMMITS: Execute `git commit` and `git push` immediately upon successful verification of a feature/fix.
- SCHEMA_VERIFY: Before writing any DB-related code, ALWAYS run `describe_table` via MCP to confirm the live schema matches your assumptions. NEVER rely on memory or cached schema.
</EXECUTION_PROTOCOLS>

<DEBUGGING_WORKFLOW>
IF the user reports a bug persists after a fix:
1. STOP guessing.
2. ADD verbose logging (console.log, print).
3. EXECUTE local dev server / scripts.
4. ANALYZE logs.
5. FIX and VERIFY before replying.

IF a bug is intermittent or environment-specific:
6. CHECK for race conditions, caching issues, or state leaks.
7. REPRODUCE in an isolated context before attempting a fix.
8. DOCUMENT the root cause in the commit message — not just "fixed bug".
</DEBUGGING_WORKFLOW>

<MULTI_AGENT_COOP>
- BRANCHING: NEVER work directly on the `main` branch. ALWAYS create and checkout a new branch for your specific task (`git checkout -b agent/<task-name>`).
- SYNCING: ALWAYS run `git pull origin main --rebase` to fetch the latest changes BEFORE creating a branch and BEFORE pushing.
- CONFLICT_RESOLUTION: IF a git merge/rebase conflict occurs, DO NOT force push. Abort the operation and ask the user for help, OR resolve the conflict manually using AST-aware editing if you are confident.
- STATE_LOCKING: BEFORE modifying any core configuration or shared architectural files, check if other agents are working on them. Announce your intentions in a shared `task.md` or similar tracker.
- HANDOFF_PROTOCOL: When passing work to another agent, leave a clear summary in `task.md` with: what was done, what remains, any blockers, and which files were modified.
</MULTI_AGENT_COOP>

<TESTING_STRATEGY>
- COVERAGE_MANDATE: Every new feature or bug fix that touches business logic MUST include at least one verification step — a manual test command, a SQL assertion, or an automated test. "It looks correct" is NOT verification.
- REGRESSION_AWARENESS: Before modifying shared utility functions (`config.php`, `logger.php`, `check_auth.php`), identify ALL callers. Run a `grep_search` to map the blast radius. NEVER assume a shared function has only one consumer.
- EDGE_CASES: All numeric inputs (quantities, weights, prices) MUST be tested with: zero, negative values, MAX boundary, and decimal precision overflow (beyond DECIMAL(10,3)). This is critical for manufacturing accuracy.
- API_CONTRACT_TESTING: After modifying any PHP API endpoint, verify the response shape matches `{"success": bool, "data": mixed, "message": string}`. Any deviation is a breaking change.
- STATE_TRANSITION_TESTING: For workflow features (e.g., Job Order status changes), test every valid transition AND verify that invalid transitions are rejected with proper error messages.
</TESTING_STRATEGY>

<SECURITY_PROTOCOLS>
- ZERO_HARDCODE: NEVER hardcode passwords, API keys, tokens, IP addresses, or DB credentials in ANY source file (`.js`, `.jsx`, `.php`, `.ps1`, `.sql`). ALL secrets MUST live in `.env` files which are `.gitignore`-d. Violation of this rule is a BLOCKING issue.
- INPUT_VALIDATION: ALL user inputs — whether from forms, URL parameters, barcode scanners, or API payloads — MUST be validated server-side. Client-side validation is a UX convenience, NOT a security boundary.
  - Strings: Sanitize with `htmlspecialchars()` for HTML output. Use parameterized queries (PDO prepared statements) for SQL. NEVER concatenate raw input into queries.
  - Numbers: Cast explicitly (`intval()`, `floatval()`). Reject NaN and out-of-range values.
  - Files: Validate MIME type, extension, and size. Store uploads OUTSIDE the web root.
- CSRF_ENFORCEMENT: ALL state-mutating requests (`POST`, `PUT`, `DELETE`) MUST validate `$_SESSION['csrf_token']`. No exceptions.
- SESSION_HYGIENE: Regenerate session IDs after login (`session_regenerate_id(true)`). Set secure cookie flags (`HttpOnly`, `SameSite=Strict`, `Secure`). Implement session timeout for idle users. This system is Internet-facing and accessed from personal devices — session security is paramount.
- HTTPS_ENFORCEMENT: ALL production traffic MUST be served over HTTPS. HTTP requests MUST redirect to HTTPS. Never transmit credentials or session tokens over unencrypted connections.
- RATE_LIMITING: Internet-facing login and API endpoints SHOULD implement rate limiting or account lockout after repeated failed attempts to mitigate brute-force attacks.
- AUDIT_COMPLETENESS: Every `UPDATE` or `DELETE` on core tables MUST log `oldData` and `newData` via `writeLog()`. If an operation cannot be audited, it MUST NOT proceed.
- DEPENDENCY_VIGILANCE: Before adding any new npm/composer package, verify: (1) it has active maintenance, (2) no known CVEs, (3) no unexpected external network calls that could leak data.
- CLIENT_STORAGE_RESTRICTION: NEVER store sensitive business data, PII, or raw DB records in `localStorage` or `sessionStorage`. Use React state (memory) for sensitive data — it clears on refresh. Only non-sensitive UI preferences (e.g., theme, sidebar toggle, selected tab) may be persisted in `localStorage`. Employees use personal devices (BYOD) — data left on a lost or ex-employee phone is a data breach.
- CORS_AND_HEADERS: PHP APIs MUST enforce strict CORS policies allowing only the exact production frontend origin(s). ALL API responses MUST include standard security headers: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
</SECURITY_PROTOCOLS>

<CODE_QUALITY>
- NAMING_CONVENTIONS:
  - Variables/Functions: `camelCase` (JS/PHP). 
  - React Components/Files: `PascalCase` (e.g., `MachineCockpit.jsx`).
  - Database Objects: `UPPER_SNAKE_CASE` (e.g., `ONHAND_TABLE`, `SP_EXECUTE_PRODUCTION`).
  - CSS Classes: Follow project convention (TailwindCSS utilities or BEM for custom CSS).
  - Names MUST be self-documenting. `x`, `tmp`, `data2` are NEVER acceptable in committed code.
- FUNCTION_SIZE: Target a maximum of 50 lines of logic per function (excluding comments/whitespace). If it exceeds this, decompose into well-named helper functions. EXCEPTIONS are allowed when decomposition would reduce clarity (e.g., route switch-case handlers, large form validators, complex data transformations) — but the decision to exceed must be conscious, not accidental. When exceeding, add a brief comment at the top: `// NOTE: Intentionally >50 lines — [reason]`.
- DRY_ENFORCEMENT: If the same logic appears in more than 2 places, extract it into a shared utility. Duplicate code is a maintenance liability that compounds with every copy.
- SINGLE_RESPONSIBILITY: Each file, function, and component should do ONE thing well. API endpoints should not contain rendering logic. UI components should not contain direct DB queries.
- DEAD_CODE: NEVER leave commented-out code, unused imports, or orphaned functions in committed files. Use version control to preserve history — not code comments.
- COMMIT_MESSAGES: Use imperative mood. Be specific. Include the "why" when the change is non-obvious.
  - GOOD: `fix: prevent double-submit on production report form (race condition)`
  - BAD: `fixed stuff` / `update` / `changes`
- RESPONSIVE_FIRST: Users access the system from personal mobile devices. ALL React components MUST be responsive (use Tailwind `sm:`, `md:`, `lg:` breakpoints) and touch-friendly (minimum tap target 44×44px). NEVER design desktop-only views unless explicitly requested by the user. Test layouts at 375px width (mobile) as the baseline.
</CODE_QUALITY>

<ERROR_HANDLING_AND_RESILIENCE>
- GRACEFUL_DEGRADATION: When a non-critical subsystem fails (e.g., Node-RED WebSocket, report generation), the core application MUST continue operating. Display a clear error message to the user for the failed component — do NOT crash the entire page.
- STRUCTURED_ERRORS: ALL API error responses MUST follow the standard shape: `{"success": false, "data": null, "message": "<human-readable error>"}`. NEVER expose raw database errors, stack traces, or internal paths to the client.
- TRY_CATCH_EVERYWHERE: Every PHP API endpoint MUST be wrapped in `try...catch`. The `catch` block MUST:
  1. Roll back any active transaction (`$pdo->rollBack()`).
  2. Log the error via `writeErrorLog()` with full context (module, error message, payload).
  3. Return a structured JSON error via `handleApiError()`.
- FRONTEND_ERROR_BOUNDARIES: React applications MUST implement Error Boundaries at the page/route level. An uncaught error in one component should NOT take down the entire SPA.
- RETRY_STRATEGY: For transient failures (network timeouts, WebSocket disconnects), implement exponential backoff with a maximum of 3 retries. After exhaustion, notify the user and log the failure.
- TIMEOUT_PROTECTION: ALL external calls (HTTP requests, DB queries on large datasets) MUST have explicit timeouts. A hung query must not block the user interface indefinitely.
- OFFLINE_RESILIENCE: Users on factory floors may experience intermittent mobile/Wi-Fi connectivity drops. The UI MUST: (1) detect online/offline state and display a clear visual indicator (e.g., "Offline" banner), (2) disable form submissions while offline to prevent silent data loss, (3) re-sync or prompt the user when connectivity is restored. NEVER allow a form to appear to submit successfully when the network is unavailable.
</ERROR_HANDLING_AND_RESILIENCE>

<PERFORMANCE_AND_SCALABILITY>
- QUERY_EFFICIENCY:
  - NEVER use `SELECT *` on transactional tables. Select only the columns you need.
  - ALWAYS use server-side pagination (`OFFSET...FETCH` or `TOP(N)`). Returning unbounded result sets is forbidden.
  - For tables > 100K rows, ensure every `WHERE` clause column has an appropriate index. Verify with `EXPLAIN` or execution plans.
  - Watch for N+1 query patterns: if you're querying inside a loop, refactor to a single JOIN or batch query.
- FRONTEND_PERFORMANCE:
  - Lazy-load routes and heavy components (`React.lazy()` + `Suspense`).
  - Memoize expensive computations (`useMemo`, `useCallback`) — but only when profiling confirms a bottleneck. Do NOT prematurely optimize.
  - Debounce search inputs and auto-complete fields (minimum 300ms).
  - Images and large assets MUST be optimized before bundling. No uncompressed PNGs in production.
- CACHING_STRATEGY:
  - For data that changes infrequently (e.g., machine lists, item master data), implement client-side caching with a TTL (Time-To-Live). Use `stale-while-revalidate` patterns where appropriate.
  - For real-time data (machine parameters, production counts), NEVER cache. Always fetch live via WebSocket or short-interval polling.
- BUNDLE_SIZE: Monitor Vite bundle output. Any single chunk > 500KB should be investigated and split. Users access the system from personal mobile devices over varying network speeds — large bundles directly impact load time and data usage. Factory terminals may also be low-spec (limited CPU/RAM), increasing parse and render time.
</PERFORMANCE_AND_SCALABILITY>

<CODE_REVIEW_CHECKLIST>
Before any commit or push, the agent SHOULD self-review against this checklist. Items are ordered by priority — focus on Critical items first.

**Critical (Security & Data Integrity):**
1. [ ] No hardcoded secrets, IPs, or credentials in any file.
2. [ ] All user inputs are validated server-side (SQL injection, XSS, type safety).
3. [ ] CSRF token validated on all state-mutating endpoints.
4. [ ] Error handling follows the structured pattern (try/catch, rollback, log, respond).
5. [ ] Audit trail: all core table mutations log oldData/newData via writeLog().

**Important (Correctness & Performance):**
6. [ ] No unbounded queries. Pagination or TOP(N) is enforced.
7. [ ] The change has been verified — not just "it compiles", but tested with realistic data.
8. [ ] Shared utilities are not duplicated. DRY principle is respected.

**Hygiene (Maintainability):**
9. [ ] No dead code, commented-out blocks, or unused imports.
10. [ ] Function names are self-documenting. No single-letter variables.
11. [ ] Commit message is specific and includes the "why".
12. [ ] Documentation (ROADMAP.md, module .md) is updated if behavior changed.

<!-- FUTURE: Migrate Critical items to automated enforcement (ESLint, PHPStan, Git Hooks/Husky)
     when CI/CD pipeline is established. Text-based rules serve as a stopgap. -->
</CODE_REVIEW_CHECKLIST>

<FILE_DELETION_SAFETY_PROTOCOL>
- DRY-RUN BEFORE DELETION: Whenever an agent is instructed to (or decides to) delete files or directories on the server (whether through bash commands, scripts, FTP, or other tools), the agent MUST perform a verification check first.
- SELECT BEFORE DELETE: Just like running a `SELECT` statement before a `DELETE` in SQL, the agent must run a non-destructive listing command (e.g., `ls`, `find`, or equivalent MCP tools like `list_directory`) using the EXACT same pattern/conditions it plans to use for the deletion.
- NEVER DELETE BLINDLY: Do not run recursive delete commands (like `rm -rf`) or wildcard deletes (like `rm *.js`) without first verifying and printing out exactly what will be destroyed. If the scope of deletion is unexpectedly large, the agent MUST stop and ask for user confirmation.
</FILE_DELETION_SAFETY_PROTOCOL>

</SYSTEM_DIRECTIVES>
