# Root Agent Entry Point (`C:\Users\USER\Desktop\Project\MES` / `E:\MES\MES`)

Whenever an agent is opened at the repository root instead of `MES/`, it MUST read and strictly follow:
1. `@[Master Rules](MES/.agents/AGENTS.md)`
2. `@[Sync Board Template](MES/.agents/sync_board/README.md)`
3. `@[Current Handoff](MES/.agents/sync_board/handoff.md)`

All production application code lives inside `MES/` (while `MES_TEST/` is the test/staging mirror).

