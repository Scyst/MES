# PE System Status & Known Gaps

ตรวจสอบจากฐานข้อมูลจริงและโค้ดเมื่อ **2026-10-06** (ไม่ได้อ้างอิงจากเอกสารเก่า)
สถานะ: **Accepted** = ใช้งานจริงอยู่และผู้ใช้ยอมรับได้ในปัจจุบัน / **Open** = ยังค้างและต้องดำเนินการ

---

## 1. สรุปข้อมูลจริง (Live Data Snapshot)

| ตาราง | จำนวนแถว | หมายเหตุ |
|---|---|---|
| `PE_MACHINES` | 114 | Active 103, ผูก MQTT 27, อยู่บน Map 29, ไม่มี Asset No. 64, ไม่มีรูป 12 |
| `PE_WORK_ORDERS` | 596 | Corrective 539, Improvement 21, Preventive 21, Setup 11, Inspection 4 |
| `PE_DOWNTIME_LOG` | 9 | |
| `PE_LOTO_LOGS` | 0 | ฟีเจอร์มีแล้วแต่ยังไม่เคยใช้งานจริง |
| `PE_PREOP_AUDITS` | 0 | มี Template 46 รายการ แต่ยังไม่มีการตรวจจริง |
| `PE_PREOP_CHECKLIST_TEMPLATE` | 46 | Generic (`machine_type = NULL`) 5 รายการ |
| `PE_IIOT_STATE_LOG` | 71,207 | |
| `MT_ITEMS` / `MT_INVENTORY_ONHAND` | 111 / 92 | อะไหล่ทั้งหมดอยู่ที่ Store PE (ID 1088) 2,486 ชิ้น |

---

## 2. Store PE — เสร็จสมบูรณ์
- คลัง **Store PE** (`location_id = 1088`) สร้างและย้ายสต๊อกเสร็จเมื่อ 2026-10-06 (`TRANSFER_OUT`/`TRANSFER_IN` อย่างละ 92 รายการ)
- คลังเดิม (MT Shop, Under Office B10, Office B10) ไม่มีสต๊อกคงเหลือ

---

## 3. Known Gaps (Accepted)

### 3.1 Work Order ไม่ผูกกับเครื่องจักร — Accepted
- `machine_id` เป็น NULL 504 จาก 596 ใบ (85%)
- ข้อมูลก่อน มิ.ย. 2026 เป็นข้อมูล migrate จากระบบเดิม (`legacy_mt_id`) ทั้งหมด จึงไม่มีรหัสเครื่อง
- ตั้งแต่ ก.ค. 2026 (ไม่มี legacy) ยังไม่ผูกเครื่องประมาณ 50% (ก.ค. 25/50, ส.ค. 27/58, ก.ย. 24/44) เพราะผู้แจ้งพิมพ์ชื่อเครื่องเอง
- **ผลกระทบ:** MTBF/MTTR, ประวัติเครื่อง และ Analytics รายเครื่องคำนวณได้จากข้อมูลส่วนน้อย

### 3.2 อะไหล่ไม่เชื่อมกับ WO — Accepted
- `MT_TRANSACTIONS` ประเภท `ISSUE` 17 รายการ ผูก `pe_wo_id` เพียง 3 รายการ
- WO ที่ปิดแล้ว 543 ใบ ไม่มีรายการอะไหล่ (`parts_used` ว่าง) ทั้งหมด
- **ผลกระทบ:** ต้นทุนอะไหล่ต่อ WO / ต่อเครื่องยังใช้งานไม่ได้

### 3.3 ข้อมูลปิดงานไม่ครบ — Accepted
- WO ที่ Completed 543 ใบ: ไม่มี Root Cause 396, ไม่มี `repair_minutes` 193

### 3.4 Preventive Maintenance (PM) — Accepted
- มี WO ประเภท `Preventive` 21 ใบ (Completed 18) แต่เป็นเพียงประเภทของ WO
- ไม่มีตารางแผน PM, รอบเวลา/ชั่วโมงเดินเครื่อง, วันครบกำหนด หรือการสร้างใบงานอัตโนมัติ
- WO ที่ตรวจพบ `machine_id` เป็น NULL ทั้งหมด
- ข้อมูลที่ใช้ต่อยอดได้: `PE_IIOT_STATE_LOG` (ชั่วโมงเดินเครื่อง), `PE_MACHINE_HISTORY`

### 3.5 ฟีเจอร์ที่มีแล้วแต่ยังไม่มีการใช้งานจริง — Accepted
- E-LOTO (`PE_LOTO_LOGS` = 0), Pre-Op Audit (`PE_PREOP_AUDITS` = 0), Downtime Log (9 แถว)

### 3.6 Safety IoT (Sensor/Bypass) — Accepted (ข้ามตามเดิม)
- `api/safetySensorAPI.php` ไม่มี authentication (comment ในโค้ดระบุให้เพิ่ม secret token) — ต้องปิดช่องนี้ก่อนเปิดใช้งานจริงกับ Node-RED

---

## 4. Open: Safety Hazard & Safety Print Center — Loop ยังไม่ครบ

**เป้าหมาย:** พนักงานสแกน QR ที่ Visual Board หน้าเครื่อง แล้วเลือก "ตรวจเช็คก่อนเปิดเครื่อง" หรือ "แจ้งซ่อม" หรือ "แจ้งเหตุอันตราย" ได้ทันทีด้วยมือถือส่วนตัว

### 4.1 สถานะปัจจุบัน (ตรวจจากโค้ด)

| ขั้นตอน | สถานะ | หลักฐาน |
|---|---|---|
| พิมพ์ Visual Board พร้อม QR | ทำได้ แต่มี QR เดียว | `visual_board_print.php` L267, L333 สร้าง URL ไป `quick_preop.php?machine_code=` เท่านั้น |
| QR → Pre-Op Checklist | ใช้ได้ (ไม่ต้องล็อกอิน) | `quick_preop.php` ใช้ `session_start()` อย่างเดียว ไม่บังคับล็อกอิน |
| QR → แจ้งเหตุอันตราย (Hazard) | **ไม่มี QR** | หน้า `quick_hazard_report.php` มีอยู่ แต่ไม่มีที่ไหนสร้าง QR ชี้ไปหา |
| QR → แจ้งซ่อมทั่วไป | **ไม่มีเส้นทางสาธารณะ** | `peRequest.php` บังคับ `requirePermission(['view_production','view_maintenance'])` ต้องล็อกอิน |
| Hazard แจ้งสำเร็จแล้ว ใครได้รับแจ้ง | **ไม่มี** | `publicHazardAPI.php` INSERT WO อย่างเดียว ไม่เขียน `PE_NOTIFICATIONS` และไม่ส่ง Line Notify |
| การใช้งานจริง | ยังไม่เคยใช้ | `PE_PREOP_AUDITS` = 0; WO ประเภท Safety/Hazard = 1 (น่าจะเป็นข้อมูลทดสอบ) |

### 4.2 ปัญหาด้านความปลอดภัยของ Public Endpoint (ต้องแก้พร้อมกัน)
`api/publicHazardAPI.php` และ `api/preopAPI.php` เปิดให้เรียกได้โดยไม่ล็อกอิน (ตั้งใจ) แต่ยังขาด:
- Rate limiting / กันสแปม — ปัจจุบันใครก็สร้าง WO Critical ได้ไม่จำกัด
- Validate ภาพ base64 (MIME, ขนาด) ก่อน `file_put_contents`
- ตั้ง CORS เป็น `*` (ควรจำกัดเฉพาะ origin ของระบบ)
- `get_preop_logs` ใน `preopAPI.php` เปิดสาธารณะและไม่มี pagination (รั่วประวัติการตรวจทั้งหมดและไม่จำกัดจำนวนแถว)
- ผู้แจ้งเป็น `Anonymous (Quick Report)` — ไม่ระบุตัวตน
- ไม่มี signed/verified link: ใครก็แก้ `machine_code` ใน URL เพื่อแจ้งเครื่องอื่นได้

### 4.3 งานที่ต้องทำ (Open)
1. สร้างหน้า Landing สาธารณะต่อเครื่อง (`machine_code`) แสดงปุ่ม: ตรวจก่อนเปิดเครื่อง / แจ้งซ่อม / แจ้งเหตุอันตราย
2. ให้ Visual Board พิมพ์ QR เดียวชี้ไปหน้า Landing นี้ (หรือ QR แยกตามหน้าที่)
3. เพิ่มเส้นทางแจ้งซ่อมแบบสาธารณะ (ผูก `machine_id` อัตโนมัติจาก QR — ช่วยแก้ข้อ 3.1 ไปในตัว)
4. เมื่อมี Hazard ให้เขียน `PE_NOTIFICATIONS` และส่ง Line Notify ถึง จป./หัวหน้า PE
5. เสริมความปลอดภัย Public API ตามข้อ 4.2
6. ทดสอบ End-to-End บนมือถือจริงผ่าน HTTPS: สแกน → กรอก → เกิด WO ผูกเครื่อง → ปรากฏใน Safety Dashboard

> หมายเหตุ: ข้อ 4.1–4.2 ตรวจจากโค้ดและฐานข้อมูล ยังไม่ได้ทดสอบสแกนบนมือถือจริงบน Production
