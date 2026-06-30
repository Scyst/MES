# แผนการกู้คืนระบบไฟล์สำหรับ IT (Disaster Recovery Plan)

เอกสารนี้รวบรวม **โครงสร้างการเก็บไฟล์ของทุกโมดูลในระบบ MES** เพื่อให้ทีม IT สามารถนำไฟล์จาก Backup ที่เป็นโครงสร้างเก่า (โฟลเดอร์ `page/upload`) กลับมาวางในโครงสร้างใหม่ได้อย่างถูกต้อง 100% เพื่อให้ฐานข้อมูลสามารถลิงก์รูปภาพและไฟล์ต่างๆ ได้สมบูรณ์

> [!IMPORTANT]
> ระบบส่วนใหญ่ถูกย้ายโฟลเดอร์เก็บไฟล์ออกมาไว้ที่ระดับนอกสุดคือ `MES/uploads/` แล้ว (ยกเว้นบางโมดูล)
> หาก IT รัน Restore ไฟล์กลับมา ไฟล์จะไปกองอยู่ที่ตำแหน่งเดิมในอดีต (เช่น `MES/page/upload/...`)
> หน้าที่ของเราคือ **นำไฟล์ที่ถูก Restore มา ย้ายไปยัง "โฟลเดอร์ปัจจุบัน"** ตามตารางด้านล่างนี้ครับ

## ตารางสรุปการจับคู่โฟลเดอร์ (Folder Mapping)

| ชื่อระบบ (Module) | 📌 โฟลเดอร์ต้นทาง (หลัง IT Restore) | 🎯 โฟลเดอร์เป้าหมาย (ที่ต้องย้ายไฟล์ไปใส่) | รูปแบบที่เก็บใน Database |
| :--- | :--- | :--- | :--- |
| **Document Center** | `MES/page/upload/...` หรือที่เก็บเดิม | `MES/uploads/documentCenter/` | เก็บแค่ชื่อไฟล์เพียวๆ (เช่น `A000245_123.pdf`) |
| **Loading Report** (รายงานโหลดตู้) | โฟลเดอร์เดิมของ Loading | `MES/uploads/loading_reports/` | เก็บเป็น `../../uploads/loading_reports/ไฟล์.jpg` |
| **PE / Work Order** (ใบแจ้งซ่อม PE) | โฟลเดอร์เดิมของ PE | `MES/uploads/pe_images/` | เก็บเป็น `uploads/pe_images/ไฟล์.jpg` |
| **QMS / NCR / CAR** (เคลมปัญหาคุณภาพ) | โฟลเดอร์เดิมของ QMS | `MES/uploads/qms_files/` | เก็บเป็น `uploads/qms_files/ไฟล์.jpg` |
| **Store Management** (ภาพสินค้า/อะไหล่) | โฟลเดอร์เดิมของ Store | `MES/uploads/items/` | เก็บแค่ชื่อไฟล์เพียวๆ (เช่น `item1_456.jpg`) |
| **Maintenance** (ระบบซ่อมบำรุงเก่า) | `MES/page/uploads/maintenance/` | ใช้อยู่ที่เดิมคือ `MES/page/uploads/maintenance/` | เก็บเป็น `../uploads/maintenance/ไฟล์.jpg` |
| **Estate CRM** (ระบบ CRM) | `estate-crm/...` โฟลเดอร์เดิม | `MES/estate-crm/uploads/crm/` | เก็บเป็น `uploads/crm/ไฟล์.jpg` |

---

## 🛠️ ขั้นตอนปฏิบัติงานของทีม IT (Action Plan)

1. **ดำเนินการ Restore Backup** 
   ให้ IT ทำการ Extract ไฟล์ Backup เฉพาะโฟลเดอร์ที่เก็บรูป/เอกสาร (ไม่ต้อง Restore Database และห้ามทับไฟล์โค้ดของ Web App)

2. **ย้ายไฟล์เข้าโฟลเดอร์ใหม่ (Migration)**
   - นำไฟล์ทั้งหมดของ **Document Center** ไปวางที่ `MES/uploads/documentCenter/`
   - นำไฟล์รูปภาพ **โหลดตู้** ไปวางที่ `MES/uploads/loading_reports/`
   - นำไฟล์รูปภาพ **แจ้งซ่อม (PE)** ไปวางที่ `MES/uploads/pe_images/`
   - นำไฟล์เอกสาร **QMS/NCR** ไปวางที่ `MES/uploads/qms_files/`
   - นำไฟล์รูป **สินค้าในสโตร์** ไปวางที่ `MES/uploads/items/`

3. **ตรวจสอบ Permission โฟลเดอร์**
   > [!WARNING]
   > สำคัญมาก! หลังจากย้ายไฟล์เข้าโฟลเดอร์เป้าหมายทั้งหมดแล้ว ต้องให้ IT ทำการ Set Permission ให้โฟลเดอร์ `MES/uploads/` ทั้งหมดยอมให้ Web Server (เช่น IIS_IUSRS หรือ www-data) สามารถ **Read/Write/Modify** ได้ ไม่งั้นไฟล์เก่าจะเปิดอ่านไม่ได้ และจะอัพโหลดไฟล์ใหม่ไม่ได้ครับ

4. **ตรวจสอบระบบ**
   ลองล็อกอินเข้าระบบ แล้วเปิดเมนูต่างๆ ที่กล่าวมาข้างต้น ถ้าเปิดรูป/โหลดไฟล์ได้ ถือว่าการกู้คืนเสร็จสมบูรณ์ 100% ครับ
