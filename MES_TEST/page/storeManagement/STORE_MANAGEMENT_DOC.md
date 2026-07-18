# Store Management Module Documentation

## 1. ภาพรวมของระบบ (Overview)
ระบบ **Store Management** เป็นโมดูลหลักใน MES ที่ใช้สำหรับจัดการคลังสินค้าและวัตถุดิบ (Warehouse & Inventory Management) โดยครอบคลุมตั้งแต่การรับเข้าวัตถุดิบ (Receiving), การจัดเก็บ (Storage/Onhand), การเบิกจ่าย (Requisitions), การทำ Cycle Count, และการจัดการ K2 PR/Scrap ระบบนี้ถูกออกแบบมาเพื่อทำงานร่วมกับ Barcode/QR Code scanner สำหรับระบบ RM Serial Tags เพื่อความแม่นยำในการติดตาม (Traceability)

## 2. โครงสร้างไฟล์ (File Structure)
ระบบถูกแบ่งออกเป็นส่วน Frontend (UI & Logic) และ Backend (API) ที่ชัดเจน:

### 2.1 หน้าจอหลัก (Pages / UI)
*   **`storeDashboard.php`**: Dashboard หลักสำหรับ Store (KDS - Kitchen Display System สำหรับ Store) แสดงภาพรวมสถานะการเบิกจ่าย, คิวออเดอร์, และ Analytics (IRA, Turnover)
*   **`inventoryDashboard.php`**: Dashboard แสดงข้อมูลสินค้าคงคลังเชิงลึก (Onhand quantity, มูลค่าคงคลัง, Stock Out)
*   **`rmReceiving.php`**: หน้าจอสำหรับรับเข้าวัตถุดิบ (RM), สร้าง Pallet, พิมพ์ Serial Tags และรับของเข้าคลัง
*   **`materialReq.php`**: หน้าจอสำหรับฝ่ายผลิต (หรือผู้เบิก) ในการสร้างใบเบิกสินค้า (Store Requests) ไปยังคลังสินค้า
*   **`storeRequest.php`**: หน้าจอสำหรับเจ้าหน้าที่คลังสินค้าในการจัดการ, อนุมัติ, และตัดจ่าย (Issue) ของตามใบเบิก
*   **`stockTransaction.php`**: หน้าจอแสดงประวัติการเคลื่อนไหวของ Stock (Stock Ledger / In-Out History)
*   **`warehouse_operations.php`**: หน้าจอสำหรับจัดการงานคลังสินค้าอื่นๆ เช่น การโอนย้าย (Transfers), แจ้ง Scrap, และ Cycle Count

### 2.2 สคริปต์การทำงาน (Scripts / Frontend Logic)
เก็บอยู่ในโฟลเดอร์ `script/` ทำหน้าที่เชื่อมต่อ UI กับ API
*   **`storeDashboard.js`**, **`inventoryDashboard.js`**, **`rmReceiving.js`**, **`materialReq.js`**, **`storeRequest.js`**, **`stockLedger.js`**, **`warehouse_ops.js`**
*   **`storeCommon.js`**: ฟังก์ชันช่วยเหลือที่ใช้ร่วมกันในหลายๆ หน้า
*   **`storeScanner.js`**: จัดการการสแกน Barcode/QR Code สำหรับการรับ-จ่าย Tags
*   **`html2canvas.min.js`**: ไลบรารีสำหรับแปลง HTML เป็นรูปภาพ (มักใช้สำหรับการปริ้นท์หรือ Export หน้าจอ/Tags)

### 2.3 Backend API
*   **`api/api_store.php`**: เป็น Controller หลักเพียงไฟล์เดียวสำหรับโมดูล Store ทั้งหมด รองรับ Request ผ่านตัวแปร `action` 

---

## 3. โครงสร้างฐานข้อมูล (Database Structure & Relationships)
ระบบใช้ตารางหลายตารางเชื่อมโยงกัน เพื่อติดตามการเคลื่อนไหวของสินค้าอย่างละเอียด:

### 3.1 ฐานข้อมูลหลักที่เกี่ยวข้อง (Core Tables)
*   **`ITEMS`**: ตาราง Master เก็บข้อมูลสินค้า (sap_no, part_no, part_description)
*   **`LOCATIONS`**: ตาราง Master สถานที่/คลัง (location_id, location_type = 'STORE')
*   **`USERS`**: ตารางผู้ใช้งาน สำหรับเก็บผู้สร้างรายการ (requester_id, issuer_id)

### 3.2 ระบบสต๊อกและการเคลื่อนไหว (Inventory & Transactions)
*   **`INVENTORY_ONHAND`**: เก็บจำนวนคงเหลือของแต่ละ Item ในแต่ละ Location (`parameter_id`, `location_id`, `quantity`)
*   **`STOCK_TRANSACTIONS`**: บันทึกประวัติ In/Out (Ledger) ของสต๊อกรวม (`parameter_id`, `quantity`, `transaction_type`, `from_location_id`)
*   **`INVENTORY_CYCLE_COUNTS`**: ตารางสำหรับการนับสต๊อกเพื่อปรับปรุงยอด (Cycle Count)

### 3.3 ระบบการเบิกจ่าย (Requisitions / Store Requests)
*   **`STORE_REQUISITIONS`**: หัวบิลใบเบิก (id, req_number, status, requester_id, issuer_id)
*   **`STORE_REQUISITION_ITEMS`**: รายการสินค้าที่เบิก (req_id, item_code, qty_requested, qty_issued)

### 3.4 ระบบจัดการ Serial Tag (Traceability)
*   **`RM_SERIAL_TAGS`**: ตารางเก็บรายละเอียดย่อยเป็นราย Tag/Pallet (serial_no, item_id, location_id, current_qty, status)
*   **`TAG_TRANSACTIONS`**: ประวัติการเคลื่อนไหวของแต่ละ Tag (serial_no, transaction_type, quantity_changed)
*   **`DELETED_SERIAL_TAGS`**: เก็บประวัติ Tag ที่ถูกลบเพื่อ Audit

### 3.5 ระบบคลังสินค้าอื่นๆ (Other Warehouse Ops)
*   **`STOCK_TRANSFER_ORDERS`**: รายการโอนย้ายสินค้าระหว่างคลัง
*   **`STORE_K2_REQUESTS`**: ระบบเชื่อมต่อคำขอซื้อ/PR ไปยังระบบ K2
*   **`PRODUCTION_JOBS`** & **`PRODUCT_BOM`**: (มีการเชื่อมโยง) เพื่อดึงข้อมูลว่า Production มีแผนใช้วัตถุดิบอะไรบ้าง (Fulfillment/Plan)

---

## 4. API Endpoints ที่สำคัญ (api_store.php actions)
การสื่อสารกับระบบจะใช้การส่ง POST/GET โดยระบุพารามิเตอร์ `action` ไปที่ `api_store.php`:

### การเบิกจ่าย (Order & Fulfillment)
*   `get_orders`, `get_order_details`: ดูรายการใบเบิกทั้งหมดและรายละเอียด
*   `accept_order`: คลังสินค้ารับทราบเพื่อเตรียมของ
*   `confirm_issue`: คลังสินค้าทำการจ่ายของ (พร้อมหัก Tag/Stock)
*   `submit_requisition`: ฝ่ายผลิตสร้างใบเบิกใหม่

### ระบบ Serial Tags (RM Receiving)
*   `get_available_tags_for_item`: ค้นหา Tag ที่พร้อมสำหรับเบิกจ่าย
*   `issue_rm` / `issue_selected_tags`: จ่ายวัตถุดิบเป็นราย Tag
*   `force_issue_tag`: บังคับจ่าย Tag กรณีพิเศษ
*   `receive_scanned_tag` / `bulk_receive_tags`: รับของเข้าคลัง (สร้าง Tag)
*   `import_excel`: นำเข้าข้อมูลวัตถุดิบผ่าน Excel
*   `delete_tag`, `edit_tag`: จัดการข้อมูล Tag
*   `update_print_status`: อัปเดตสถานะการพิมพ์ของ Label

### สต๊อกและการจัดการคลัง (Stock & Operations)
*   `get_inventory_dashboard`: ดึงข้อมูลสรุป Onhand / Stock out
*   `get_stock_ledger`: ดึงข้อมูล Statement / ประวัติ In-out ของไอเท็ม
*   `create_transfer_request`, `process_transfer_request`: จัดการการย้ายของระหว่าง Location
*   `submit_cycle_count`, `approve_cycle_count`: ระบบนับสต๊อกปรับยอด

### K2 และการจัดซื้อ (Purchasing)
*   `get_k2_summary`, `get_k2_item_details`, `submit_k2_pr`: เชื่อมโยง PR ไป K2

---

## 5. การพัฒนาและข้อควรระวัง (Notes for Future Development)
1.  **Security (CSRF):** การทำงานที่มีการเขียนข้อมูล (Write actions) เช่น การรับ-จ่าย-ลบ จะถูกป้องกันด้วย CSRF Token ตรวจสอบ Array ของ `$writeActions` ในบรรทัดต้นๆ ของ `api_store.php` เสมอหากมีการเพิ่ม Action ใหม่
2.  **Concurrency / Race Conditions:** ในกระบวนการจ่ายของ (`confirm_issue`) มีการใช้ `UPDLOCK, ROWLOCK` เพื่อป้องกันปัญหาการเบิกจ่ายพร้อมกันซ้อนทับกัน ห้ามลบโครงสร้าง Transaction (`$pdo->beginTransaction()`) ออกเด็ดขาด
3.  **Data Integrity:** การลดสต๊อก (`confirm_issue` หรือ `force_issue_tag`) จะต้องอัปเดต 3 ที่เสมอ:
    *   ลด `current_qty` ในตาราง `RM_SERIAL_TAGS`
    *   สร้าง Log ในตาราง `TAG_TRANSACTIONS`
    *   อัปเดตยอดรวมในตาราง `INVENTORY_ONHAND` และบันทึก `STOCK_TRANSACTIONS`
4.  **UI Data Binding:** หน้า UI ส่วนใหญ่เขียนด้วย JavaScript ธรรมดาแบบ Component-based (แยกตามไฟล์) ดังนั้นหากแก้ไข ID/Class ในไฟล์ .php ต้องอย่าลืมตามไปอัปเดตที่ `script/*.js` ด้วย
