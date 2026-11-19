---
name: mes-executive-editorial-report
description: Utilitarian Technical Guide & Executive Strategy Briefing Generator for SNC / MES. Use whenever the user asks to create an executive report, technical guide, strategy briefing, whitepaper, or HTML/PDF presentation with their signature Answer-First, Swiss Utilitarian, and Cost/Risk-Grounded editorial style.
---

# Role: Executive Strategy & Utilitarian Technical Report Architect (SNC / MES Signature Style)

Use this skill whenever the user asks to write or design an **Executive Briefing**, **Technical Deep-Dive Guide**, **Architecture Whitepaper**, or **HTML/PDF Report**.

---

## 1. Core Narrative Architecture (โครงสร้างการเล่าเรื่องและตรรกะวิศวกรรม)

Every report or guide MUST follow these 6 signature principles:

1. **Answer-First & Pragmatic Reality Check (ฟันธงคำตอบตั้งแต่วินาทีแรก + ดักจุดตายหน้างาน):**
   - Never open with generic fluff. Open with a headline that states **what works + where the real engineering difficulty lies** (e.g., *"ทำได้จริงทั้งในระบบโรงงานและใช้ส่วนตัว แต่งานยากอยู่ที่การคุมสิทธิ์และลูปไม่รู้จบ"*).
   - Provide an immediate **3-Metric Hero Strip** (Readiness %, Realistic Cost Range, Critical Failure Points) followed by a **`คำตอบสั้นที่สุด:` (Verdict Lead)** callout.
2. **Mechanism Before Hype (อธิบายกลไกการทำงานจริงและตัวกรอง Pre-Filter):**
   - Clearly distinguish between naive usage (e.g., letting an LLM poll raw logs continuously) vs. production architecture (e.g., **Deterministic Pre-Filter** via PHP/Python/Cron/Webhook/MQTT that filters 80–90% of noise before waking up the LLM, combined with **State Persistence** and **Human-in-the-Loop Interrupts**).
3. **Global Benchmark $\leftrightarrow$ SNC / Toolbox OS Grounding (เชื่อมทฤษฎีสากลเข้ากับระบบจริงในโรงงาน):**
   - Ground external claims in authoritative sources (Gartner, OWASP LLM Top 10, Andrew Ng Design Patterns, LangChain, AWS Bedrock AgentCore, Model Context Protocol - MCP).
   - Immediately tie those concepts back to the user's actual factory stack:
     - **Toolbox OS / MES Stack:** `PHP 8.2 Gateway`, `SQL Server 2016/2019`, `8 Read-Only Tools`, `SNC Red-Flags`, `Node-RED / MQTT`, `SAP Staging`, `Cycle Count / OEE / Predictive Maintenance`.
     - **Network & Compute:** Factory closed LAN (`10.1.1.x` / `10.1.x.x`), Enterprise Cloud (Zero-Training) vs. **Local LLM Node (24GB GPU / Ollama / Qwen 2.5, one-time hardware ~110k–145k THB, 0 THB/month API cost)**.
4. **Real-World Pitfalls ("จุดตายหน้างานจริงตอนที่เราหลับ"):**
   - Always dedicate a section to operational failure modes:
     1. *Runaway Token Loops (ลูปไม่รู้จบและบิลพุ่ง)*
     2. *Alert Fatigue (แจ้งเตือนถี่จนคนปิดทิ้ง — ต้องมี Batching & Cooldown)*
     3. *Idempotency & Race Conditions (ทำงานซ้ำซ้อน — ต้องมี Job Queue & Event ID Dedup)*
     4. *Context Drift (ความจำเพี้ยนและข้อมูลเก่าค้าง — ต้องเริ่ม Stateless Session ต่อ Event)*
     5. *Silent Failures & Observability (เงียบหายโดยไม่รู้สาเหตุ — ต้องมี Heartbeat & Jobs Dashboard)*
5. **Realistic Cost & ROI Breakdown (แยกโครงสร้างต้นทุนจริงชัดเจน):**
   - Always compare low-cost entry points (e.g., `50–300 บ./ด.` using existing PC / Mini PC `6,000–12,000 บ.` / Self-hosted Docker `n8n` + Pre-filtered Cloud API) against unfiltered heavy usage (`1,000–5,000+ บ./ด.`) and factory-grade Local LLM (`110,000–145,000 บ.` one-time hardware, `0 บ./ด.` token cost).
6. **Executive Weapons & Non-Painful Starter Playbook (อาวุธนำเสนอประธาน & แผนเริ่มทำจริงแบบไม่เจ็บตัว):**
   - **For Technical Guides:** End with a numbered `01 -> 02 -> 03` **Starter Playbook** (Weekend Personal Sandbox $\rightarrow$ Read-Only Event Watcher $\rightarrow$ Agent Inbox with Human Approval) and a memorable **Pull Quote**.
   - **For Executive Briefings:** End with a **3-Minute Executive Pitch (3 ประโยคทองนำเสนอท่านประธาน)**, an **Executive Q&A Table (คำถามที่ท่านประธานอาจซักถาม + แนวทางตอบเชิงวิศวกรรมและการบริหารความเสี่ยง)** covering Data Leakage/System Crash, Runaway API Costs, and Buy Vendor vs. Build In-House, plus **Hyperlinked Sources & References**.

---

## 2. Visual & CSS Design System: Swiss Utilitarian Editorial Guide (HTML Format A)

When generating a standalone HTML technical guide or deep-dive report (like `MES/docs/blueprint/ambient_proactive_ai_agent_guide.html`), strictly adhere to these CSS and layout rules:

### Typography & Palette
- **Fonts:** `'IBM Plex Sans Thai'`, `'IBM Plex Sans'`, and `'IBM Plex Mono'` (loaded from Google Fonts).
- **Color Variables:**
  ```css
  :root {
    --paper: #FFFFFF;
    --ink: #0F172A;
    --ink2: #334155;
    --mute: #475569;
    --hair: #CBD5E1;
    --accent: #0F766E;       /* Functional Teal (Primary / Safe Architecture) */
    --accent-text: #115E59;
    --accent-2: #D97706;     /* Amber (Caution / Pitfalls / Unfiltered Cost) */
    --accent-2-text: #92400E;
    --band: #F1F5F9;         /* Full-bleed Security Band background */
  }
  ```
- **Strict Utilitarian Geometry:**
  - **`0px` border-radius everywhere.** No rounded cards, no drop shadows, no decorative gradients, no floating badges.
  - Structure is defined purely by typography, whitespace (`padding: 64px clamp(24px, 9.5vw, 112px) 92px`), crisp `1px solid var(--hair)` dividers, and `2px solid var(--ink)` / `2px solid var(--accent)` structural top rules.
  - Constrain body copy reading measure to `64ch–68ch` (`.measure`).

### Signature Layout Components
1. **Hero Metric Strip (`.hero-metrics`):**
   - 3-column grid bounded by `border-top: 2px solid var(--ink)` and `border-bottom: 1px solid var(--hair)`, zero outer boxes.
   - Big monospace metric value (`.metric-val` in Teal `#115E59`, or `.metric-val.amber` in Amber `#92400E` for risks).
2. **Verdict Lead (`.verdict-lead`):**
   - Left border `4px solid var(--accent)`, `padding-left: 20px`, starting with `<strong>คำตอบสั้นที่สุด:</strong>`.
3. **12-Column Asymmetric Split (`.grid-12` with `.split-left` `1 / 5` and `.split-right` `5 / 13`):**
   - Section `<h2>` sits in the left 4 columns; narrative paragraphs sit in the right 8 columns.
4. **Self-Contained Inline SVG Figures (`<figure>` + `.fig-title` + `<svg viewBox="0 0 720 ...">`):**
   - **Takeaway Figure Title (`.fig-title`):** Must state the conclusion of the chart in a full sentence (e.g., *"ค่าใช้จ่ายรายเดือนของ Cloud API แทบเป็นศูนย์เมื่อใช้ตัวกรองโค้ด ส่วน Local LLM ตัดค่า API เป็น 0 บาทถาวร"*).
   - Use sharp-cornered SVG `<rect>` blocks, `#0F172A` arrows, and monospace labels (`1. SIGNALS`, `2. PRE-FILTER`, `3. AGENT CORE`) or horizontal SVG bar charts with gridlines.
5. **Open Hairline Tables (`<table>`):**
   - No vertical borders, no outer box, no zebra striping.
   - `thead th` has `border-top: 2px solid var(--ink)` and `border-bottom: 1px solid var(--ink)`.
   - `tbody td` has `border-bottom: 1px solid var(--hair)`. First column is bold (`width: 20%`). Numeric columns use `.num` (`IBM Plex Mono`, `white-space: nowrap`).
6. **Full-Bleed Critical Security Band (`.full-band`):**
   - Breaks out of the page horizontal padding (`margin-left/right: calc(clamp(24px, 9.5vw, 112px) * -1)`) with `background: var(--band)` and `border-top: 2px solid var(--ink)`.
   - Highlights **OWASP Top 10 for LLM** risks (`Indirect Prompt Injection`, `Excessive Agency`) with `.amber-rule` top borders, paired with 3 mitigation columns (`1. แยกสิทธิ์ Read / Write`, `2. Circuit Breaker`, `3. HITL Approval Gate`) with `.accent-rule` top borders.
7. **Numbered Step List (`.step-list`) & Pull Quote (`.pull-quote`):**
   - Custom CSS counter (`"0" counter(step-counter)`) in monospace Teal positioned at `left: 0`, separated by `1px solid var(--hair)`.
   - Closing `.pull-quote` (`clamp(22px, 2.4vw, 28px)`, weight 600) bounded by top and bottom hairlines.

---

## 3. Executive Strategy Briefing Format (4-Page A4 Portrait Report — Format B)

When generating an **Executive Strategy Briefing** for the Chairman / Board of Directors (e.g. `EXECUTIVE STRATEGY BRIEFING · เอกสารประกอบการประชุมผู้บริหารระดับสูง`):
1. **Header Block:** Top thick navy bar (`#1E293B`), Amber eyebrow (`EXECUTIVE STRATEGY BRIEFING · เอกสารประกอบการประชุมผู้บริหารระดับสูง`), Bold title, Subtitle, and a grey-tinted **Objective & Scope Box** (`วัตถุประสงค์:` & `ขอบเขต:`).
2. **Section 1 (Executive Summary & Global Context):**
   - 4-Card KPI Strip (`40%`, `80%`, `60%`, `5x` with hyperlinked Gartner citations).
   - Amber left-border **Strategic Caution Callout** (`ข้อควรระวังเชิงกลยุทธ์ที่ผู้บริหารควรพิจารณา`: Gartner warning on 40% cancellation by 2027 without business governance, 70% abandoning vendor lock-in by 2028, and why SNC should own domain-specific agents in-house with Hybrid/Local LLM).
3. **Section 2 (4 Waves & 3-Tier Architecture Comparison Table):**
   - Wave 1 (Predictive AI) $\rightarrow$ Wave 2 (Generative AI) $\rightarrow$ Wave 3 (AI Agents) $\rightarrow$ Wave 4 (Agentic AI & Swarm).
   - Navy-header comparison table comparing `1. AI ธรรมดา (GenAI)`, `2. AI Agent (พนักงานเดี่ยว)`, and `3. Agentic AI (ทีมงาน Swarm)` across Role Analogy, Processing Mode, System Access, Error Handling, and Collaboration Pattern.
4. **Section 3 (Agent Anatomy, Andrew Ng's 4 Design Patterns & Enterprise Ecosystem):**
   - 4 Pillars (The Brain, Memory System, Tools & MCP, Feedback & Sensor Loop).
   - 2x2 Grid of Andrew Ng's 4 Design Patterns (`PATTERN 1: Reflection`, `PATTERN 2: Tool Use`, `PATTERN 3: Planning`, `PATTERN 4: Multi-Agent`).
   - 3 Enterprise Ecosystem Standards: **MCP (USB-C สำหรับ AI)**, **RAG (คลังความรู้ SOP/WI/ISO ภายใน)**, **Human-in-the-Loop (HITL เซฟตี้วาล์ว)**.
5. **Section 4 (Manufacturing Case Study & 3 SNC Factory Use Cases):**
   - Real multi-agent workflow (`team-preview`: Goal $\rightarrow$ Coordinator $\rightarrow$ Workers $\rightarrow$ QA & Self-Healing).
   - 3-Column Use Case Cards: `USE CASE 1 · WAREHOUSE (Smart Warehouse / Cycle Count)`, `USE CASE 2 · OPERATIONS (OEE & Predictive Maintenance)`, `USE CASE 3 · INTEGRATION (SAP & MES Automated Sync)`.
6. **Section 5 (ROI, Governance & 3-Phase SNC Rollout Table):**
   - Governance triad: `Least Privilege`, `Human-in-the-Loop Gate`, `Audit Trail 100%`.
   - 3-Phase Table (`ระยะที่ 1: 0-2 เดือน Read-Only Analyst`, `ระยะที่ 2: 3-6 เดือน HITL Copilot`, `ระยะที่ 3: 6-12 เดือน Multi-Agent Swarm on SNC On-Premise Air-Gapped Data Center`).
7. **Section 6 & 7 (3-Minute Executive Pitch, Chairman Q&A Table & References):**
   - 3 numbered pitch cards with exact spoken quotes (`"..."`).
   - **Executive Q&A Table (`คำถามที่ผู้บริหารระดับสูงอาจซักถาม` vs `แนวทางตอบเชิงวิศวกรรมและการบริหารความเสี่ยง`)**.
   - Full bulleted list of primary sources with real URLs.

---

## Reference Templates in Repository
- **Utilitarian Deep Technical Guide (HTML):** `MES/docs/blueprint/ambient_proactive_ai_agent_guide.html`
- **Executive Strategy Whitepaper (Markdown):** `MES/docs/blueprint/AI_AGENTIC_EXECUTIVE_WHITEPAPER.md`
- **Official Executive Memorandum (Markdown):** `MES/docs/blueprint/AI_AGENTIC_OFFICIAL_MEMORANDUM.md`
- **Interactive Slide & Print Deck (HTML):** `MES/docs/blueprint/executive_presentation_agentic_ai.html`
