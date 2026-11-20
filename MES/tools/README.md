# 🛠️ MES Agent Engineering Toolkit

ชุดเครื่องมือเฉพาะทางระดับโรงงาน (Industrial MES Toolkit) สำหรับพัฒนาและทดสอบระบบอัตโนมัติ ออกแบบมาเพื่อปิด Pain Point หลักในงานโรงงาน และทำงานร่วมกับ AI Agent ทุกตัวในโปรเจกต์ได้อย่างไร้รอยต่อ

---

## 🗂️ ภาพรวมเครื่องมือทั้งหมดในชุด (5 เครื่องมือ)

| ลำดับ | เครื่องมือ (Tool) | โฟลเดอร์ | หน้าที่หลัก |
|:---:|:---|:---|:---|
| **1** | **Active Browser Tester** | `tools/ai-tester/` | ควบคุมและทดสอบหน้าเว็บจริงบน Chrome ที่เปิดอยู่ (CDP: 9222) โดยไม่เปิดหน้าต่างใหม่ |
| **2** | **Barcode Simulator** | ใน `tools/ai-tester/` | จำลองการยิงบาร์โค้ดระดับฮาร์ดแวร์ (Keystroke Wedge + Delay + Enter/Tab) |
| **3** | **Network & Offline Simulator** | ใน `tools/ai-tester/` | จำลอง Wi-Fi หลุด (Offline) หรือเน็ตช้า (Slow 3G) เพื่อตรวจ Offline Resilience |
| **4** | **Multi-Device Matrix** | ใน `tools/ai-tester/` | ถ่ายภาพและตรวจ Responsive 3 ขนาดพร้อมกัน (Mobile 375px, Tablet 768px, Terminal 1920px) |
| **5** | **SQL Lock Inspector** | `tools/sql-inspector/` | วิเคราะห์ความเสี่ยง Table Lock, ตรวจสอบ NOLOCK, SELECT *, และ Pagination บน SQL Server 2016 |
| **6** | **Node-RED Machine Mock** | `tools/nodered-mock/` | จำลองการส่งค่า Telemetry เครื่องจักร (แรงดัน, อุณหภูมิ, Alarm) เข้า Node-RED |
| **7** | **IoT Watchdog Monitor** | `tools/iot-monitor/` | ตรวจสอบ Real-time Status ของ Node-RED, MQTT Broker (1883/1884), และ Heartbeat การไหลของข้อมูลเครื่องจักร |

---

## 🌐 การทำงานกับกรณีเปิดหลายแท็บพร้อมกัน (Multi-Tab Multi-Tasking)

ระบบมีระบบ **Smart Tab Locking** ป้องกันไม่ให้แตะผิดแท็บในขณะที่คุณกำลังทำงานขนานกันหลายอย่าง:

```bash
# 1. ดูรายการแท็บที่เปิดอยู่ทั้งหมด พร้อมหมายเลขและ URL
node tools/ai-tester/tester.mjs tabs

# 2. ล็อกเป้าหมายแท็บด้วยคำค้นหา (เช่น คำใน Title หรือ URL)
node tools/ai-tester/tester.mjs inspect --target="store"
node tools/ai-tester/tester.mjs inspect --target="Gemini"

# 3. ล็อกเป้าหมายด้วยหมายเลขแท็บโดยตรง
node tools/ai-tester/tester.mjs inspect --tab=1
```

---

## 📖 คู่มือการเรียกใช้งานแต่ละเครื่องมือ

### 1. Barcode Scanner Simulator
```bash
# จำลองยิงบาร์โค้ดเข้าแท็บปัจจุบัน
node tools/ai-tester/tester.mjs barcode "LOT-2026-9901"

# ส่งต่อด้วยปุ่ม Tab แทน Enter
node tools/ai-tester/tester.mjs barcode "BOX-1234" --suffix="Tab"
```

### 2. Network & Offline Condition
```bash
# ตัดเน็ต (ทดสอบว่ามี Offline Banner ขึ้นไหม)
node tools/ai-tester/tester.mjs network offline

# จำลองเน็ต 3G ช้าๆ ในโกดัง
node tools/ai-tester/tester.mjs network slow3g

# คืนค่าเน็ตปกติ
node tools/ai-tester/tester.mjs network online
```

### 3. Responsive Matrix (Mobile / Tablet / Factory Terminal)
```bash
# บันทึกภาพ 3 ขนาดลงที่ reports/matrix/
node tools/ai-tester/tester.mjs matrix
```

### 4. SQL Server Lock Inspector
```bash
# ตรวจสอบ Query ทันที
node tools/sql-inspector/inspector.mjs "SELECT * FROM TRANSACTIONS_TABLE"

# ตรวจสอบไฟล์ SQL
node tools/sql-inspector/inspector.mjs file "path/to/query.sql"
```

### 5. Node-RED Machine Telemetry Mock
```bash
# จำลองเครื่องปั๊มส่งสถานะ ALARM
node tools/nodered-mock/mock-machine.mjs PRESS_01 ALARM

# จำลองเครื่องเชื่อมส่งสถานะ RUNNING
node tools/nodered-mock/mock-machine.mjs SPOT_WELD_02 RUNNING
```

### 6. IoT Watchdog: Node-RED & MQTT Real-time Monitor
```bash
# ตรวจสอบสุขภาพระบบทันที 1 ครั้ง (One-shot Diagnostic)
node tools/iot-monitor/monitor.mjs

# เปิดโหมด Watchdog เฝ้าระวัง Real-time บน Terminal (อัปเดตทุก 5 วินาที)
node tools/iot-monitor/monitor.mjs --watch
```
