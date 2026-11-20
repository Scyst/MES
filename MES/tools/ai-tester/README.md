# 🧪 MES Active Browser AI Tester

ระบบ AI Test Automation ความแม่นยำสูง ที่เชื่อมต่อเข้ากับ **Google Chrome ที่คุณกำลังเปิดใช้งานอยู่จริง** ผ่าน Chrome DevTools Protocol (CDP: Port 9222) โดย**ไม่เปิดหน้าต่างใหม่** ไม่หลุด Session และไม่สูญเสียสถานะการล็อกอิน

---

## 🌟 จุดเด่น
1. **ไม่เปิดหน้าต่างใหม่:** เชื่อมต่อเข้ากับแท็บที่คุณกำลังดูอยู่สดๆ
2. **ความแม่นยำระดับ 100% (High Accuracy):** ใช้ **ARIA Accessibility Snapshot** ผสานกับ Playwright Locator ช่วยระบุ Role, Button, Label, Input ได้แม่นยำ ไม่หลงพิกัดแบบการคลิกภาพ
3. **เห็นการทำงานสดๆ (Live Execution):** เมาส์คลิก พิมพ์ และตรวจสอบผลบนหน้าจอของคุณแบบ Real-time
4. **รายงานผลแบบ Visual HTML:** มี Before/After Screenshot และบันทึกผลการทดสอบทุก Step

---

## 🚀 วิธีการใช้งาน

### วิธีที่ 1: สั่งงานผ่าน AI Agent (เช่น คุยกับ Antigravity ในนี้ได้เลย)
คุณสามารถพิมพ์บอก AI ในห้องแชทได้ทันที เช่น:
- *"ช่วยตรวจสอบหน้าเว็บที่เปิดอยู่ให้หน่อยว่ามีปุ่มอะไรบ้าง"*
- *"ช่วยทดสอบคลิกที่ 'แชทใหม่' แล้วดูว่ากล่องข้อความขึ้นไหม"*
- *"ทดสอบกรอกฟอร์มในระบบ MES หน้าปัจจุบันให้หน่อย"*
AI จะเรียกใช้ `tools/ai-tester/agent-bridge.mjs` เข้าไปตรวจและสั่งงานบนหน้าจอคุณโดยตรง

---

### วิธีที่ 2: ตรวจสอบและรันเองผ่าน Command Line

#### 1. ตรวจสอบสถานะหน้าจอที่เปิดอยู่ (Inspect Active Page):
```bash
cd tools/ai-tester
node tester.mjs inspect
```
คำสั่งนี้จะอ่านชื่อหน้าเว็บ, URL, บันทึกภาพหน้าจอปัจจุบัน และแสดง Element โครงสร้างหน้าจอให้คุณเห็น

#### 2. รันชุดทดสอบอัตโนมัติ (Run Test Plan):
```bash
cd tools/ai-tester
node tester.mjs run sample-test.json
```
เมื่อรันเสร็จ ระบบจะสร้างรายงานผลการทดสอบที่:
`tools/ai-tester/reports/latest-report.html` (เปิดดูใน Browser ได้ทันที)

---

## 📝 รูปแบบไฟล์ชุดทดสอบ (Test Plan JSON)

ตัวอย่างไฟล์ `test-plan.json`:
```json
{
  "name": "ทดสอบฟอร์มค้นหาข้อมูล",
  "steps": [
    { "action": "assert", "target": "ระบบรายงานการผลิต", "expected": true },
    { "action": "fill", "target": "ค้นหา", "value": "Job-2026" },
    { "action": "click", "target": "ปุ่มค้นหา" },
    { "action": "wait", "value": 1000 },
    { "action": "assert", "target": "พบข้อมูล 1 รายการ", "expected": true }
  ]
}
```

### Action ที่รองรับ:
* `click`: คลิกปุ่ม, ลิงก์, แท็บ หรือข้อความ
* `fill` / `type`: พิมพ์ข้อความลงใน Input, Textarea
* `press`: กดปุ่มคีย์บอร์ด เช่น `Enter`, `Tab`, `Escape`
* `wait`: หน่วงเวลา (หน่วยมิลลิวินาที เช่น `1000`)
* `assert` / `verify`: ตรวจสอบว่ามีข้อความ/ปุ่ม แสดงอยู่บนหน้าจอหรือไม่ (`expected: true/false`)
* `evaluate`: รัน JavaScript ใน Console ของหน้าเว็บ
