---
trigger: always_on
description: Enforces OWASP Top 10 for LLM Applications and Web Application security guardrails whenever writing code, building AI tools/MCP servers, or designing autonomous/ambient agents.
---

# OWASP AI & Agent Security Guardrails

Apply on every task involving AI agents, LLM tool calling, MCP servers, webhooks, database queries, or backend APIs.

## 1. Prevent Prompt Injection (OWASP LLM01)
- Treat external or user-supplied data (emails, web pages, files, DB text fields, webhooks) as **untrusted data**, never as executable instructions.
- Delimit untrusted inputs inside structured tags (`<untrusted_data>...</untrusted_data>`) before passing to an LLM.
- Never concatenate raw LLM output into SQL queries, shell commands, `eval()`, or HTML DOM without strict validation, schema parsing, and output encoding.

## 2. Prevent Excessive Agency (OWASP LLM06)
- Enforce **Least Privilege** on every AI tool and DB credential: default to `Read-Only`.
- Never grant autonomous/background agents unrestricted `WRITE`, `DELETE`, `DROP`, shell execution, or outbound messaging without an explicit approval gate.
- Require **Human-in-the-Loop (HITL)** confirmation before state-changing actions (DB mutations, ERP updates, external communications, production deployments).

## 3. Circuit Breakers & Cost Control
- Every autonomous loop, cron job, or event-driven agent MUST define hard limits: `max_iterations` / `max_retries` (`<= 5`), execution timeout, rate limits, and daily token/cost caps.
- Filter routine events with deterministic code (SQL thresholds, regex, deduplication) before invoking an LLM.

## 4. Backend & Data Isolation
- Keep all API keys, LLM credentials, and DB secrets strictly server-side (`.env`); never expose in frontend bundles.
- Use PDO prepared statements for all SQL, enforce CSRF tokens on state-changing endpoints, and validate RBAC server-side.
- Isolate external ERP/vendor syncs through staging tables rather than writing directly into core production tables.

## 5. Observability & Audit Trail
- Log every agent tool invocation, trigger event ID, user/actor, timestamp, and outcome to a persistent audit log (`SYSTEM_LOGS`).
- Flag unexpected source IPs or repeated failed authentication attempts immediately.
