# MES PE Module - Future Ideas & Known Gaps

เอกสารนี้รวบรวมไอเดีย ฟีเจอร์ที่ยังไม่ได้พัฒนา (Future Sandbox) และช่องโหว่ (Known Gaps) ที่ดึงมาจาก Roadmap เก่าที่ไม่ได้ใช้งานแล้ว เพื่อใช้เป็นแหล่งอ้างอิงในการพัฒนาต่อยอดในอนาคต

---

## 🔮 1. IIoT & Map Builder (Advanced Features)
- **Time-Machine / Historical Playback (ระบบเล่นย้อนหลัง):** สร้างแถบเวลา (Timeline slider) ด้านล่างแผนที่ เพื่อดูการทำงานย้อนหลังของเครื่องจักร (RCA).
- **Predictive Maintenance Overlays:** ทำระบบพยากรณ์ล่วงหน้าด้วย AI/ML และไฮไลต์เครื่องจักรที่มีโอกาสเสียบนแผนที่ 2D.
- **Remote Control & SCADA Integration:** พัฒนาแผนที่ให้สั่งการเครื่องจักร (Start, Stop, Reset) ไปยัง PLC ผ่าน OPC-UA/MQTT ได้.
- **Logistics Pathfinding:** แสดงตำแหน่งรถโฟล์คลิฟต์/AGV บนแผนที่ และคำนวณเส้นทางเบี่ยงเมื่อมีเครื่องจักรขวาง.
- **AR Maintenance Mode:** สร้างแอปให้ช่างซ่อมใช้มือถือ/แท็บเล็ตส่องไปที่เครื่องจักรเพื่อดูข้อมูล IIoT และ Alert แบบ AR.
- **3D Digital Twin:** ยกเครื่อง 2D Map ให้กลายเป็นแผนที่ 3D ด้วย WebGL (Three.js/Babylon.js).

## 🛡️ 2. Safety System & LOTO
- **LOTO Workflow Enhancements:** บังคับใส่ PIN/รหัสผ่านก่อนปลดล็อก LOTO และส่ง Line Notify เมื่อล็อกเครื่องจักรสำคัญ.
- **Safety IoT Integration:** ลิงก์เซนเซอร์ความปลอดภัย (Light Curtain, E-Stop) เข้ากับ Node-RED และแจ้งเตือนเมื่อเซนเซอร์ถูก Bypass ขณะเครื่องเดิน.
- **Advanced Safety Analytics:** สร้างรีพอร์ตคำนวณ Safety MTTR, Pre-Op Compliance Report และระบบ Export เป็น Excel/PDF.

## 📱 3. QR Code Public Loop (Hazard & Quick Report)
- **Landing Page เครื่องจักร:** สร้างหน้า Public ให้นักสแกน QR แล้วเจอเมนู (แจ้งซ่อม / ตรวจเครื่องก่อนเริ่ม / แจ้งเหตุอันตราย) จบในหน้าเดียว.
- **Public Repair Request:** เปิดให้สแกน QR หน้าเครื่องแล้วกดแจ้งซ่อมได้โดยไม่ต้อง Log-in (ระบบจะดึง `machine_id` ให้อัตโนมัติ).
- **Public API Security:** 
  - เพิ่ม Rate Limiting ป้องกัน Spam
  - Validate ภาพ base64 ก่อนอัปโหลด (ป้องกันไฟล์อันตราย)
  - ตั้ง CORS policy ให้เข้มงวด
  - เพิ่ม Signed/Verified link เพื่อป้องกันการแก้ `machine_code` ใน URL.

## 🔧 4. Maintenance & Spare Parts (Gaps)
- **Preventive Maintenance (PM) Auto-generation:** สร้างตารางแผน PM ตามรอบเวลา/ชั่วโมงเดินเครื่อง และให้ระบบสร้างใบงาน (Work Order) อัตโนมัติเมื่อถึงรอบ.
- **Spare Parts linking to Work Orders:** ปัจจุบันตอนตัดสต๊อก (ISSUE) ยังไม่ผูกกับใบงาน (WO) อย่างสมบูรณ์ ทำให้คำนวณต้นทุนอะไหล่ต่อใบงาน / ต่อเครื่องจักรยังไม่แม่นยำ ต้องปรับปรุง flow การตัดสต๊อกให้ผูกกับใบงานเสมอ.
- **Machine Binding on Work Orders:** ใบงานแจ้งซ่อมจำนวนมากไม่มี `machine_id` เพราะให้ผู้ใช้พิมพ์เอง ต้องบังคับผูกรหัสเครื่องจักรทุกครั้งเพื่อให้วิเคราะห์ข้อมูล (MTBF/MTTR) ได้.
