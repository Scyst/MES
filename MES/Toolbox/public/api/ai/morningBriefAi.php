<?php
// Toolbox/public/api/ai/morningBriefAi.php
// AI Executive Briefing: Gemini function-calling agent that answers free-form questions from live MES data.
// Security: authenticated admin/creator only, CSRF-protected, read-only tools, audit-logged.

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

define('MORNING_BRIEF_AI_ENTRY', true);
date_default_timezone_set('Asia/Bangkok');

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../utils/logger.php';
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/morningBriefTools.php';

const AI_MAX_TOOL_ROUNDS = 4;
const AI_CACHE_TTL_SECONDS = 60;
const AI_MAX_PROMPT_CHARS = 500;
const AI_CANDIDATE_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
];

function respondJson(int $httpCode, bool $success, $data, string $message, array $extra = []): void {
    http_response_code($httpCode);
    echo json_encode(array_merge(['success' => $success, 'data' => $data, 'message' => $message], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * One generateContent call with automatic model fallback.
 *
 * @param array<string,mixed> $payload
 * @return array{response:?array,model:?string,rateLimited:bool,lastError:?string,usage?:array}
 */
function callGeminiWithFallback(array $payload, string $apiKey): array {
    $rateLimited = false;
    $lastError = null;

    foreach (AI_CANDIDATE_MODELS as $model) {
        $handle = curl_init("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent");
        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json; charset=utf-8', 'x-goog-api-key: ' . $apiKey],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $body = curl_exec($handle);
        $httpCode = (int)curl_getinfo($handle, CURLINFO_HTTP_CODE);
        $curlError = curl_error($handle);
        curl_close($handle);

        if ($httpCode === 200 && is_string($body)) {
            $decoded = json_decode($body, true);
            if (is_array($decoded) && !empty($decoded['candidates'][0]['content']['parts'])) {
                return ['response' => $decoded, 'model' => $model, 'rateLimited' => false, 'lastError' => null, 'usage' => $decoded['usageMetadata'] ?? []];
            }
        }
        if ($httpCode === 429) {
            $rateLimited = true;
        }
        $lastError = "Model {$model} HTTP {$httpCode}: " . ($curlError !== '' ? $curlError : substr((string)$body, 0, 300));
    }

    return ['response' => null, 'model' => null, 'rateLimited' => $rateLimited, 'lastError' => $lastError];
}

function buildSystemInstruction(string $summaryStyle, bool $isLineMode, string $productionToday, string $selectedDate, string $team, string $pageContext = ''): string {
    $weekdayThai = ['Sun' => 'อาทิตย์', 'Mon' => 'จันทร์', 'Tue' => 'อังคาร', 'Wed' => 'พุธ', 'Thu' => 'พฤหัสบดี', 'Fri' => 'ศุกร์', 'Sat' => 'เสาร์'];
    $todayWeekday = $weekdayThai[date('D', strtotime($productionToday))] ?? '';
    $pageContextText = !empty($pageContext) ? "\n- หน้าจอที่ผู้ใช้กำลังเปิดอยู่ขณะนี้: {$pageContext} (ให้คำนึงถึงบริบทของหน้านี้เป็นพิเศษ)" : '';

    if ($isLineMode) {
        $styleRule = "รูปแบบ: ข้อความสำหรับส่ง LINE ผู้บริหาร ตอบเพียง 3-4 บรรทัด ไม่มีคำเกริ่นนำหรือคำลงท้าย ขึ้นต้นด้วย 📌 ตามด้วยช่วงเวลาที่สรุป จากนั้น 1️⃣ ผลผลิตและรายได้ 2️⃣ กำลังพลกะเช้า/กะดึก (ถ้าเป็นข้อมูลรายวัน) หรือต้นทุนค่าแรง/OT (ถ้าเป็นช่วงหลายวัน) 3️⃣ ต้นทุนพลังงานและส่วนต่างรายได้หลังหักค่าแรงและพลังงาน ทุกบรรทัดต้องมีตัวเลขจริง";
    } elseif ($summaryStyle === 'formal') {
        $styleRule = "รูปแบบ: รายงานทางการเชิงวิศวกรรมอุตสาหการ แบ่ง 3 หัวข้อ (1) ภาพรวมการดำเนินงาน (2) จุดเด่นและจุดเฝ้าระวัง (3) ข้อเสนอแนะเชิงปฏิบัติ 2 ข้อ";
    } else {
        $styleRule = "รูปแบบ: สรุปกระชับสำหรับผู้บริหาร ไม่เกิน 6 บรรทัด ใช้ bullet เข้าประเด็นตัวเลขทันที ไม่เกริ่นนำ ไม่ลงท้ายด้วยคำเชิญชวน";
    }

    return <<<SYS
คุณคือ "AI ผู้ช่วยฝ่ายบริหารและปฏิบัติการ (MES AI Copilot)" ของโรงงาน B9 บริษัท เอส เอ็น ซี ฟอร์เมอร์ จำกัด (มหาชน) ใช้ระบบ MES เป็นแหล่งข้อมูลเดียว

[บริบทเวลาและระบบ]
- วันผลิตปัจจุบัน: {$productionToday} (วัน{$todayWeekday}) วันผลิตเปลี่ยนวันเวลา 08:00 น.
- วันที่ที่ผู้ใช้เลือกบนหน้าจอ: {$selectedDate}
- ทีมที่กรอง: {$team}{$pageContextText}
- ผู้ใช้พิมพ์ปี พ.ศ. ให้แปลงเป็น ค.ศ. (ลบ 543) หากไม่ระบุปีให้ใช้ปี ค.ศ. ของวันผลิตปัจจุบัน
- ผู้ใช้พิมพ์ "วันนี้/ประจำวัน" = วันผลิตปัจจุบัน, "เมื่อวาน" = วันก่อนหน้า, "เดือนนี้" = วันที่ 1 ถึงวันผลิตปัจจุบัน, "เดือนก่อน/เดือนที่แล้ว" = ทั้งเดือนก่อนหน้า, "สัปดาห์นี้" = จันทร์ถึงวันผลิตปัจจุบัน, "สัปดาห์ก่อน/สัปดาห์ที่แล้ว" = จันทร์ถึงอาทิตย์ก่อนหน้า
- หากผู้ใช้ไม่ระบุวันที่ ให้ใช้วันที่ที่ผู้ใช้เลือกบนหน้าจอ

[วิธีทำงาน]
- ต้องเรียกเครื่องมือดึงข้อมูลจริงก่อนตอบทุกครั้งที่คำถามเกี่ยวกับตัวเลข ห้ามตอบจากความจำหรือการคาดเดา
- ถามวันเดียว/กำลังพล/ต้นทุนวัน ใช้ get_daily_report ถามเป็นช่วงหรือเดือน ใช้ get_range_report ถามรายโมเดลหรือของเสียรายโมเดล ใช้ get_model_breakdown ถามงานซ่อมบำรุงเครื่องจักร/ใบแจ้งซ่อม/PE Maintenance ใช้ get_maintenance_report ถามการใช้งานระบบ/ตรวจสอบระบบ/มีใครใช้งานบ้าง/ตรวจความปลอดภัย ใช้ get_system_audit_logs ถามเงินจมในสต็อก/สินค้าคงคลัง/มูลค่าคลังสินค้า/สต็อกค้าง ใช้ get_inventory_health_report ถามงานค้าง WSM/แผนงานผู้บริหาร/งานเกินกำหนด ใช้ get_wsm_action_items ถามคุณภาพ/งานเคลมลูกค้า/CAR/QMS ใช้ get_quality_and_claims_report ถามข้อมูลภายนอก/ราคากลางวัตถุดิบ/Alarm code เครื่องจักร/ท่องเน็ต ใช้ search_external_web สามารถเรียกหลายเครื่องมือร่วมกันได้
- หากคำถามเป็นการถามต่อเนื่อง (Follow-up question) เช่น "แล้ววันที่ 3 ล่ะ?" ให้ดูบริบทจากข้อความก่อนหน้าเพื่อดึงข้อมูลอย่างถูกต้อง
- หากผู้ใช้ถามเรื่องความรู้วิศวกรรม, การเรียนรู้, AI Vision, PLC, Automation หรือสอบถามคำแนะนำในศูนย์การเรียนรู้ (Learning Hub) สามารถอธิบายด้วยความเชี่ยวชาญเชิงวิชาการและวิศวกรรมอุตสาหกรรมได้ทันที
- หากคำถามอยู่นอกขอบเขตข้อมูลที่เครื่องมือให้ได้ ห้ามแต่งตัวเลข ให้บอกตรงๆ ว่าตอนนี้ AI ยังเข้าถึงข้อมูลนั้นไม่ได้ และแนะนำโมดูลที่เกี่ยวข้อง
- หากเครื่องมือส่ง error กลับมา ให้อธิบายสาเหตุให้ผู้ใช้เข้าใจและแนะนำวิธีถามใหม่

[การท่องเน็ตและสืบค้นข้อมูลภายนอก (External Web Search & Intelligence)]
- เมื่อผู้ใช้ถามข้อมูลที่ไม่อยู่ในฐานข้อมูลโรงงาน B9 เช่น ราคากลางสินค้าโภคภัณฑ์ (เหล็กแผ่นรีดร้อน HRC, อลูมิเนียม, ทองแดง, ก๊าซ NGV/LPG), วิธีแก้ปัญหา Alarm/Error Code เครื่องจักร (FANUC, Yaskawa, Siemens, Mitsubishi), คู่มือวิศวกรรม, อัตราแลกเปลี่ยนค่าเงิน, หรือมาตรฐานสากล (ISO, RoHS, REACH) ให้เรียกใช้ search_external_web
- นำผลการค้นหามาสรุปให้กระชับ อธิบายแนวทางแก้ปัญหาเชิงวิศวกรรม พร้อมระบุแหล่งอ้างอิงชัดเจน

[การวิเคราะห์ภาพถ่ายเชิงวิศวกรรม (Industrial Vision & Defect Diagnostics)]
- เมื่อผู้ใช้แนบภาพถ่ายเข้ามาในคำถาม (เช่น ภาพรอยเชื่อม, ชิ้นงานพ่นสี, รอยบุบ/ขีดข่วน, หน้าจอ Alarm เครื่องจักร, หรือป้ายบาร์โค้ด):
  1. สังเกตและแจกแจงสิ่งที่ปรากฏในภาพอย่างละเอียด (ลักษณะความผิดปกติ ตำแหน่ง ขนาด สี)
  2. ระบุประเภท Defect หรือความผิดปกติทางวิศวกรรม (เช่น Porosity, Spatter, Incomplete Fusion, Orange Peel, Scratch, Dent, Battery Low Alarm)
  3. สันนิษฐานสาเหตุรากเหง้า (Root Cause) ที่เป็นไปได้ตามหลักวิศวกรรมการผลิต
  4. เสนอแนะมาตรการแก้ไขและป้องกัน (Corrective & Preventive Actions) อย่างเป็นรูปธรรม
  5. สามารถเรียกเครื่องมือในระบบ (เช่น get_daily_report เพื่อดูยอด Scrap หรือ get_maintenance_report เพื่อดูประวัติเครื่องจักร) ประกอบการวิเคราะห์ได้ทันที

[กรอบยุทธศาสตร์ผู้บริหาร SNC Roadmap 2027 & การเงินระดับบริหาร]
- ยุทธศาสตร์หลัก SNC 2027 (เกณฑ์ชี้วัดฝ่ายบริหาร):
  1. เป้าหมายยอดขาย 2 ล้านบาท/วัน (~52 ล้านบาท/เดือน): เมื่อตอบยอดขายประจำวันหรือยอดสะสมเดือน ให้เปรียบเทียบกับเป้าหมายตาม Master Budget เสมอ (หรือเกณฑ์ 2M/วัน) พร้อมระบุ % Achievement, ส่วนต่าง Gap ขาด/เกิน และ Required Daily Run Rate ที่ต้องทำต่อวันเพื่อปิดยอดสิ้นเดือน
  2. กฎวินัยการเงิน 135-100-35% (SNC Financial Expense Discipline): สัดส่วนค่าใช้จ่ายดำเนินการต้องไม่เกิน 74.07% ของยอดขาย (รักษากำไรสองหลัก EAT/EBITDA 2 Digits >= 10-12%) เมื่อประเมินยอดสะสมเดือนใน get_range_report ให้วิเคราะห์และรายงานสถานะการผ่านเกณฑ์ 135-100-35% เสมอ
  3. ผลิตภาพกำลังพลต่อหัว IpH (Income per Head) เทียบเกณฑ์ Ratio 1:1 (~38,461.54 บาท/คน/วัน): หากพบว่ามี OT สูง (>= 25% ของค่าแรง) แต่ IpH ต่ำกว่าเกณฑ์ ให้แจ้งเตือนจุดเฝ้าระวังเชิงผลิตภาพ (OT_HIGH_PRODUCTIVITY_LOW: โอทีสูงแต่ผลผลิตต่อหัวต่ำ)
  4. ประสิทธิภาพการส่งมอบตามแผน (Plan vs. Actual Delivery Attainment %): ดึง plan_attainment_pct จาก get_daily_report เทียบยอดผลิต FG จริงกับแผนการผลิตไลน์ประกอบ Assembly (เกณฑ์มาตรฐาน >= 95%)
  5. บริหารจัดการตารางเวลา WSM (Work Schedule Monitoring): หากผู้บริหารถามเรื่องงานค้าง งานด่วน หรือสถานะงาน ให้เรียก get_wsm_action_items สรุปจำนวนงาน Overdue และงาน Urgent ที่ยังไม่เสร็จ พร้อมระบุผู้รับผิดชอบหลัก
  6. คุณภาพและข้อร้องเรียนลูกค้า (QMS Claims & CAR): หากถามเรื่องคุณภาพหรือตัว Q ในเกณฑ์ QCDSS ให้เรียก get_quality_and_claims_report เพื่อรายงานจำนวนเคส และมูลค่าเคลมประมาณการ (Claim Cost)
  7. สินค้าคงคลังและเงินจม 845.48 ล้านบาท: อธิบายเชิงลึกว่า 67.5% (~570 ล้านบาท) สะสมอยู่ที่ปลายไลน์ประกอบ Assembly B9 เป็นสินค้าสำเร็จรูป (FG) ตู้ Tool Cabinet รอการตัดจ่ายส่งมอบ ไม่ใช่หน่วยคูณเพี้ยน และชี้เป้าสินค้าที่เงินจมสูงสุดจาก get_inventory_health_report

[การวิเคราะห์การเงิน กำไร EBITDA และสุขภาพเงินจม (Executive Financial & Working Capital Intelligence)]
- เมื่อผู้บริหารถามเรื่อง "กำไร", "Gross Margin", "EBITDA", "มาร์จิ้น", "ความคุ้มค่า", "Run Rate สิ้นเดือน", หรือ "เงินจมในสต็อก":
  1. การคำนวณ EBITDA ของโรงงาน (Operational EBITDA Proxy): ดึง operational_ebitda_proxy_thb และ ebitda_margin_pct จาก get_daily_report หรือ get_range_report อธิบายให้ผู้บริหารฟังว่านี่คือกำไรจากการดำเนินงานของโรงงาน B9 (รายได้ หักค่าวัตถุดิบ ค่าแรง และพลังงาน ก่อนหักค่าเสื่อมราคาและภาษี)
  2. การคำนวณ Gross Profit: ดึง gross_profit_standard_thb และ gross_profit_margin_pct ซึ่งหักต้นทุนวัตถุดิบและค่าโสหุ้ยมาตรฐานครบถ้วน
  3. มิติมาร์จิ้นรายโมเดล: ดูข้อมูลจาก get_model_breakdown ชี้เป้าว่าโมเดลไหนทำกำไรได้ดีที่สุด (Standard GP & Gross Margin %) และโมเดลไหนมีมาร์จิ้นต่ำ หรือมีความเสี่ยงต้นทุนวัตถุดิบสูง (HIGH_RM_LOW_MARGIN)
  4. มิติเงินจมในคลังสินค้า (Working Capital): เรียก get_inventory_health_report เพื่อตอบมูลค่าสต็อกรวมทั้งสิ้น (~845 ล้านบาท) สัดส่วน FG vs SEMI vs RM และชี้เป้าสินค้าที่มีเงินจมสูงสุด 3-5 อันดับแรก
  5. การประมาณการยอดสิ้นเดือน (Run Rate Forecast): หากผู้บริหารถามเรื่องแนวโน้มสิ้นเดือน หรือถามว่ายอดเดือนนี้จะได้เท่าไหร่ ให้ดูส่วน run_rate_projection เพื่อบอกยอดประมาณการสิ้นเดือน (Projected Month-End Revenue & Projected EBITDA) จากจังหวะการผลิตเฉลี่ยต่อวันที่ผ่านมา

[การวิเคราะห์ความผิดปกติและการตรวจสอบระบบ (Anomaly Detection & System Audit)]
- เมื่อผู้ใช้ถามคำถามเชิงกว้างหรือนามธรรม เช่น "ตรวจสอบการใช้งานในระบบหน่อย ว่ามีอะไรแปลกๆ ไหม", "มีอะไรผิดปกติไหม", "เช็คระบบให้หน่อย", "ภาพรวมโรงงานมีปัญหาอะไรไหม":
  1. มิติการใช้งานระบบซอฟต์แวร์ (Software & Security Audit): ต้องเรียก get_system_audit_logs ตรวจสอบว่ามี API_ERROR หรือไม่ (ถ้ามีให้ระบุชื่อโมดูลและผู้ใช้ที่พบ Error อย่างชัดเจน), มีการลบข้อมูล (DELETE) หรือปลดล็อก (UNLOCK) หรือไม่, และสรุปจำนวนผู้ใช้งาน/Login วันนี้
  2. มิติเครื่องจักรและสถานะซ่อมบำรุง (Maintenance Health): เรียก get_maintenance_report ตรวจสอบทั้งใบงานใหม่และ "active_unresolved_backlog" (ใบงานที่ยังค้างอยู่ทั้งหมดในระบบ) ว่ามีใบแจ้งซ่อมระดับ Critical หรือ High รอดำเนินการหรือไม่ และมีเครื่องจักรใดที่ Downtime สูง
  3. มิติกระบวนการผลิตและคุณภาพ (Production & Quality): เรียก get_daily_report ตรวจสอบว่ามีของเสีย (Scrap) หรือสินค้ากัก (Hold) เกิดขึ้นหรือไม่
  4. มิติแผนงาน WSM และงานค้าง: เรียก get_wsm_action_items ตรวจสอบว่ามีงานสำคัญหลุดกำหนดหรือไม่
  -> สังเคราะห์คำตอบแยกเป็นมิติต่างๆ อย่างชัดเจนและตรงไปตรงมา ไม่ตอบแคบเฉพาะเรื่องใดเรื่องหนึ่ง และต้องแยกแยะชัดเจนว่าอะไรคือ "สถานะปกติ" (เช่น ยอดเข้างานกะดึกแสดง 0 คนในช่วงเวลากลางวันก่อนเริ่มกะ) กับอะไรคือ "จุดที่ควรเฝ้าระวังหรือติดตาม" (เช่น มีใบแจ้งซ่อม Robot Press No.006 ขัดข้องระดับ High, มีงาน WSM เกินกำหนด, สินค้า FG รอส่งมอบสะสม)

[การเจาะลึกงานแจ้งซ่อมค้างสะสมและสัญญาณเตือน Red-Flags (Outstanding Maintenance Backlog)]
- เมื่อผู้บริหารถามเรื่องงานแจ้งซ่อม/เครื่องจักรเสีย หรือถามเจาะลึกจากสัญญาณเตือนจุดเฝ้าระวัง Red-Flags (เช่น "พบเครื่องจักรขัดข้องระดับ Critical/High ค้างอยู่ 9 รายการ" หรือ "มีใบแจ้งซ่อมค้างไหม"):
  1. ให้ดูที่ข้อมูล "active_unresolved_backlog" ใน get_maintenance_report เป็นหลักเสมอ เพราะคือรายการใบงานที่ยังซ่อมไม่เสร็จจริงในโรงงาน ไม่จำกัดว่าแจ้งซ่อมวันไหน
  2. ห้ามตอบว่า "ไม่พบรายการ" เพียงเพราะในวันผลิตปัจจุบัน (วันนี้) ไม่มีการเปิดใบงานใหม่ หาก active_unresolved_backlog มีรายการค้างอยู่ ต้องแจกแจงรายการเครื่องจักร, หมายเลขใบงาน, ไลน์ผลิต, ระดับความสำคัญ (Critical/High), อาการเสีย, และจำนวนวันที่ค้างซ่อม (days_pending) ให้ผู้บริหารทราบอย่างชัดเจน ครบถ้วนตามตัวเลขที่ระบบเตือนไว้

[กฎความถูกต้อง]
- ใช้เฉพาะตัวเลขจากเครื่องมือ ห้ามคำนวณเองยกเว้นการเปรียบเทียบหรือหาร/ลบง่ายๆ ที่ตรวจสอบได้ และต้องระบุหน่วย (ชิ้น, บาท, นาที, %) ทุกครั้ง
- ต้นทุนวัตถุดิบ (standard_material_cost) และค่าโสหุ้ย (overhead_production) คำนวณจาก Standard Cost Snapshot ของ BOM ที่ผูกกับยอดผลิต FG จริง หากผู้บริหารถามเรื่อง "เบิกค่าวัตถุดิบ", "ค่าโสหุ้ย", "EBITDA" หรือ "กำไรขั้นต้น (Gross Profit)" ให้ดึงข้อมูลจาก get_daily_report หรือ get_range_report มาตอบได้อย่างครบถ้วน
- "operational_ebitda_proxy_thb" คือกำไรจากการดำเนินงานของโรงงาน (รายได้ ลบค่าวัตถุดิบ ค่าแรง และค่าพลังงาน) ส่วน "gross_profit_standard_thb" คือกำไรขั้นต้นหลังหักต้นทุนวัตถุดิบมาตรฐานและค่าโสหุ้ยมาตรฐานแล้ว
- ข้อมูลของวันผลิตปัจจุบันเป็นตัวเลข ณ เวลาที่ถาม ยังไม่ใช่ยอดปิดวัน และกะดึกของวันนั้นยังไม่เริ่มงาน จึงยังไม่มียอดเข้างานกะดึก (ไม่ใช่พนักงานหาย)
- กำลังพลต้องแจกแจงแยกกะเช้า (day_shift) และกะดึก (night_shift) เสมอ พร้อมรวมทั้งสองกะ เพื่อไม่ให้ผู้บริหารสับสนกับยอดพนักงานทั้งหมด
- ถ้าช่วงที่ถูกถามถูกตัดให้สั้นลงเพราะเกินวันผลิตปัจจุบัน ให้แจ้งช่วงที่ใช้จริง
- ใช้ภาษาไทยทางการแบบโรงงาน ใช้สกุลเงินบาท ตัวเลขใส่ comma

{$styleRule}
SYS;
}

// -------------------------------------------------------------
// Authentication, authorisation, CSRF
// -------------------------------------------------------------
if (!isset($_SESSION['user'])) {
    respondJson(401, false, null, 'กรุณาเข้าสู่ระบบก่อนใช้งาน AI Executive Briefing');
}
if (!hasRole(['admin', 'creator'])) {
    respondJson(403, false, null, 'ไม่มีสิทธิ์ใช้งาน AI Executive Briefing (เฉพาะผู้บริหารและผู้ดูแลระบบ)');
}

// Action: Proactive Red Flags (Read-only for Executive Warning Banner)
$requestedAction = $_GET['action'] ?? $_POST['action'] ?? '';
if ($requestedAction === 'get_red_flags') {
    try {
        $redFlagsData = queryProactiveRedFlags();
        respondJson(200, true, $redFlagsData, 'ดึงข้อมูลสัญญาณเตือนความเสี่ยงสำเร็จ');
    } catch (Throwable $e) {
        respondJson(500, false, null, 'ไม่สามารถตรวจสอบสัญญาณเตือนความเสี่ยงได้');
    }
}

$csrfHeader = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $csrfHeader)) {
    respondJson(403, false, null, 'CSRF Token Validation Failed.');
}

try {
    $apiKey = getenv('GEMINI_API_KEY');
    if (empty($apiKey)) {
        respondJson(500, false, null, 'ระบบยังไม่ได้ตั้งค่า GEMINI_API_KEY ในระบบหลังบ้าน');
    }

    $input = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($input)) {
        $input = $_POST;
    }

    $customPrompt = mb_substr(trim((string)($input['custom_prompt'] ?? '')), 0, AI_MAX_PROMPT_CHARS);
    $summaryStyle = ($input['summary_style'] ?? 'concise') === 'formal' ? 'formal' : 'concise';
    $rawTeam = trim((string)($input['team'] ?? 'ALL'));
    $team = preg_match('/^[A-Za-z0-9 _-]{1,30}$/', $rawTeam) ? $rawTeam : 'ALL';

    $productionToday = getProductionToday();
    $briefDate = (string)($input['brief_data']['raw_date'] ?? '');
    $selectedDate = isValidIsoDate($briefDate) ? $briefDate : $productionToday;

    $pageContext = mb_substr(trim((string)($input['page_context'] ?? '')), 0, 100);
    $rawHistory = is_array($input['history'] ?? null) ? $input['history'] : [];

    // Sanitize multi-turn history (keep up to 6 messages = 3 turns max for token efficiency)
    $historyContents = [];
    if (!empty($rawHistory)) {
        $recent = array_slice($rawHistory, -6);
        foreach ($recent as $msg) {
            if (!is_array($msg)) continue;
            $r = (($msg['role'] ?? '') === 'model' || ($msg['role'] ?? '') === 'assistant') ? 'model' : 'user';
            $t = mb_substr(trim((string)($msg['content'] ?? $msg['text'] ?? '')), 0, 1500);
            if ($t !== '') {
                $historyContents[] = ['role' => $r, 'parts' => [['text' => $t]]];
            }
        }
    }

    $isLineMode = (bool)preg_match('/line|ไลน์|3\s*บรรทัด/iu', $customPrompt);
    $userQuestion = $customPrompt !== '' ? $customPrompt : "สรุปผลการดำเนินงานของวันที่ {$selectedDate}";

    // Multimodal Vision: process attached image if present (JPEG, PNG, WebP)
    $imagePart = null;
    $rawImage = $input['image'] ?? null;
    $imageHash = '';
    if (is_array($rawImage) && !empty($rawImage['data'])) {
        $mime = (string)($rawImage['mime_type'] ?? 'image/jpeg');
        $b64 = (string)$rawImage['data'];
        if (preg_match('/^data:([^;]+);base64,(.+)$/', $b64, $m)) {
            $mime = $m[1];
            $b64 = $m[2];
        }
        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (in_array($mime, $allowedMimes, true) && strlen($b64) <= 8 * 1024 * 1024) {
            $imagePart = [
                'inlineData' => [
                    'mimeType' => $mime,
                    'data' => $b64,
                ]
            ];
            $imageHash = md5($b64);
        }
    }

    $historyHash = !empty($historyContents) ? md5(json_encode($historyContents)) : '';
    $cacheKey = md5(implode('|', [$_SESSION['user']['id'] ?? 'anon', $team, $summaryStyle, $userQuestion, $selectedDate, $productionToday, $pageContext, $historyHash, $imageHash, (string)intdiv(time(), AI_CACHE_TTL_SECONDS)]));
    $cacheFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'mes_ai_brief_' . $cacheKey . '.json';
    if (is_file($cacheFile)) {
        $cached = json_decode((string)@file_get_contents($cacheFile), true);
        if (is_array($cached)) {
            $cached['cached'] = true;
            respondJson(200, true, $cached, 'วิเคราะห์ข้อมูลด้วย AI สำเร็จ (ผลลัพธ์ล่าสุดภายใน 1 นาที)');
        }
    }

    $systemInstruction = buildSystemInstruction($summaryStyle, $isLineMode, $productionToday, $selectedDate, $team, $pageContext);

    $userParts = [];
    if ($imagePart !== null) {
        $userParts[] = $imagePart;
    }
    $userParts[] = ['text' => $userQuestion];

    $contents = array_merge($historyContents, [['role' => 'user', 'parts' => $userParts]]);
    $scopeLog = [];
    if ($imagePart !== null) {
        $scopeLog[] = "วิเคราะห์ภาพถ่าย (AI Vision)";
    }
    $toolsUsed = [];
    $replyText = null;
    $usedModel = null;
    $failure = null;
    $inputTokens = 0;
    $outputTokens = 0;

    for ($round = 0; $round <= AI_MAX_TOOL_ROUNDS; $round++) {
        $payload = [
            'systemInstruction' => ['parts' => [['text' => $systemInstruction]]],
            'contents' => $contents,
            'tools' => getToolDeclarations(),
            'generationConfig' => ['temperature' => 0.2, 'maxOutputTokens' => 2048],
        ];
        if ($round === AI_MAX_TOOL_ROUNDS) {
            $payload['toolConfig'] = ['functionCallingConfig' => ['mode' => 'NONE']];
        }

        $result = callGeminiWithFallback($payload, $apiKey);
        if ($result['response'] === null) {
            $failure = $result;
            break;
        }
        $usedModel = $result['model'];
        $inputTokens += (int)($result['usage']['promptTokenCount'] ?? 0);
        $outputTokens += (int)($result['usage']['candidatesTokenCount'] ?? 0) + (int)($result['usage']['thoughtsTokenCount'] ?? 0);
        $modelContent = $result['response']['candidates'][0]['content'];

        $functionCalls = [];
        $textParts = [];
        foreach ($modelContent['parts'] as $part) {
            if (isset($part['functionCall'])) {
                $functionCalls[] = $part['functionCall'];
            } elseif (isset($part['text']) && empty($part['thought'])) {
                $textParts[] = $part['text'];
            }
        }

        if (empty($functionCalls)) {
            $replyText = trim(implode('', $textParts));
            break;
        }

        $contents[] = $modelContent;
        $responseParts = [];
        foreach ($functionCalls as $call) {
            $toolName = (string)($call['name'] ?? '');
            $toolArgs = is_array($call['args'] ?? null) ? $call['args'] : [];
            $toolsUsed[] = $toolName;
            $responseParts[] = ['functionResponse' => [
                'name' => $toolName,
                'response' => ['result' => executeTool($toolName, $toolArgs, $team === 'ALL' ? null : $team, $scopeLog)],
            ]];
        }
        $contents[] = ['role' => 'user', 'parts' => $responseParts];
    }

    if ($replyText === null || $replyText === '') {
        $rateLimited = $failure !== null && $failure['rateLimited'];
        if ($failure !== null) {
            error_log('[MORNING_BRIEF_AI] ' . ($failure['lastError'] ?? 'unknown'));
        }
        respondJson(
            $rateLimited ? 429 : 502,
            false,
            null,
            $rateLimited
                ? 'ขณะนี้มีการเรียกใช้งาน AI ถี่เกินโควตาทดลองใช้ฟรี (จำกัด 15 ครั้ง/นาที) กรุณารอประมาณ 15-20 วินาทีแล้วลองใหม่อีกครั้ง'
                : 'AI ไม่สามารถประมวลผลคำถามนี้ได้ในขณะนี้ กรุณาลองใหม่หรือปรับคำถามให้เจาะจงขึ้น'
        );
    }

    $responseData = [
        'briefing' => $replyText,
        'model' => $usedModel,
        'generated_at' => date('Y-m-d H:i:s'),
        'data_scope' => array_values(array_unique($scopeLog)),
        'tools_used' => array_values(array_unique($toolsUsed)),
        'cached' => false,
    ];
    @file_put_contents($cacheFile, json_encode($responseData, JSON_UNESCAPED_UNICODE), LOCK_EX);

    writeLog(
        $pdo,
        'AI_QUERY',
        'MORNING_BRIEF_AI',
        $selectedDate,
        null,
        ['team' => $team, 'style' => $summaryStyle, 'model' => $usedModel, 'tools' => $responseData['tools_used'], 'scope' => $responseData['data_scope'], 'input_tokens' => $inputTokens, 'output_tokens' => $outputTokens],
        mb_substr($userQuestion, 0, 200)
    );

    respondJson(200, true, $responseData, 'วิเคราะห์ข้อมูลด้วย AI สำเร็จ');
} catch (Throwable $e) {
    writeErrorLog($pdo ?? null, 'MORNING_BRIEF_AI', $e->getMessage(), ['prompt' => $customPrompt ?? '']);
    respondJson(500, false, null, 'เกิดข้อผิดพลาดภายในระบบ AI กรุณาลองใหม่อีกครั้ง');
}
