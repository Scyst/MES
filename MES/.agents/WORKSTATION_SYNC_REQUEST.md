# 🔄 Workstation ↔ Home Environment Sync & Architecture Handoff

> **Created At:** 2026-10-29 20:40 (Home Session)  
> **Target Audience:** Daytime Primary Agent (Workstation `E:\MES\MES\MES`) & Night-Shift Agents (Argon / Flash)

---

## 🚨 1. ACTION REQUIRED BY WORKSTATION AGENT (เครื่องที่ทำงาน)

จากการตรวจสอบที่เครื่องบ้าน (`C:\Users\USER\Desktop\Project\MES`) พบว่าสกิลและกฎใน `MES/.agents/` ถูกซิงค์ลงมาเรียบร้อยแล้ว แต่ **Custom MCP Server (`mes-custom-mcp`)** และสกิล Global บางส่วนยังไม่ถูกซิงค์ผ่าน Git เนื่องจากติด `.gitignore`

**คำสั่งสำหรับ Agent เครื่องหลักที่ทำงาน (เมื่อผู้ใช้เปิดงานตอนเช้า):**
1. **ปลดล็อก `mcp_server/` ใน `MES/.gitignore`:**
   - ในไฟล์ `MES/.gitignore` บรรทัดที่ 8 มีคำว่า `mcp_server/` อยู่ ทำให้โฟลเดอร์ `MES/mcp_server/index.mjs` ไม่ถูกส่งขึ้น Git
   - กรุณาตรวจสอบว่าใน `MES/mcp_server/` มีรหัสผ่านที่ควรแยกเข้า `.env` หรือไม่ หากปลอดภัยหรือใช้ `.env` อยู่แล้ว ให้เอา `mcp_server/` ออกจาก `MES/.gitignore` (หรือเพิ่ม `!mcp_server/index.mjs` และ `!mcp_server/package.json`) แล้วทำการ `git add` และ `git push` ขึ้นมา
2. **ตรวจสอบ Global Skills บนเครื่องที่ทำงาน:**
   - ปัจจุบันใน `MES/.agents/skills/` มี 3 สกิลคือ:
     - `backend_qa` (`mes-backend-qa`)
     - `frontend_qa` (`mes-frontend-qa`)
     - `planner_agent_api` (`planner-agent-api`)
   - หากในเครื่องที่ทำงานมีสกิลเฉพาะของโปรเจ็ค MES เก็บไว้ที่ `C:\Users\<User>\.gemini\config\skills\` หรือในโฟลเดอร์อื่นที่ยังไม่ได้อยู่ใน `MES/.agents/skills/` กรุณาคัดลอกมาไว้ใน `MES/.agents/skills/` แล้ว Push ขึ้น Git เพื่อให้เครื่องที่บ้านดึงไปใช้งานได้ครบ 100%

---

## ✅ 2. สิ่งที่เครื่องที่บ้าน (Home Agent) ตั้งค่าและเตรียมพร้อมไว้แล้ว

1. **Root-Level Skill & Rule Discovery (`.agents/skills.json` & `AGENTS.md`):**
   - สร้างไฟล์ `.agents/skills.json` ที่ระดับ Root ของ Repository เพื่อชี้ไปยัง `MES/.agents/skills` ทำให้ไม่ว่าคุณจะเปิด Workspace ที่โฟลเดอร์นอก (`MES`) หรือโฟลเดอร์ใน (`MES/MES`) ตัว Agent จะมองเห็นสกิลทั้งหมดโดยอัตโนมัติ
   - สร้างไฟล์ `AGENTS.md` ที่ระดับ Root เพื่อเชื่อมโยงกฎเหล็กทั้งหมดจาก `MES/.agents/AGENTS.md`
2. **Global MCP Configuration (`C:\Users\USER\.gemini\config\mcp_config.json`):**
   - ตั้งค่า `mcp_config.json` บนเครื่องที่บ้านให้ชี้ Path มาที่ `C:/Users/USER/Desktop/Project/MES/MES` แทน `e:/MES/MES/MES` เรียบร้อยแล้ว (รอเพียงไฟล์ `mcp_server/index.mjs` จากเครื่องที่ทำงาน และ VPN/LAN สำหรับเชื่อม DB ภายในโรงงานหากต้องการต่อ DB ตรง)

---

## 🏗️ 3. Master Plan สำหรับกะกลางคืน (Night-Shift Architecture Migration) & Argon ↔ Flash Handoff

เพื่อรองรับการสลับโมเดลระหว่าง **Gemini 4 Argon** (วางแผน/วิเคราะห์เชิงลึก) และ **Flash** (ลงมือ Refactor จำนวนมากอย่างรวดเร็วเมื่อโควต้า Argon ใกล้หมด) ให้ยึดแนวทางดังนี้:

### เป้าหมายสถาปัตยกรรมใหม่ (Target System Architecture)
- **Unified Modular Frontend (`MES/mes-v2`):**
  - ใช้ React 18 + Vite + TailwindCSS + HashRouter (`#/`) โครงสร้าง `src/modules/<ModuleName>/` และ `src/shared/`
  - ค่อยๆ พอร์ตโมดูลจาก Legacy PHP (`MES/page/*`) และรวมฟีเจอร์จาก Prototype เดิม (`MES/mes-toolbox`) เข้ามาไว้ใน `mes-v2` เป็นหนึ่งเดียว
- **Single Source of Truth Backend API (`MES/page/<module>/api/*.php`):**
  - เลิกคัดลอกไฟล์ API แยกไปไว้ในหลายโฟลเดอร์ ให้ทุก Frontend เรียกใช้ REST/JSON API ที่ `MES/page/<module>/api/` ร่วมกัน โดยใช้ Session & PBAC Permission (`check_auth.php`) ชุดเดียวกัน
- **Zero-Disruption Guarantee (ห้ามกระทบงานกลางวัน):**
  - ก่อนเริ่มงานกะกลางคืน ต้องรัน `git pull origin main --rebase` และอ่าน `MES/.agents/sync_board/<YYYY-MM-DD>.md` ของวันนั้นเสมอ เพื่อดูว่าตอนกลางวันผู้ใช้กำลังแก้โมดูลไหนอยู่ และหลีกเลี่ยงการแก้ทับไฟล์เดียวกัน

### ขั้นตอนการทำงานเมื่อเปลี่ยนจาก Argon เป็น Flash
1. เมื่อสลับเป็น **Flash** ให้โมเดลอ่านไฟล์นี้ (`MES/.agents/WORKSTATION_SYNC_REQUEST.md`) และ `MES/.agents/sync_board/handoff.md` เป็นอันดับแรก
2. ทำงานทีละ Task ย่อยตาม Checklist ที่ Argon วางไว้ โดยทดสอบ (`npm run build` หรือ `php -l`) ทุกครั้งก่อน Commit
3. อัปเดตความคืบหน้าแบบ Non-destructive (`[x]`) ลงใน Handoff และ Sync Board เสมอ

