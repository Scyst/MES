---
name: ambient-agent-architect
description: Designs, reviews, and implements event-driven Ambient and Proactive AI Agents (24/7 background monitors, webhook/cron workers, Human-in-the-Loop approval inboxes, and safe MES/personal automation). Use when building always-on agents, scheduled AI monitors, n8n AI workflows, or LangGraph background pipelines.
---

# Ambient & Proactive AI Agent Architect

Use this skill whenever designing, refactoring, or implementing an **Ambient Agent** (an always-on, event-driven AI system that listens to signals and acts autonomously with human oversight). Based on patterns from [LangChain Ambient Agents](https://www.langchain.com/blog/introducing-ambient-agents), [AWS Bedrock AgentCore](https://aws.amazon.com/blogs/machine-learning/building-ambient-agents-with-amazon-bedrock-agentcore-from-event-driven-signals-to-human-in-the-loop-workflows/), and [Model Context Protocol (MCP)](https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro).

## Core Architecture Pipeline

Always structure an Ambient Agent into 4 decoupled stages rather than wiring raw events directly into an LLM:

1. **Signal Intake (Triggers):**
   - Supported triggers: Scheduled Cron jobs, API Webhooks, Database change polling / staging diffs, MQTT/IoT threshold events, or Email/Chat arrivals.
   - Assign a unique `event_id` (or idempotency key) to every incoming signal.
2. **Deterministic Pre-Filter (Code First, LLM Second):**
   - Run fast, zero-cost rule checks (numeric thresholds, regex, status checks, deduplication, and cooldown windows) in plain PHP/Python/SQL before calling any LLM.
   - Drop noise and duplicate events here to cut token usage by 80-90% and prevent Alert Fatigue.
3. **Agent Reasoning & State Persistence:**
   - Start each event in a clean, isolated session (avoid stale context drift from multi-day chat histories) and pull live grounding data via whitelisted Read-Only tools or MCP servers.
   - Persist job state (`pending`, `waiting_human`, `approved`, `completed`, `failed`) in a database so workflows can pause and resume safely across restarts ([LangChain HITL](https://docs.langchain.com/oss/python/langchain/human-in-the-loop)).
4. **Tiered Action Lanes (Risk-Based Routing):**
   - **Lane A — Notify (Low Risk):** Send concise summary/alert to LINE, Telegram, Slack, or Dashboard. Enforce cooldown rules so the same issue does not spam users.
   - **Lane B — Ask / Review (Medium-High Risk, Mandatory HITL):** Draft the proposed action (email, maintenance work order, stock adjustment, code PR) and pause execution until a human clicks Approve, Edit, or Reject in an Agent Inbox or chat UI ([Agent Inbox Pattern](https://github.com/langchain-ai/agent-inbox)).
   - **Lane C — Auto-Execute (Validated Routine Only):** Allow autonomous writes ONLY for reversible, thoroughly tested, low-impact actions with strict parameter bounds.

## Mandatory Production Safeguards

Before finalizing any Ambient Agent design or code, verify all 5 items:

- **Idempotency & Locking:** Ensure overlapping cron runs or duplicate webhooks cannot trigger duplicate writes, work orders, or notifications (use DB locks or processed `event_id` tables).
- **Circuit Breaker:** Hard-cap retries (`max_retries <= 5`), max tool calls per event, and daily token spend. On limit breach, halt and alert the operator.
- **Zero-Trust Security:** Apply [OWASP LLM Top 10](https://genai.owasp.org/llm-top-10/) controls — delimit untrusted text against Indirect Prompt Injection and enforce Least Privilege (`Read-Only` default) against Excessive Agency.
- **Hybrid Model Routing:** Support switching between Enterprise Cloud APIs (Zero-Training) and On-Premise Local LLMs (`Ollama` / `vLLM`) via `.env` config to protect confidential data and prevent long-term inference cost spikes.
- **Observability (Heartbeat & Jobs Log):** Record `job_id`, `trigger_source`, `started_at`, `tokens_used`, `status`, and `error_message` so silent failures are immediately visible.

## Recommended Stack Selection

- **Personal / Rapid Prototype:** Self-hosted [n8n](https://n8n.io/ai-agents/) (Docker) with Schedule/Webhook nodes + Telegram/LINE notification + HITL wait node.
- **Factory / MES Integration:** Lightweight PHP/Python Cron or MQTT Worker for Pre-Filtering -> Existing Backend Security Gateway (`Read-Only Tools`) -> Hybrid Cloud/Local LLM -> Dashboard / Alert Inbox.
- **Complex Multi-Step State Machines:** [LangGraph](https://github.com/langchain-ai/ambient-agent-101) with built-in checkpoint persistence and `interrupt()` for pause-and-resume human approvals.
