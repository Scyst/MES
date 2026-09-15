# MES Project — Mandatory Agent Entry Point

These instructions apply to every Codex task opened with `E:\MES\MES\MES` as its workspace.

## Before taking any task action

1. Read `.agents/AGENTS.md` completely and follow it as the project's master rules.
2. Read `.agents/sync_board/README.md` completely and use its template for every Sync Board entry.
3. Work only within `E:\MES\MES\MES` unless the user explicitly scopes work elsewhere.

## Cross-agent coordination

- Before ending a task, finishing a session, or reporting a blocker, update `.agents/sync_board/<YYYY-MM-DD>.md` non-destructively.
- When another agent (including Antigravity) needs to continue analysis, planning, or implementation, update `.agents/sync_board/handoff.md` with: context/goal, completed analysis, actionable next steps, and exact files to modify.
- Treat shared Git state, databases, environment configuration, FTP, and running services as coordinated resources; follow the master rules before changing them.

## Tools and integrations

Use a configured MCP integration only when it is available in the active Codex environment and is necessary for the task. Do not assume access to credentials, databases, Node-RED, servers, or deployment systems merely because they are mentioned in project documentation.
