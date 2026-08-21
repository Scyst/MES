# FILE DELETION SAFETY PROTOCOL (CRITICAL)

- **DRY-RUN BEFORE DELETION:** Whenever an agent is instructed to (or decides to) delete files or directories on the server (whether through bash commands, scripts, FTP, or other tools), the agent **MUST** perform a verification check first.
- **SELECT BEFORE DELETE:** Just like running a `SELECT` statement before a `DELETE` in SQL, the agent must run a non-destructive listing command (e.g., `ls`, `find`, or equivalent MCP tools like `list_directory`) using the EXACT same pattern/conditions it plans to use for the deletion.
- **NEVER DELETE BLINDLY:** Do not run recursive delete commands (like `rm -rf`) or wildcard deletes (like `rm *.js`) without first verifying and printing out exactly what will be destroyed. If the scope of deletion is unexpectedly large, the agent MUST stop and ask for user confirmation.

# UI LAYOUT GUIDELINES
- **FLUID_LAYOUTS:** Use full-width fluid layouts (`w-full`) for Dashboards and Data Grids. EXCEPTIONS: Forms, Auth pages, and Settings panels MUST use centered max-width constraints (e.g., `max-w-md` or `max-w-lg mx-auto`) to prevent stretching on large factory displays.
- **TRUE_RESPONSIVENESS:** The application is used across mobile, tablets, and large factory displays. When expanding to full width, ensure the UI adapts gracefully (e.g., use `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`) rather than just stretching a single column to look unnaturally wide. Maximize screen real estate usage.

# TRACKING FILE DISCIPLINE
- **TRACKER OVERWRITE PROTECTION:** Use `write_to_file` ONLY to initialize missing or 0-byte tracking files like `task.md`, `ROADMAP.md`, or `audit_remaining_work.md`. 
- **NON-DESTRUCTIVE EDITS ONLY:** Otherwise, STRICTLY use `replace_file_content` or `multi_replace_file_content` to check off `[x]` tasks, append new tasks, or update statuses. Overwriting destroys the historical backlog and breaks the continuity of multi-agent tasks.

# AGENT BEHAVIOR GUIDELINES
- **NO YAPPING (CONCISENESS):** For minor code changes, simple bug fixes, or direct commands, minimize explanations. Avoid filler words, polite fluff, and unnecessary restatements. Go straight to the point or execute via tools directly.
- **ANTI YES-MAN (CRITICAL PUSHBACK):** Do not blindly execute requests that violate security protocols (e.g., storing sensitive data in localStorage), introduce performance bottlenecks, or contradict established architecture. If a user's request is flawed or risky, you MUST push back, explain the risk clearly, and propose a safer alternative.
- **FAIL FAST & LOUD:** If you encounter an error on an isolated module, log the error to `error_log.md` and proceed with independent tasks. If the error is a core blocker (e.g., DB connection, build failure) or ambiguous requirement, halt execution immediately, report the exact error, and ask the user for clarification.
- **DOC-FIRST (THINK BEFORE CODE):** Apply DOC-FIRST **ONLY** when creating new modules, APIs, or changing core architecture (e.g., JSDoc, module README, ROADMAP.md). Skip this requirement for minor bug fixes or small feature additions to conserve tokens.
- **BOY SCOUT RULE (LEAVE IT BETTER):** Apply this rule ONLY to **local variables** within the function scope you are actively editing. NEVER rename public/exported variables or functions to prevent side-effects. Do not add `// TODO` comments as they create technical debt.
- **ASSUME PRODUCTION:** Unless explicitly instructed that this is a prototype, write all code to production standards. Always include robust error handling (try-catch), input validation, proper typing, and pagination/limits on queries.

# GIT WORKFLOW (MULTI-AGENT PARALLEL)
- **WORK DIRECTLY ON MAIN:** All agents commit directly to `main`. Do NOT create feature branches or switch branches. This project has no CI/CD auto-deploy — `git push` does NOT affect production. Production updates only happen via explicit FTP upload through MCP tools.
- **NEVER SWITCH BRANCHES:** NEVER run `git checkout <branch>` or `git switch <branch>` to change the active branch. Doing so changes files on disk for ALL agents running in parallel. Branch management (merge, cleanup) is handled by the Manager Agent only when explicitly requested.
- **SMALL & SPECIFIC COMMITS:** Every commit MUST cover one logical change only. Never bundle multiple unrelated fixes into one commit. This enables clean `git revert <hash>` if a specific feature needs to be rolled back without affecting others.
  - ✅ `fix: prevent QA schedule from overwriting sales order confirmation status`
  - ❌ `update stuff` / `fixes` / `various changes`
- **PULL BEFORE PUSH:** ALWAYS run `git pull origin main --rebase` before pushing to avoid conflicts with other agents' work.
- **SHARED STATE AWARENESS (DB & ENV):** Global resources require strict coordination across all agents. (1) **Database:** Any schema alterations MUST be documented in a root `db_changes.md` file. (2) **Environment:** Any new key added to `.env` MUST be simultaneously added to `.env.example` with a dummy value.

# FTP OPERATION PROTOCOL
- **READ BEFORE UPLOAD:** Before uploading any files to the FTP server, agents MUST read `.agents/ftp_structure.md` to understand the existing folder structure and verify paths. Do not upload blindly into unknown paths.
- **MAINTAIN FTP STRUCTURE RECORD:** If an agent creates, deletes, or renames a folder on the FTP server, it MUST update `.agents/ftp_structure.md` to keep the centralized structure record accurate for other agents.

- **TIME_AWARE_COMMITS:** ALWAYS include the exact start and end time (working duration) along with the date in your git commit messages whenever you finish a task.
  - Format: <Commit Message> <HH:MM> - <HH:MM> <DD/MM/YY>
  - Example: "Create Agent API for Auto schedules timeline success 14:00 - 17:05 17/08/26"

# SYNC BOARD PROTOCOL (MANDATORY)
- **LOG BEFORE LEAVING:** Whenever an agent completes a task, hits a blocker, or finishes a session, it MUST log its work in E:\MES\MES\MES\.agents\sync_board\<YYYY-MM-DD>.md.
- **TEMPLATE COMPLIANCE:** Follow the template provided in E:\MES\MES\MES\.agents\sync_board\README.md.
- **NO SILENT WORK:** Do not perform work and terminate without updating the sync board. This is critical for multi-agent handoffs and syncing to the MES Team Planner.
