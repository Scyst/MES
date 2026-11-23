# FILE DELETION SAFETY PROTOCOL (CRITICAL)
- **DRY-RUN & SELECT BEFORE DELETE:** Before deleting any local or FTP files/directories, ALWAYS run a non-destructive listing (`Get-ChildItem`, `ls`, `list_directory`, `ftp_list_files`) using the exact target pattern first.
- **NEVER DELETE BLINDLY:** Never run recursive or wildcard deletes (`rm -rf`, `rm *.js`) without first printing and verifying the exact list of targets. Ask for user confirmation if the scope is large.

# UI LAYOUT GUIDELINES
- **FLUID_LAYOUTS:** Use full-width fluid layouts (`w-full`) for Dashboards and Data Grids. Forms, Auth pages, and Settings panels MUST use centered max-width constraints (`max-w-md` or `max-w-lg mx-auto`).
- **TRUE_RESPONSIVENESS:** Support mobile (375px+), tablets, and large factory displays using responsive grids (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`) and touch targets >= 44x44px.

# TRACKING FILE DISCIPLINE
- **OVERWRITE PROTECTION:** Use `write_file` ONLY to initialize missing or 0-byte tracking files (`task.md`, `ROADMAP.md`, `sync_board/<YYYY-MM-DD>.md`).
- **NON-DESTRUCTIVE EDITS:** Strictly use `edit_file` to check off `[x]` tasks, append entries, or update statuses without destroying historical logs.

# AGENT BEHAVIOR GUIDELINES
- **NO YAPPING (CONCISENESS):** Minimize explanations and filler for minor changes, bug fixes, or direct commands. Execute directly.
- **ANTI YES-MAN (CRITICAL PUSHBACK):** Push back on requests that violate security (e.g., sensitive data in `localStorage`), degrade performance, or break architecture. Explain the risk and propose a safer alternative.
- **FAIL FAST & LOUD:** Log isolated module errors to `error_log.md` and proceed with independent tasks. Halt immediately on core blockers (DB connection, build failure, ambiguous requirements) and ask for clarification.
- **DOC-FIRST:** Document first ONLY when creating new modules, APIs, or changing core architecture (`ROADMAP.md`, `ARCHITECTURE.md`, module `.md`). Skip for minor fixes to save tokens.
- **BOY SCOUT RULE:** Clean up ONLY local variables inside the function actively being edited. Never rename public/exported symbols or leave `// TODO` comments.
- **FORMAL TONE (INDUSTRIAL GRADE):** All UI text, dialogs, and notifications MUST use formal Thai/English suitable for industrial environments (e.g., use "ทั้งหมด" instead of "รวดเดียว", "กรุณายืนยัน" instead of "เอาเลยไหม").
- **ASSUME PRODUCTION:** Write all code to production standards with `try-catch`, server-side input validation, proper typing, and query pagination/limits.

# GIT WORKFLOW (MULTI-AGENT PARALLEL)
- **WORK DIRECTLY ON MAIN:** Commit directly to `main`. Do NOT create or switch branches (`git checkout`/`git switch`), as switching branches alters files on disk for all parallel agents. Production deploys happen only via explicit MCP FTP upload.
- **SMALL & SPECIFIC COMMITS:** Stage and commit only the specific files modified for one logical change (`git commit -m "msg" file1 file2`).
  - ✅ `fix: prevent QA schedule from overwriting sales order confirmation status 14:00 - 14:30 17/08/26`
  - ❌ `update stuff` / `fixes`
- **TIME-AWARE COMMITS:** Always append working duration and date to commit messages: `<Commit Message> <HH:MM> - <HH:MM> <DD/MM/YY>`.
- **PULL BEFORE PUSH:** Always run `git pull origin main --rebase` before pushing.
- **SHARED STATE AWARENESS:** Document any DB schema changes in root `db_changes.md`. Add dummy values to `.env.example` whenever adding keys to `.env`.

# FTP OPERATION PROTOCOL
- **READ BEFORE UPLOAD:** Always read `.agents/ftp_structure.md` to verify remote paths before uploading via `mes-custom-mcp/ftp_upload_file` or `ftp_upload_directory`.
- **MAINTAIN RECORD:** Update `.agents/ftp_structure.md` whenever creating, deleting, or renaming remote FTP folders.

# SYNC BOARD PROTOCOL (MANDATORY)
- **LOG BEFORE LEAVING:** Log every completed task, blocker, or session in `.agents/sync_board/<YYYY-MM-DD>.md` using the `.agents/sync_board/README.md` template (Thai preferred, focusing on business value, Why/What/Result, and Files Modified).

# PLANNER ZERO-GAP PROTOCOL (SEAMLESS TIMELINE)
- **FULL LIFECYCLE & CHAINING:** When logging tasks in `TeamPlanner_Tasks`, include full lifecycle duration (formulation, execution, UAT). Chain sequential tasks (`StartTime = previousTask.EndTime`, respecting 12:00-13:00 lunch).
- **CONSOLIDATE & PARALLELIZE:** Group micro-iterations into 1.5-3h Milestone Blocks with `Subtasks`. Cross-module tasks may overlap (max 2-3 lanes); same-module tasks must chain sequentially.

# POWERSHELL & SCRIPTING HAZARDS (CRITICAL)
- **SINGLE-QUOTED HERE-STRINGS (`@' '@`):** Always use single-quoted here-strings (`@' '@`) in PowerShell. NEVER use double-quoted here-strings (`@" "@`) unless variable expansion is explicitly needed, as PowerShell expands `$variables` and backticks (` `` `) and corrupts PHP/Markdown files.
