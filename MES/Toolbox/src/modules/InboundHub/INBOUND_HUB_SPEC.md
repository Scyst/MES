# สถาปัตยกรรมและข้อกำหนดระบบ: Inbound Shipment & Consolidated Invoice Hub
**โมดูล:** `MES/Toolbox/src/modules/InboundHub`  
**สถานะ:** Interactive Executive Prototype & Master System Specification (Phase 0 -> Phase 1 Ready)  
**อัปเดตล่าสุด:** 04/11/2026

---

## 1. วัตถุประสงค์ทางธุรกิจ (Business Objectives)
ระบบตัวกลางเชื่อมโยงข้อมูลขาเข้า (Inbound Supply Chain) ระหว่าง **ลูกค้าผู้ส่งวัตถุดิบ/ชิ้นส่วน (Customer / OEM Shipper)**, **ฝ่ายจัดหาและควบคุมต้นทุน (SCM)** และ **ฝ่ายคลังสินค้า (Store / Warehouse)** เพื่อแก้ไขปัญหาความเหลื่อมล้ำของเอกสาร:
- **ฝั่งลูกค้า:** นิยมมัดรวมยอดส่งของหลายตู้คอนเทนเนอร์ออกเป็น **Consolidated Commercial Invoice เพียง 1 ฉบับ** เพื่อลดค่าธรรมเนียมเอกสาร/พิธีการศุลกากร แต่ส่ง **Packing List รายตู้** แยกให้กับคลังสินค้า
- **ฝั่ง SCM:** เดิมเห็นเฉพาะยอดรวมและราคาใน Invoice ไม่ทราบว่าสินค้ากระจายอยู่ตู้ใด รับเข้าคลังจริงแล้วกี่ตู้ และต้องเสียเวลาตรวจสอบราคาเทียบกับระบบ SAP/สัญญา และราคาตลาดโลก
- **ฝั่ง Store/Warehouse:** เดิมเห็นเฉพาะใบกำกับรายตู้ ไม่ทราบความเชื่อมโยงกับ Invoice ของ SCM และต้องคีย์สร้างป้าย `RM_SERIAL_TAGS` ซ้ำซ้อน

---

## 2. มติการออกแบบหลักจากการวิเคราะห์ร่วมกับผู้ใช้งาน (9 Core Architectural Decisions)

1. **รูปแบบเอกสารต้นทางแบบผสมผสาน (Mixed Document Reality):**
   - รองรับทั้งไฟล์ **Excel (`.xlsx`, `.csv`)** และ **PDF** (ทั้ง Digital PDF จาก ERP ลูกค้า และ Scanned PDF)
2. **ระบบจำคู่รหัสสินค้าและหน่วยนับอัตโนมัติ (`PARTNER_ITEM_MAPPING`):**
   - ลูกค้าหลักมีจำนวนไม่มากและมีรูปแบบเอกสารค่อนข้างคงที่ ระบบจึงใช้ตารางจับคู่รหัสสินค้าของลูกค้า (`customer_part_no`) เข้ากับรหัสมาตรฐานโรงงาน (`sap_no` / `item_id` ใน `dbo.ITEMS`) พร้อมตัวคูณแปลงหน่วยนับ (`uom_conversion_factor`) อัตโนมัติ
3. **ช่องทางการเข้าใช้งานของลูกค้าแบบไร้แรงเสียดทาน (Zero-Friction Partner Access):**
   - แยกหน้าจอ **Partner Portal (`#/partner-portal`)** ออกจากระบบภายในโรงงานอย่างเด็ดขาด
   - รองรับทั้ง **บัญชีประจำบริษัทลูกค้า** และ **ลิงก์ด่วนเฉพาะกิจ (Magic Link)** รวมถึงมี **โหมดตัวแทนอัปโหลด (SCM Proxy Upload)** ให้เจ้าหน้าที่ SCM อัปโหลดไฟล์แทนลูกค้าได้ในช่วงเปลี่ยนผ่าน
4. **การผูกความสัมพันธ์เอกสารแบบไม่พร้อมกันและหลายมิติ (Asynchronous Many-to-Many Reconciliation):**
   - แยกโครงสร้าง **รายการตู้สินค้า (`INBOUND_CONTAINERS`)** ออกจาก **เอกสารอินวอยซ์ (`INBOUND_INVOICES`)** แล้วเชื่อมด้วยตารางกลาง **`INBOUND_ALLOCATIONS`**
   - รองรับทั้งกรณี **(A) ส่ง Invoice พร้อม Packing List ล่วงหน้า**, **(B) ตู้สินค้าทยอยเข้า Store ก่อน แล้วลูกค้าค่อยออก Consolidated Invoice ตามหลัง**, และ **(C) 1 ตู้คอนเทนเนอร์บรรจุสินค้าจากหลาย Invoice**
5. **กลไกตรวจสอบราคา 2 ชั้น (Dual-Layer Price Verification Engine):**
   - **ชั้นที่ 1 (System / Contract Benchmark):** เทียบราคาต่อหน่วยใน Invoice (แปลงค่าเงิน `USD`/`CNY`/`JPY` -> `THB`) กับราคามาตรฐานในระบบ (`SAP_STG_OPERATION_SLIP.STD_Cost` / `ITEMS.Cost_Total`) หรือราคาตามสัญญาซื้อขาย (`PARTNER_CONTRACT_PRICES`)
   - **ชั้นที่ 2 (Market Commodity Benchmark):** เทียบกับดัชนีราคาตลาดวัตถุดิบโลก (เช่น ทองแดง LME, อลูมิเนียม, เหล็ก) ตามสูตรโครงสร้างต้นทุน (`น้ำหนักสุทธิ × ราคาตลาดอ้างอิง + ค่าแปรรูป`) ที่ SCM กำหนด
6. **เชื่อมตรงสู่ระบบป้ายแท็กคลังสินค้าและการแจ้งยอดดิฟ (Direct `RM_SERIAL_TAGS` & Discrepancy Claim):**
   - สร้างรายการป้ายพาเลทสถานะรอรับ (`RM_SERIAL_TAGS.status = 'PENDING'`) รายตู้ให้คลังสินค้าสั่งพิมพ์และสแกนรับเข้า `INVENTORY_ONHAND` ได้ทันที
   - หากตรวจนับจริงพบ **ของขาด / ของเกิน / ชำรุด** คลังสินค้าบันทึกยอดรับจริงพร้อมแนบภาพถ่ายหลักฐาน ระบบจะส่งแจ้งเตือน **Discrepancy Alert** ไปยัง SCM และหน้า Portal ลูกค้าทันที **(ห้ามอนุมัติปรับยอดอัตโนมัติเด็ดขาด — Strict No Auto-Approval)**
7. **เอนจินสกัดข้อมูลแบบไฮบริด (Hybrid Extraction Engine):**
   - ไฟล์ Excel และ Digital PDF ใช้ Template Parser ประจำตัวลูกค้า (ความเร็วสูง ไม่มีค่าใช้จ่ายรายใบ)
   - ไฟล์ PDF สแกนภาพใช้ AI OCR ช่วยสกัดตาราง โดยบังคับแสดงตารางตัวอย่าง (Human-in-the-Loop Preview) ให้ผู้ใช้งานยืนยันความถูกต้องก่อนบันทึกทุกครั้ง
8. **การแบ่งชั้นความลับข้อมูลอย่างเคร่งครัด (Strict Role-Based Data Masking):**
   - **Store / Warehouse:** เห็นเฉพาะเลขตู้ ทะเบียนรถ รหัสสินค้า และจำนวนชิ้น **(ซ่อนราคาต่อหน่วย สกุลเงิน และมูลค่ารวมใน Invoice 100%)**
   - **ลูกค้า (External Partner):** เห็นเฉพาะเอกสารและสถานะตู้ของบริษัทตนเอง **(ซ่อนราคามาตรฐาน SAP สูตรราคาตลาด และสต็อกภายในโรงงาน 100%)**
   - **SCM และผู้บริหาร:** เห็นข้อมูลครบทุกมิติ (360-Degree View)
9. **สถาปัตยกรรม Self-Contained บน `MES/Toolbox`:**
   - พัฒนาด้วย React 19 + Tailwind CSS v4 ตามมาตรฐาน Unified Industrial Design Tokens ของโรงงาน

---

## 3. โครงสร้างตารางฐานข้อมูลสำหรับขึ้นระบบจริง (SQL Server Schema Specification)

```sql
-- 1. ทะเบียนบริษัทคู่ค้า/ลูกค้าที่ส่งวัตถุดิบเข้าโรงงาน
CREATE TABLE dbo.INBOUND_PARTNERS (
    partner_id INT IDENTITY(1,1) PRIMARY KEY,
    partner_code VARCHAR(30) NOT NULL UNIQUE,
    partner_name NVARCHAR(200) NOT NULL,
    default_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    price_tolerance_pct DECIMAL(5,2) NOT NULL DEFAULT 0.50,
    parser_template_json NVARCHAR(MAX) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

-- 2. ตารางจับคู่รหัสสินค้าลูกค้า <-> รหัส SAP/MES โรงงาน และสูตรอ้างอิงราคาตลาด
CREATE TABLE dbo.INBOUND_PARTNER_ITEMS (
    mapping_id INT IDENTITY(1,1) PRIMARY KEY,
    partner_id INT NOT NULL REFERENCES dbo.INBOUND_PARTNERS(partner_id),
    customer_part_no VARCHAR(100) NOT NULL,
    item_id INT NOT NULL, -- FK -> dbo.ITEMS(item_id)
    doc_uom VARCHAR(20) NOT NULL DEFAULT 'PCS',
    store_uom VARCHAR(20) NOT NULL DEFAULT 'PCS',
    uom_conversion_factor DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
    contract_unit_price DECIMAL(18,4) NULL,
    commodity_index_code VARCHAR(30) NULL, -- เช่น 'LME_CU', 'LME_AL', 'CRC_STEEL'
    net_commodity_weight_kg DECIMAL(12,4) NULL,
    fabrication_fee_per_unit DECIMAL(18,4) NULL,
    UNIQUE (partner_id, customer_part_no)
);

-- 3. ดัชนีราคาตลาดวัตถุดิบและอัตราแลกเปลี่ยนอ้างอิง (ดูแลโดย SCM)
CREATE TABLE dbo.SCM_MARKET_BENCHMARKS (
    benchmark_id INT IDENTITY(1,1) PRIMARY KEY,
    index_code VARCHAR(30) NOT NULL, -- 'LME_CU', 'LME_AL', 'FX_USD_THB'
    effective_date DATE NOT NULL,
    rate_value DECIMAL(18,4) NOT NULL,
    unit_currency VARCHAR(20) NOT NULL,
    updated_by INT NOT NULL,
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

-- 4. หัวเอกสาร Commercial Invoice (มัดรวมได้หลายตู้ หรือตามมาทีหลังตู้ได้)
CREATE TABLE dbo.INBOUND_INVOICES (
    invoice_id INT IDENTITY(1,1) PRIMARY KEY,
    partner_id INT NOT NULL REFERENCES dbo.INBOUND_PARTNERS(partner_id),
    invoice_no VARCHAR(80) NOT NULL,
    invoice_date DATE NOT NULL,
    currency VARCHAR(10) NOT NULL,
    exchange_rate DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
    total_doc_amount DECIMAL(18,4) NOT NULL,
    doc_file_path NVARCHAR(500) NULL, -- เก็บใน /Toolbox/uploads/inbound_docs/
    price_check_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW', -- MATCHED, VARIANCE_ALERT, APPROVED, DISPUTED
    reconcile_status VARCHAR(30) NOT NULL DEFAULT 'UNMATCHED', -- UNMATCHED, PARTIAL_RECEIVED, FULLY_RECEIVED, DISCREPANCY
    uploaded_source VARCHAR(20) NOT NULL DEFAULT 'PARTNER_PORTAL', -- PARTNER_PORTAL, SCM_PROXY
    created_by INT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    UNIQUE (partner_id, invoice_no)
);

-- 5. รายการบรรทัดสินค้าใน Invoice พร้อมผลลัพธ์การเทียบราคา ณ เวลาที่ตรวจสอบ
CREATE TABLE dbo.INBOUND_INVOICE_LINES (
    inv_line_id INT IDENTITY(1,1) PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES dbo.INBOUND_INVOICES(invoice_id),
    item_id INT NOT NULL,
    customer_part_no VARCHAR(100) NOT NULL,
    invoiced_qty DECIMAL(18,3) NOT NULL,
    doc_unit_price DECIMAL(18,4) NOT NULL,
    system_std_price_thb DECIMAL(18,4) NULL,
    contract_unit_price DECIMAL(18,4) NULL,
    market_benchmark_price DECIMAL(18,4) NULL,
    variance_vs_system_pct DECIMAL(8,2) NULL,
    variance_vs_market_pct DECIMAL(8,2) NULL,
    line_status VARCHAR(30) NOT NULL DEFAULT 'OK' -- OK, OVER_SYSTEM, OVER_MARKET, APPROVED
);

-- 6. ทะเบียนตู้คอนเทนเนอร์ / เที่ยวรถขนส่งขาเข้า (สร้างก่อนหรือหลัง Invoice ก็ได้)
CREATE TABLE dbo.INBOUND_CONTAINERS (
    container_id INT IDENTITY(1,1) PRIMARY KEY,
    partner_id INT NOT NULL REFERENCES dbo.INBOUND_PARTNERS(partner_id),
    container_no VARCHAR(50) NOT NULL,
    seal_no VARCHAR(50) NULL,
    truck_license VARCHAR(50) NULL,
    eta_datetime DATETIME2 NULL,
    arrived_at DATETIME2 NULL,
    received_completed_at DATETIME2 NULL,
    packing_file_path NVARCHAR(500) NULL,
    container_status VARCHAR(30) NOT NULL DEFAULT 'IN_TRANSIT', -- IN_TRANSIT, ARRIVED_GATE, UNLOADING, COMPLETED, DISCREPANCY
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

-- 7. รายการสินค้าในแต่ละตู้คอนเทนเนอร์ & ยอดตรวจรับจริงของ Store
CREATE TABLE dbo.INBOUND_CONTAINER_ITEMS (
    cont_item_id INT IDENTITY(1,1) PRIMARY KEY,
    container_id INT NOT NULL REFERENCES dbo.INBOUND_CONTAINERS(container_id),
    item_id INT NOT NULL,
    customer_part_no VARCHAR(100) NOT NULL,
    packed_qty DECIMAL(18,3) NOT NULL,
    pallet_count INT NOT NULL DEFAULT 1,
    actual_received_qty DECIMAL(18,3) NULL,
    damaged_qty DECIMAL(18,3) NOT NULL DEFAULT 0,
    discrepancy_remark NVARCHAR(500) NULL,
    evidence_photo_path NVARCHAR(500) NULL,
    tag_generated BIT NOT NULL DEFAULT 0,
    received_by INT NULL,
    received_at DATETIME2 NULL
);

-- 8. ตารางตัวกลางผูกความสัมพันธ์ Many-to-Many (Invoice Line <-> Container Item)
CREATE TABLE dbo.INBOUND_ALLOCATIONS (
    allocation_id INT IDENTITY(1,1) PRIMARY KEY,
    inv_line_id INT NOT NULL REFERENCES dbo.INBOUND_INVOICE_LINES(inv_line_id),
    cont_item_id INT NOT NULL REFERENCES dbo.INBOUND_CONTAINER_ITEMS(cont_item_id),
    allocated_qty DECIMAL(18,3) NOT NULL,
    matched_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    matched_by_mode VARCHAR(20) NOT NULL DEFAULT 'AUTO' -- AUTO, MANUAL_SCM, PARTNER_LINK
);
```

---

## 4. สมการคำนวณส่วนต่างราคา (Price Verification Formulas)

1. **การแปลงราคาเอกสารเป็นสกุลเงินฐาน (Normalized THB Price):**
   - `DocPriceTHB = doc_unit_price * exchange_rate`
2. **ส่วนต่างเทียบราคาในระบบ/สัญญา (`Variance vs System %`):**
   - `SystemVariancePct = ((DocPriceTHB - system_std_price_thb) / NULLIF(system_std_price_thb, 0)) * 100`
3. **ราคากลางอ้างอิงตลาดวัตถุดิบ (`Market Benchmark Price`):**
   - `MarketRefPrice = (net_commodity_weight_kg * MarketIndexPerKg) + fabrication_fee_per_unit`
   - `MarketVariancePct = ((doc_unit_price - MarketRefPrice) / NULLIF(MarketRefPrice, 0)) * 100`
