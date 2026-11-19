# 📐 ร่างแผนพัฒนาและวางระบบ Ambient & Proactive AI (Dual-Track Implementation Plan)

> **คำตอบสั้นที่สุด:** โครงสร้างหลักของฝั่งโรงงาน (**Toolbox OS / PHP 8.2 / SQL Server / Node-RED & MQTT / Read-Only AI Tools**) มีความพร้อมอยู่แล้วราว **70%** ส่วนฝั่งที่บ้านสามารถเริ่มด้วย **Self-Hosted n8n (Docker) + Cloud API แบบมีตัวกรองโค้ด** ในงบ **50–300 บาท/เดือน** แผนนี้วางลำดับการพัฒนาเป็น **2 สายคู่ขนาน (Track B บ้าน $\rightarrow$ Track A โรงงาน)** โดยบังคับใช้ **Deterministic Pre-Filter**, **State Persistence**, และ **Human-in-the-Loop (HITL) Gate** เพื่อไม่ให้เกิดปัญหา Token วนลูปหรือระบบพังตอนไม่มีคนเฝ้า

---

## 1. ภาพรวมกลยุทธ์: ทำไมต้องเริ่ม 2 แทร็กคู่ขนาน

| มิติ | Track A: โปรเจ็คโรงงาน (SNC B9 / MES Toolbox OS) | Track B: โปรเจ็คส่วนตัวที่บ้าน (Home Lab & Digital Secretary) |
| :--- | :--- | :--- |
| **เป้าหมายหลัก** | เปลี่ยน AI จาก "กดถาม Morning Brief" เป็น **"ตัวเฝ้าระวังกะกลางคืน + ผู้ช่วยร่างใบงาน"** | สร้าง **"เลขาดิจิทัล 24 ชม. + ตัวเฝ้าสถานะระบบบ้าน/โปรเจ็ค"** |
| **สินทรัพย์ที่มีอยู่แล้ว** | `morningBriefAi.php`, `morningBriefTools.php` (9 Tools: 8 SQL Read-Only + `search_external_web`), `queryProactiveRedFlags()`, `Node-RED` + `MQTT` (`mqtt` package), SQL Server, วงแลน `10.1.x.x` | คอมพิวเตอร์ส่วนตัว / Mini PC (`6,000–12,000 บ.`), Docker, LINE / Telegram, Gmail / Google Calendar |
| **จุดเริ่มต้นที่ปลอดภัยที่สุด** | **Read-Only Event Watcher:** Cron/MQTT จับค่าผิดปกติ $\rightarrow$ ปลุก AI วิเคราะห์เฉพาะเคส $\rightarrow$ ส่ง Alert สรุปก่อน 08:00 น. | **Weekend Sandbox:** Docker + `n8n` Self-Hosted สรุปเมล/นัดหมายเช้า-เย็น + แจ้งเตือนเข้า LINE / Telegram |
| **งบประมาณดำเนินการ** | **0 บ.** ค่าฮาร์ดแวร์ระยะแรก / **150–300 บ./ด.** (Enterprise Cloud Zero-Training) ก่อนพิจารณา Local LLM GPU 24GB (`110k–145k บ.`) | **0–1,500 บ.** (ใช้เครื่องเดิม/VPS) หรือ Mini PC `6k–12k บ.` / ค่า API **50–300 บ./ด.** |
| **กติกาเหล็ก (Safety Gate)** | ห้ามเขียนลงตาราง Production (`dbo.*`) โดยตรงเด็ดขาด ต้องพักรอหัวหน้างานกดอนุมัติใน **Toolbox Agent Inbox** | ห้ามส่งเมลหาบุคคลภายนอก, ลบไฟล์, หรือทำธุรกรรมอัตโนมัติ ต้องมีปุ่ม **Approve / Reject** บนมือถือเสมอ |

---

## 2. สถาปัตยกรรมกลาง 4 ชั้น (4-Stage Ambient Pipeline Architecture)

ทั้งระบบที่โรงงานและที่บ้านจะยึดแบบแผนวิศวกรรมเดียวกันเพื่อตัดปัญหา Token พุ่งและ Alert Fatigue:

1. **Stage 1 — Signal Intake (ตัวรับสัญญาณ + Event ID):**
   - ทุกเหตุการณ์ที่เข้ามา (Cron, Webhook, MQTT Topic, Email, SQL Staging Diff) ต้องสร้าง `event_id` ที่ไม่ซ้ำกัน (Idempotency Key) เพื่อป้องกันการทำงานซ้ำซ้อน
2. **Stage 2 — Deterministic Pre-Filter (โค้ดธรรมดากรองก่อน 80–90%):**
   - ใช้สคริปต์ PHP / Python / Node-RED RBE / SQL ตรวจเกณฑ์ตัวเลข, Regex, รายชื่อผู้ส่ง, และ **Cooldown Window** (เช่น ห้ามเตือนเรื่องเดิมซ้ำภายใน 4 ชั่วโมง)
   - **กฎเหล็ก:** ถ้าสถานการณ์ปกติ ให้จบงานในชั้นนี้ทันที (**ใช้ 0 Token**)
3. **Stage 3 — Isolated Agent Reasoning & Persistence:**
   - เมื่อผ่าน Pre-Filter ค่อยปลุก LLM ใน Session ใหม่แบบ **Stateless** (ไม่แบกประวัติแชตหลายวันมาปนให้เกิด Context Drift)
   - เรียกใช้เฉพาะ Whitelisted Read-Only Tools และบันทึกสถานะงาน (`pending`, `waiting_human`, `approved`, `completed`, `failed`, `halted_circuit_breaker`) ลงฐานข้อมูล
4. **Stage 4 — Tiered Action Lanes (แยกเลนตามความเสี่ยง):**
   - **Lane A — Notify (ความเสี่ยงต่ำ):** สรุปสั้นๆ ส่ง Dashboard / LINE / Telegram พร้อม Cooldown
   - **Lane B — Review / HITL (ความเสี่ยงกลาง-สูง):** ร่าง Action (เช่น ร่างใบแจ้งซ่อม PE, ร่าง Task ใน WSM, ร่างอีเมลตอบลูกค้า) แล้ว **Pause** รอคนกดอนุมัติใน Inbox
   - **Lane C — Auto-Execute (เฉพาะงานอ่าน/สรุปรายงานที่ทดสอบนิ่งแล้ว):** เช่น บันทึก Morning Brief Cache ประจำวันเวลา 07:30 น. โดยไม่แก้ไข Transaction ของโรงงาน

---

## 3. แผนเชิงลึก Track A: โปรเจ็คในโรงงาน (MES / Toolbox OS)

### 3.1 การต่อยอดจากโค้ดเดิมที่มีอยู่จริง
จากการตรวจสอบโค้ดปัจจุบันใน `MES/Toolbox/`:
- **`MES/Toolbox/public/api/ai/morningBriefAi.php`**: ปัจจุบันใช้เป็น On-Demand Executive Briefing (จำกัด `AI_MAX_TOOL_ROUNDS = 4`, `AI_CACHE_TTL_SECONDS = 60`, Fallback Models `gemini-3.5-flash-lite` $\rightarrow$ `gemini-3.5-flash`)
- **`MES/Toolbox/public/api/ai/morningBriefTools.php`**: มี **9 Read-Only Tools** พร้อมใช้งานแล้ว ได้แก่:
  1. `get_daily_report` (ยอดผลิต FG/Hold/Scrap, รายได้, BOM Material, แรงงาน, พลังงาน, EBITDA Proxy)
  2. `get_range_report` (ช่วงหลายวัน + Run Rate Forecast)
  3. `get_model_breakdown` (GP/Margin แยกรายโมเดล)
  4. `get_maintenance_report` (PE Work Orders + Active Unresolved Backlog)
  5. `get_system_audit_logs` (`SYSTEM_LOGS`: Login, `API_ERROR`, `DELETE/UNLOCK/DEACTIVATE`)
  6. `get_inventory_health_report` (เงินจมในสต็อก FG/SEMI/RM/PKG)
  7. `get_wsm_action_items` (Team Planner Overdue/Urgent Tasks)
  8. `get_quality_and_claims_report` (QMS / CAR / Customer Claims)
  9. `search_external_web` (สืบค้นราคากลางโภคภัณฑ์ / คู่มือ Alarm เครื่องจักร)
  - รวมถึงฟังก์ชัน **`queryProactiveRedFlags()`** ที่มีอยู่แล้วใน `morningBriefTools.php`!

### 3.2 Use Cases เป้าหมายสำหรับโรงงาน (เรียงตามความพร้อมและความเสี่ยงต่ำ $\rightarrow$ สูง)

| รหัส | ชื่อ Agent / Watcher | Signal & Pre-Filter (โค้ดธรรมดา) | บทบาท AI & Tools ที่ใช้ | Action Lane & HITL |
| :--- | :--- | :--- | :--- | :--- |
| **F1** | **Night-Shift Red-Flag & Morning Brief Prep** | Cron `07:30 น.` + เช็ค `queryProactiveRedFlags()` และยอดกะดึก | สรุปสาเหตุของแดง/เหลืองด้วย `get_daily_report` + `get_maintenance_report` + `get_quality_and_claims_report` | **Lane A (Auto Cache + Notify):** เตรียม Brief พร้อมแสดงใน Toolbox และส่งสรุปสั้น 3-4 บรรทัดก่อนประชุมเช้า |
| **F2** | **IIoT / MQTT Utility & Machine Anomaly Watcher** | Node-RED / MQTT (`flow.get/set` + RBE Deadband) จับค่ามิเตอร์ไฟ/แก๊สเกิน Baseline หรือเครื่องหยุดซ้ำ > 30 นาที | เรียก `get_maintenance_report` เช็คว่าเปิดใบแจ้งซ่อมแล้วหรือยัง + ค้น Error Code ผ่าน `search_external_web` (ถ้ามีรหัส Alarm) | **Lane B (HITL):** แจ้งเตือนวิศวกร PE พร้อม *"ร่างใบแจ้งซ่อม"* ให้หัวหน้ากะกดอนุมัติ 1 คลิกก่อนบันทึกลง DB |
| **F3** | **Security & System Audit Sentinel** | Cron ทุก 30 นาที ตรวจ `SYSTEM_LOGS` หา `API_ERROR` พุ่งผิดปกติ, `DELETE/UNLOCK` นอกเวลา, หรือ IP นอกวง `10.1.x.x` | เรียก `get_system_audit_logs` จัดกลุ่มพฤติกรรมเสี่ยงและเชื่อมโยงกับผู้ใช้ | **Lane A/B:** แจ้งเตือน Admin ทันที (Cooldown 1 ชม.) + เสนอระงับบัญชีชั่วคราวรอ Admin ยืนยัน |
| **F4** | **Cycle Count & WSM Backlog Escalator** | Cron ทุกวัน 16:00 น. เช็คยอดดิฟ Cycle Count เกินเกณฑ์ และงาน `OVERDUE` ใน Team Planner | เรียก `get_inventory_health_report` + `get_wsm_action_items` จัดลำดับความสำคัญตามมูลค่าเงินจม | **Lane B (HITL):** เสนอร่าง Task ติดตามงานให้ Manager กดอนุมัติเพิ่มเข้า Team Planner |

### 3.3 โครงสร้างฐานข้อมูลที่ต้องเตรียมเพิ่ม (Draft Schema สำหรับ `db_changes.md` เมื่อลงมือสร้างจริง)
- **`dbo.AI_PROCESSED_EVENTS`**: เก็บ `event_id` (PK), `source`, `dedup_hash`, `cooldown_until`, `created_at` — ป้องกัน Cron ซ้อน/Webhook ยิงเบิ้ล
- **`dbo.AI_AMBIENT_JOBS`**: เก็บ `job_id`, `event_id`, `agent_code` (`F1..F4`), `status` (`pending`, `waiting_human`, `approved`, `rejected`, `completed`, `failed`, `halted`), `proposed_action_json`, `tokens_in`, `tokens_out`, `model_used`, `reviewed_by`, `reviewed_at`, `error_message`
- **`dbo.AI_CIRCUIT_BREAKER_CONFIG`**: เก็บ `agent_code`, `max_retries` (ค่าเริ่มต้น `<= 5`), `max_tool_rounds` (`<= 4`), `daily_token_cap`, `is_enabled` (Kill Switch ทันทีหากผิดปกติ)

---

## 4. แผนเชิงลึก Track B: โปรเจ็คส่วนตัวที่บ้าน (Home Lab & Personal Secretary)

### 4.1 โครงสร้างระบบแนะนำ (Home Stack)
- **Orchestrator:** **Self-Hosted `n8n` (Docker)** + **PostgreSQL/SQLite** (เก็บ Workflow State และ Dedup Event ID)
- **Hardware:**
  - *ขั้นเริ่มต้น (0 บ.):* รัน Docker บนคอมพิวเตอร์ที่ใช้งานอยู่เดิม หรือ VPS เล็ก (~200 บ./ด.)
  - *ขั้นสแตนด์บาย 24 ชม. (`6,000–12,000 บ.`):* Mini PC กินไฟต่ำ (~10–15W) เก็บข้อมูลส่วนตัว 100% ในบ้าน ไม่ฝากใคร
- **Notification & HITL Interface:** **Telegram Bot** (รองรับปุ่ม Inline Keyboard `อนุมัติ / แก้ไข / ยกเลิก` ฟรีและเสถียรที่สุด) หรือ **LINE Messaging API**

### 4.2 Use Cases เป้าหมายสำหรับที่บ้าน (Home & Personal Workflows)

| รหัส | ชื่อ Workflow ส่วนตัว | Signal & Pre-Filter (n8n Code / IF Node) | บทบาท AI | Action Lane & HITL |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | **Daily Executive Brief (เช้า 07:30 / ค่ำ 20:00)** | Schedule Trigger ดึง Google Calendar + Gmail Unread (Pre-filter: ตัดเมลโฆษณา/No-Reply ออกด้วยกฎ Header & Sender) | จัดลำดับความสำคัญเมล + สรุปตารางงานพรุ่งนี้ + เตือนงานค้าง | **Lane A (Notify):** ส่งสรุปกระชับเข้า Telegram/LINE วันละ 2 รอบ |
| **H2** | **Smart Email & Message Triage** | Gmail Trigger / Webhook (กรองเฉพาะ VIP หรือหัวข้อสำคัญ + เช็ค `message_id` กันซ้ำ) | อ่านใจความสำคัญ + ร่างคำตอบภาษาไทย/อังกฤษที่สุภาพ | **Lane B (HITL):** ส่งร่างคำตอบเข้า Telegram พร้อมปุ่ม `[ส่งเมลนี้]` `[แก้ไข]` `[ข้าม]` |
| **H3** | **Home Lab / NAS / IoT & Expense Watcher** | Webhook / MQTT ที่บ้าน (เช่น ไฟดับ UPS ทำงาน, Disk ใกล้เต็ม, หรืออัปโหลดสลิป/บิลเข้าโฟลเดอร์) | แยกหมวดหมู่ค่าใช้จ่ายจาก OCR/Text หรือวิเคราะห์ Log สาเหตุเซิร์ฟเวอร์แจ้งเตือน | **Lane A/B:** ลงตารางบันทึก Draft แล้วแจ้งเตือนตรวจสอบบนมือถือ |
| **H4** | **Prompt & HITL Sandbox Lab** | ทดสอบ Pattern ใหม่ๆ (เช่น Circuit Breaker, Indirect Prompt Injection Tagging `<untrusted_data>`) ที่บ้านก่อน | ปรับปรุง System Prompt และ Token Budget | **Synergy:** Workflow ไหนนิ่งและปลอดภัยจากที่บ้าน ค่อยถอด Pattern ไปขึ้นระบบโรงงาน |

---

## 5. แผนปฏิบัติการ 12 สัปดาห์ (Phased Rollout Roadmap)

### ระยะที่ 1: สัปดาห์ที่ 1–2 — Home Sandbox & Safety Foundation (ที่บ้าน)
- [ ] ติดตั้ง Docker + Self-hosted `n8n` บนคอมพิวเตอร์ส่วนตัว / Mini PC
- [ ] สร้าง Workflow **H1 (Morning/Evening Brief)** พร้อม Deterministic Pre-Filter ตัดเมลขยะก่อนเข้า LLM
- [ ] ทดลองสร้างปุ่ม **HITL Approve/Reject** ผ่าน Telegram Webhook (`n8n Wait Node`) สำหรับ **H2**
- [ ] วัดค่า Token จริง 14 วัน เพื่อตรวจสอบเพดานงบ `50–300 บ./ด.`

### ระยะที่ 2: สัปดาห์ที่ 3–6 — Factory Phase 1: Read-Only Event Watcher (โรงงาน MES)
- [ ] ออกแบบและบันทึกตาราง `dbo.AI_PROCESSED_EVENTS`, `dbo.AI_AMBIENT_JOBS`, `dbo.AI_CIRCUIT_BREAKER_CONFIG` ลงใน `db_changes.md`
- [ ] สร้าง Worker เบื้องหลัง (PHP CLI Cron หรือ Python Service ในวงแลน `10.1.x.x`) เรียก `queryProactiveRedFlags()` และ `morningBriefTools.php` แบบ **Read-Only 100%**
- [ ] เปิดใช้งาน **F1 (Night-Shift Brief Prep)** และ **F3 (System Audit Sentinel)** พร้อม Cooldown & Kill Switch
- [ ] สร้างหน้า **Jobs & Heartbeat Monitor** ใน Toolbox (แสดงรอบรันล่าสุด, Tokens ที่ใช้, สถานะ Error)

### ระยะที่ 3: สัปดาห์ที่ 7–10 — Factory Phase 2: Toolbox Agent Inbox & HITL (โรงงาน MES)
- [ ] สร้างหน้า **Agent Inbox** ใน `MES/Toolbox` สำหรับแสดง Action ที่ AI ร่างไว้ (เช่น ร่างใบแจ้งซ่อม PE จาก **F2**, ร่าง Task ติดตาม Cycle Count/WSM จาก **F4**)
- [ ] บังคับใช้การกด **อนุมัติ / แก้ไข / ปฏิเสธ** โดยหัวหน้างานที่มีสิทธิ์ RBAC เท่านั้นก่อนบันทึกเข้า Database จริง
- [ ] เชื่อมต่อ Node-RED / MQTT Deadband Filter เข้ากับ F2 Watcher

### ระยะที่ 4: สัปดาห์ที่ 11–12 — Audit & Scale Decision (ประเมินผล Hybrid vs Local LLM)
- [ ] ตรวจสอบ Log ค่าใช้จ่าย Token ย้อนหลัง 60 วัน และประเมิน Latency / อัตราการอนุมัติของหัวหน้างาน (Human Acceptance Rate)
- [ ] หากปริมาณการวิเคราะห์ Log/เอกสาร/IoT สูงเกินเกณฑ์ Cloud หรือมีความต้องการข้อมูลชั้นความลับ 100% On-Premise จึงพิจารณาอนุมัติงบโหนด **Local LLM (GPU 24GB ~110k–145k บ.)** เพื่อสลับ Endpoint ผ่าน `.env`

---

## 6. เช็กลิสต์ความปลอดภัยก่อนเปิดใช้งานจริง (OWASP & Production Gate)

- [ ] **OWASP LLM01 (Prompt Injection):** ข้อความจากภายนอกทุกชนิด (อีเมล, ข้อความแจ้งซ่อมจากหน้างาน, Webhook payload) ต้องครอบด้วย `<untrusted_data>...</untrusted_data>` ก่อนส่งเข้า LLM เสมอ
- [ ] **OWASP LLM06 (Excessive Agency):** บัญชีฐานข้อมูลสำหรับชั้น Reasoning ต้องเป็น `Read-Only` เท่านั้น แยกบัญชี `Write` ไปอยู่หลัง HITL Approval Endpoint
- [ ] **Idempotency:** ทุก Trigger ต้องเช็ค `event_id` / `dedup_hash` ก่อนทำงาน
- [ ] **Circuit Breaker:** ตั้ง Hard Limit `max_retries <= 5`, `max_tool_rounds <= 4`, Daily Token Cap และปุ่ม Kill Switch ในฐานข้อมูล
- [ ] **Observability:** บังคับ Log ทุกการรัน (`job_id`, `trigger_source`, `tokens_used`, `status`, `error_message`) และแจ้งเตือนทันทีเมื่อ Worker ขาด Heartbeat
