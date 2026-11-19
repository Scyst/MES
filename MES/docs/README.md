# 📁 MES Documentation Directory (`MES/docs/`)

สารบัญกลางสำหรับแยกหมวดหมู่เอกสารใน `MES/docs/` ให้เป็นระบบ ไม่ปะปนกับพิมพ์เขียวสถาปัตยกรรมหลักของโรงงาน

---

## 1. [`blueprint/`](./blueprint/) — พิมพ์เขียวสถาปัตยกรรมระบบ MES (System Master Blueprints)
เอกสารอ้างอิงโครงสร้างทางวิศวกรรมของระบบ MES โรงงาน B9 และแผนการย้ายระบบสู่ Toolbox OS เท่านั้น:
- [`MES_SYSTEM_BLUEPRINT.md`](./blueprint/MES_SYSTEM_BLUEPRINT.md) — พิมพ์เขียวแม่บทของระบบ MES และคู่มือส่งมอบงาน
- [`blueprint_graph.json`](./blueprint/blueprint_graph.json) — โครงสร้างกราฟโหนด/เส้นเชื่อมแบบ Machine-Readable สำหรับระบบ Visual Blueprint
- [`snc_b9_mes_blueprint_v2_interactive_digital_twin_architecture_blueprint.html`](./blueprint/snc_b9_mes_blueprint_v2_interactive_digital_twin_architecture_blueprint.html) — ผัง Digital Twin Architecture Blueprint แบบ Interactive
- [`MES_LEGACY_VS_TOOLBOX_GAP_ANALYSIS.md`](./blueprint/MES_LEGACY_VS_TOOLBOX_GAP_ANALYSIS.md) — ตารางเปรียบเทียบและติดตามสถานะการพอร์ตโมดูล Legacy $\rightarrow$ Toolbox

---

## 2. [`ai-strategy/`](./ai-strategy/) — ยุทธศาสตร์ AI และเอกสารนำเสนอผู้บริหาร (Executive AI Briefings)
ชุดเอกสารสำหรับสื่อสารกับหัวหน้าฝ่ายและนำเสนอคณะกรรมการบริหาร (AI ธรรมดา vs AI Agent vs Agentic AI):
- [`AI_AGENTIC_OFFICIAL_MEMORANDUM.md`](./ai-strategy/AI_AGENTIC_OFFICIAL_MEMORANDUM.md) — บันทึกข้อความทางการ (Memorandum) เสนอหัวหน้าฝ่ายและประธานกรรมการบริหาร
- [`AI_AGENTIC_EXECUTIVE_WHITEPAPER.md`](./ai-strategy/AI_AGENTIC_EXECUTIVE_WHITEPAPER.md) — เอกสารเชิงกลยุทธ์และวิศวกรรมฉบับเต็ม (Executive Whitepaper)
- [`executive_presentation_agentic_ai.html`](./ai-strategy/executive_presentation_agentic_ai.html) — สไลด์พรีเซนเทชันผู้บริหาร 10 หน้า (รองรับโหมดฉายสไลด์และพิมพ์ PDF แนวนอน)

---

## 3. [`ambient-ai/`](./ambient-ai/) — แผนพัฒนาและคู่มือสถาปัตยกรรม Ambient & Proactive AI
เอกสารเชิงปฏิบัติการสำหรับออกแบบและสร้าง AI ที่ทำงานอัตโนมัติจากเหตุการณ์ (Event-Driven 24/7) ทั้งฝั่งโรงงาน MES และใช้ส่วนตัวที่บ้าน:
- [`ambient_proactive_ai_agent_guide.html`](./ambient-ai/ambient_proactive_ai_agent_guide.html) — คู่มือวิเคราะห์เชิงวิศวกรรม: กลไก, จุดตายหน้างาน, ต้นทุน และ OWASP Security
- [`AMBIENT_AI_DUAL_IMPLEMENTATION_PLAN.md`](./ambient-ai/AMBIENT_AI_DUAL_IMPLEMENTATION_PLAN.md) — ร่างแผนปฏิบัติการแบบคู่ขนาน (Track A: โรงงาน MES + Track B: ส่วนตัวที่บ้าน) พร้อม Checklist และโครงสร้าง DB/API
- [`ambient_ai_dual_implementation_plan.html`](./ambient-ai/ambient_ai_dual_implementation_plan.html) — เอกสารร่างแผนปฏิบัติการฉบับอ่าน/นำเสนอ (Swiss Utilitarian Editorial HTML + Inline SVG Architecture & Roadmap)
