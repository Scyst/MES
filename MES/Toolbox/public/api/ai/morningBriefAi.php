<?php
// Toolbox/public/api/ai/morningBriefAi.php
// AI Executive Shift Briefing & Dynamic MES Query Generator via Gemini API

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../utils/check_auth.php';

// Only allow authenticated users
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'data' => null,
        'message' => 'กรุณาเข้าสู่ระบบก่อนใช้งาน AI Executive Briefing'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Read input payload
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!is_array($input)) {
    $input = $_POST;
}

$briefData = $input['brief_data'] ?? null;
$customPrompt = trim((string)($input['custom_prompt'] ?? ''));
$summaryStyle = trim((string)($input['summary_style'] ?? 'concise')); // 'concise' | 'formal'
$team = htmlspecialchars((string)($input['team'] ?? 'ALL'));

$apiKey = getenv('GEMINI_API_KEY');
if (empty($apiKey)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'data' => null,
        'message' => 'ระบบยังไม่ได้ตั้งค่า GEMINI_API_KEY ในระบบหลังบ้าน'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// -------------------------------------------------------------
// HELPER 1: Smart Thai & Universal Date Parser
// -------------------------------------------------------------
function parseTargetDateFromText(string $text, int $defaultYear = 2026): ?string {
    if (empty($text)) return null;

    if (mb_stripos($text, 'เมื่อวาน') !== false) {
        return date('Y-m-d', strtotime('-1 day'));
    }
    if (mb_stripos($text, 'วันนี้') !== false) {
        return date('Y-m-d');
    }

    $thaiMonths = [
        'มกราคม' => '01', 'มกรา' => '01', 'ม.ค.' => '01',
        'กุมภาพันธ์' => '02', 'กุมภา' => '02', 'ก.พ.' => '02',
        'มีนาคม' => '03', 'มีนา' => '03', 'มี.ค.' => '03',
        'เมษายน' => '04', 'เมษา' => '04', 'เม.ย.' => '04',
        'พฤษภาคม' => '05', 'พฤษภา' => '05', 'พ.ค.' => '05',
        'มิถุนายน' => '06', 'มิถุนา' => '06', 'มิ.ย.' => '06',
        'กรกฎาคม' => '07', 'กรกฎา' => '07', 'ก.ค.' => '07',
        'สิงหาคม' => '08', 'สิงหา' => '08', 'ส.ค.' => '08',
        'กันยายน' => '09', 'กันยา' => '09', 'ก.ย.' => '09',
        'ตุลาคม' => '10', 'ตุลา' => '10', 'ต.ค.' => '10',
        'พฤศจิกายน' => '11', 'พฤศจิกา' => '11', 'พ.ย.' => '11',
        'ธันวาคม' => '12', 'ธันวา' => '12', 'ธ.ค.' => '12',
    ];

    $thaiNumWords = [
        'หนึ่ง' => 1, 'สอง' => 2, 'สาม' => 3, 'สี่' => 4, 'ห้า' => 5,
        'หก' => 6, 'เจ็ด' => 7, 'แปด' => 8, 'เก้า' => 9, 'สิบ' => 10,
        'สิบเอ็ด' => 11, 'สิบสอง' => 12, 'สิบสาม' => 13, 'สิบสี่' => 14, 'สิบห้า' => 15,
        'สิบหก' => 16, 'สิบเจ็ด' => 17, 'สิบแปด' => 18, 'สิบเก้า' => 19, 'ยี่สิบ' => 20,
        'ยี่สิบเอ็ด' => 21, 'ยี่สิบสอง' => 22, 'ยี่สิบสาม' => 23, 'ยี่สิบสี่' => 24, 'ยี่สิบห้า' => 25,
        'ยี่สิบหก' => 26, 'ยี่สิบเจ็ด' => 27, 'ยี่สิบแปด' => 28, 'ยี่สิบเก้า' => 29, 'สามสิบ' => 30,
        'สามสิบเอ็ด' => 31
    ];

    // Check month
    $foundMonth = null;
    foreach ($thaiMonths as $mName => $mNum) {
        if (mb_stripos($text, $mName) !== false) {
            $foundMonth = $mNum;
            break;
        }
    }

    if (!$foundMonth) {
        if (preg_match('/(\d{4})-(\d{1,2})-(\d{1,2})/', $text, $matches)) {
            return sprintf('%04d-%02d-%02d', (int)$matches[1], (int)$matches[2], (int)$matches[3]);
        }
        if (preg_match('/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/', $text, $matches)) {
            return sprintf('%04d-%02d-%02d', (int)$matches[3], (int)$matches[2], (int)$matches[1]);
        }
        return null;
    }

    // Month found, now find day
    $foundDay = null;
    if (preg_match('/(\d{1,2})\s*(?:' . implode('|', array_map('preg_quote', array_keys($thaiMonths))) . ')/u', $text, $matches)) {
        $foundDay = (int)$matches[1];
    } elseif (preg_match('/(?:วันที่|ที่)\s*(\d{1,2})/u', $text, $matches)) {
        $foundDay = (int)$matches[1];
    } else {
        foreach ($thaiNumWords as $w => $num) {
            if (mb_stripos($text, $w) !== false) {
                $foundDay = $num;
                break;
            }
        }
        if (!$foundDay && preg_match('/(\d{1,2})/', $text, $matches)) {
            $foundDay = (int)$matches[1];
        }
    }

    if (!$foundDay || $foundDay < 1 || $foundDay > 31) {
        $foundDay = 1;
    }

    $foundYear = $defaultYear;
    if (preg_match('/(25\d{2})/', $text, $matches)) {
        $foundYear = (int)$matches[1] - 543;
    } elseif (preg_match('/(20\d{2})/', $text, $matches)) {
        $foundYear = (int)$matches[1];
    }

    return sprintf('%04d-%02d-%02d', $foundYear, (int)$foundMonth, $foundDay);
}

// -------------------------------------------------------------
// HELPER 2: Dynamic Live SQL Query for Target Date
// -------------------------------------------------------------
function queryMorningBriefFromDb(string $targetDate, ?string $teamGroup = null): ?array {
    $dbFile = __DIR__ . '/../../db.php';
    if (!file_exists($dbFile)) return null;

    try {
        require_once $dbFile;
        /** @var PDO $pdo */
        if (!isset($pdo) || !($pdo instanceof PDO)) return null;

        $teamParam = ($teamGroup === 'ALL' || empty($teamGroup)) ? null : $teamGroup;

        // 1. Manpower
        $mpQuery = "SELECT 
            COUNT(L.emp_id) as total,
            SUM(CASE WHEN L.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN L.status IN ('SICK', 'BUSINESS', 'VACATION', 'LEAVE') THEN 1 ELSE 0 END) as leave_count
            FROM MANPOWER_DAILY_LOGS L WITH (NOLOCK) 
            LEFT JOIN MANPOWER_EMPLOYEES E WITH (NOLOCK) ON L.emp_id = E.emp_id
            LEFT JOIN MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
            WHERE L.log_date = ? AND L.status != 'GHOST'";
        $mpParams = [$targetDate];
        if (!empty($teamParam)) {
            $mpQuery .= " AND ISNULL(TS.hc_group, '') = ?";
            $mpParams[] = $teamParam;
        } else {
            $mpQuery .= " AND ISNULL(TS.hc_group, '') != 'EXCLUDE'";
        }
        $stmtMp = $pdo->prepare($mpQuery);
        $stmtMp->execute($mpParams);
        $mp = $stmtMp->fetch() ?: ['total' => 0, 'present' => 0, 'leave_count' => 0];

        // 2. Labor Cost
        $costQuery = "SELECT 
            ISNULL(SUM(Normal_Cost + OT_Cost), 0) as total_dlot,
            ISNULL(SUM(OT_Cost), 0) as total_ot,
            ISNULL(SUM(CASE WHEN rate_type = 'DAILY' THEN Normal_Cost ELSE 0 END), 0) as daily_dl
            FROM dbo.fn_GetManpowerSummary_V2(?)";
        $costParams = [$targetDate];
        if (!empty($teamParam)) {
            $costQuery .= " WHERE hc_group = ?";
            $costParams[] = $teamParam;
        } else {
            $costQuery .= " WHERE ISNULL(hc_group, '') != 'EXCLUDE'";
        }
        $stmtCost = $pdo->prepare($costQuery);
        $stmtCost->execute($costParams);
        $cost = $stmtCost->fetch() ?: ['total_dlot' => 0, 'total_ot' => 0, 'daily_dl' => 0];

        // 3. Utilities
        $stmtUtil = $pdo->prepare("SELECT 
            ISNULL(SUM(CASE WHEN m.utility_type = 'ELECTRIC' THEN s.calculated_cost ELSE 0 END), 0) as elec_cost,
            ISNULL(SUM(CASE WHEN m.utility_type = 'LPG' THEN s.calculated_cost ELSE 0 END), 0) as gas_cost
            FROM UTILITY_HOURLY_SUMMARY s WITH (NOLOCK)
            JOIN UTILITY_METERS m WITH (NOLOCK) ON s.meter_id = m.meter_id
            WHERE s.log_date = ? AND m.is_active = 1 AND m.meter_name != 'MDB'");
        $stmtUtil->execute([$targetDate]);
        $util = $stmtUtil->fetch() ?: ['elec_cost' => 0, 'gas_cost' => 0];

        // 4. Production & Revenue
        $prodQuery = "SELECT 
            ISNULL(r.model, i.part_no) as model_name,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) as fg,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END) as hold,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) as scrap,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN 
                t.quantity * CASE 
                    WHEN ISNULL(t.std_price_usd_snapshot, 0) > 0 THEN (t.std_price_usd_snapshot * ISNULL(cal.exchange_rate, 32.0))
                    ELSE ISNULL(t.std_price_snapshot, i.StandardPrice) 
                END
            ELSE 0 END) as revenue
            FROM STOCK_TRANSACTIONS t WITH (NOLOCK)
            JOIN ITEMS i WITH (NOLOCK) ON t.parameter_id = i.item_id
            LEFT JOIN MANUFACTURING_ROUTES r WITH (NOLOCK) ON i.item_id = r.item_id
            LEFT JOIN MANPOWER_CALENDAR cal WITH (NOLOCK) ON cal.calendar_date = CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE)
            LEFT JOIN USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
            WHERE CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) = ?
            AND t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
            AND i.material_type = 'FG'";
        $prodParams = [$targetDate];
        if (!empty($teamParam)) {
            $prodQuery .= " AND (u.team_group = ? OR t.notes LIKE ?)";
            $prodParams[] = $teamParam;
            $prodParams[] = '%[[]TEAM_OVERRIDE: ' . $teamParam . ']%';
        } else {
            $prodQuery .= " AND ISNULL(u.team_group, '') != 'EXCLUDE'";
        }
        $prodQuery .= " GROUP BY ISNULL(r.model, i.part_no)
                        HAVING SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) > 0";
        $stmtProd = $pdo->prepare($prodQuery);
        $stmtProd->execute($prodParams);
        $models = $stmtProd->fetchAll() ?: [];

        $totalRevenue = 0.0;
        foreach ($models as $m) {
            $totalRevenue += (float)($m['revenue'] ?? 0);
        }

        // 5. Team Mood
        $stmtMood = $pdo->prepare("SELECT ISNULL(AVG(CAST(mood_score AS FLOAT)), 0) as mood_avg FROM OPERATOR_DAILY_LOGS WITH (NOLOCK) WHERE log_date = ? AND mood_score > 0");
        $stmtMood->execute([$targetDate]);
        $mood = $stmtMood->fetch();
        $moodAvg = (float)($mood['mood_avg'] ?? 0.0);

        return [
            'raw_date' => $targetDate,
            'date_text' => date('d/m/Y', strtotime($targetDate)),
            'mp_total' => (int)($mp['total'] ?? 0),
            'mp_present' => (int)($mp['present'] ?? 0),
            'mp_leave' => (int)($mp['leave_count'] ?? 0),
            'dlot_total' => number_format((float)($cost['total_dlot'] ?? 0), 2),
            'dl_daily' => number_format((float)($cost['daily_dl'] ?? 0), 2),
            'ot_total' => number_format((float)($cost['total_ot'] ?? 0), 2),
            'elec_cost' => number_format((float)($util['elec_cost'] ?? 0), 2),
            'gas_cost' => number_format((float)($util['gas_cost'] ?? 0), 2),
            'revenue' => number_format($totalRevenue, 2),
            'revenue_raw' => $totalRevenue,
            'dlot_raw' => (float)($cost['total_dlot'] ?? 0),
            'util_raw' => (float)($util['elec_cost'] ?? 0) + (float)($util['gas_cost'] ?? 0),
            'mood_avg' => $moodAvg,
            'models' => $models
        ];
    } catch (Throwable $e) {
        error_log("Dynamic Query Error: " . $e->getMessage());
        return null;
    }
}

// Check if user specifically requested a different date in the prompt
$detectedDate = parseTargetDateFromText($customPrompt);
$autoSwitchedDate = null;

if (!empty($detectedDate)) {
    $fetchedData = queryMorningBriefFromDb($detectedDate, $team);
    if ($fetchedData !== null) {
        $briefData = $fetchedData;
        $autoSwitchedDate = $detectedDate;
    }
}

// Fallback to input brief data if DB query not triggered or failed
if (!$briefData || !is_array($briefData)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'data' => null,
        'message' => 'ไม่พบข้อมูล Morning Brief สำหรับให้ AI วิเคราะห์'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$dateText = htmlspecialchars((string)($briefData['date_text'] ?? $briefData['raw_date'] ?? date('Y-m-d')));
$mpTotal = (int)($briefData['mp_total'] ?? 0);
$mpPresent = (int)($briefData['mp_present'] ?? 0);
$mpLeave = (int)($briefData['mp_leave'] ?? 0);

$dlotTotal = htmlspecialchars((string)($briefData['dlot_total'] ?? '0'));
$otTotal = htmlspecialchars((string)($briefData['ot_total'] ?? '0'));
$elecCost = htmlspecialchars((string)($briefData['elec_cost'] ?? '0'));
$gasCost = htmlspecialchars((string)($briefData['gas_cost'] ?? '0'));

$moodAvg = (float)($briefData['mood_avg'] ?? 0.0);
$revenue = htmlspecialchars((string)($briefData['revenue'] ?? '0'));

// Approximate Gross Contribution calculation
$revNum = (float)str_replace(',', '', (string)$revenue);
$dlotNum = (float)str_replace(',', '', (string)$dlotTotal);
$elecNum = (float)str_replace(',', '', (string)$elecCost);
$gasNum = (float)str_replace(',', '', (string)$gasCost);
$grossContribution = $revNum - ($dlotNum + $elecNum + $gasNum);
$grossContributionText = number_format($grossContribution, 2);

$modelsSummary = [];
if (!empty($briefData['models']) && is_array($briefData['models'])) {
    foreach (array_slice($briefData['models'], 0, 8) as $m) {
        $mName = (string)($m['model_name'] ?? 'N/A');
        $mFg = (int)($m['fg'] ?? 0);
        $mHold = (int)($m['hold'] ?? 0);
        $mScrap = (int)($m['scrap'] ?? 0);
        $modelsSummary[] = "- {$mName}: FG {$mFg} ชิ้น, Hold {$mHold} ชิ้น, Scrap {$mScrap} ชิ้น";
    }
}
$modelsText = !empty($modelsSummary) ? implode("\n", $modelsSummary) : '- ไม่มียอดผลิตโมเดลหลักที่บันทึกไว้';

// Format prompt based on requested summary style
$styleInstruction = "";
if ($summaryStyle === 'concise') {
    $styleInstruction = <<<STYLE
[รูปแบบคำตอบที่ต้องการ: สรุปกระชับสำหรับผู้บริหาร (Executive Quick Summary - สั้น ตรงประเด็น)]
- ความยาวประมาณ 4-6 บรรทัด (หรือ Bullet points สั้นๆ)
- เน้นตัวเลขสำคัญ: รายได้รวม ฿, ยอดผลิต, ต้นทุนรวม (แรงงาน + ค่าไฟ/แก๊ส), กำไรส่วนเกินเบื้องต้น (Gross Contribution), และสถานะของเสีย Scrap/Hold
- ห้ามเกริ่นนำเยิ่นเย้อ ให้ตอบตัวเลขและข้อสรุปทันที สามารถคัดลอกส่งเข้า LINE กลุ่มผู้บริหารได้เลย
STYLE;
} else {
    $styleInstruction = <<<STYLE
[รูปแบบคำตอบที่ต้องการ: รายงานทางการเชิงวิศวกรรมอุตสาหการ (Formal Industrial Report)]
- เขียนสรุปอย่างเป็นทางการ แบ่งโครงสร้าง 3 ส่วนชัดเจน:
  1. **ภาพรวมการดำเนินงาน (Executive Overview):** สรุปสถานะรายได้ เทียบกับกำลังพล และดัชนี Team Mood
  2. **จุดเด่นและจุดเฝ้าระวัง (Key Highlights & Watchpoints):** สัดส่วนของเสีย Scrap/Hold หรือการใช้พลังงานไฟฟ้า/แก๊ส/OT
  3. **ข้อเสนอแนะเชิงรุกสำหรับกะวันนี้ (Actionable Recommendations):** 2-3 ข้อสั้นๆ ให้หัวหน้างานนำไปปฏิบัติทันที
STYLE;
}

$prompt = <<<EOT
คุณคือ "AI ผู้ช่วยฝ่ายบริหารและปฏิบัติการอัจฉริยะ" ประจำระบบ MES โรงงาน B9 (บริษัท เอส เอ็น ซี ฟอร์เมอร์ จำกัด (มหาชน))
ข้อมูลในระบบสำหรับวันที่: {$dateText} (ทีม: {$team}):

[ตัวเลขจริงจากฐานข้อมูล MES]
1. ยอดผลิตและรายได้:
   - รายได้จากสินค้าสำเร็จรูป (FG): ฿{$revenue} บาท
   - กำไรส่วนเกินเบื้องต้น (Gross Contribution = รายได้ - [DLOT + ค่าไฟ + ค่าแก๊ส]): ประมาณ ฿{$grossContributionText} บาท
   - รายการโมเดลผลิตหลัก:
{$modelsText}
2. ต้นทุนแรงงานและพลังงาน:
   - DLOT รวม: ฿{$dlotTotal} บาท (เป็นค่าล่วงเวลา OT: ฿{$otTotal} บาท)
   - ค่าไฟฟ้า: ฿{$elecCost} บาท | ค่าแก๊ส LPG: ฿{$gasCost} บาท (รวมพลังงาน: ฿{$grossContributionText} บาท)
3. กำลังพลและการทำงาน:
   - พนักงานทั้งหมด: {$mpTotal} คน (เข้างาน: {$mpPresent} คน, ขาด/ลา: {$mpLeave} คน)
   - ความสุขเฉลี่ยพนักงาน (Team Mood): {$moodAvg} / 5.0

{$styleInstruction}

[แนวทางการตอบข้อซักถามของผู้ใช้]
- หากผู้ใช้ถามข้อมูลเกี่ยวกับยอดผลิต ต้นทุน หรือกำไร ให้ดึงตัวเลขข้างต้นมาตอบให้ตรงคำถามทันที
- หากผู้ใช้ถามเรื่องที่อยู่นอกเหนือจากตัวเลขนี้ (เช่น ใครเป็นคนคีย์ใบแจ้งซ่อม, จะดูสูตรสีได้ที่ไหน, ประวัติซ่อมบำรุง):
  ให้แนะนำอย่างชัดเจนว่าระบบ MES มีโมดูลรองรับ และผู้ใช้สามารถไปเปิดดูหรือดำเนินการต่อได้ที่โมดูลใด (เช่น PE Maintenance, PaintChem, Store Inventory, System Settings)
EOT;

if (!empty($customPrompt)) {
    $cleanPrompt = htmlspecialchars($customPrompt);
    $prompt .= "\n\n[คำถามหรือคำสั่งเจาะจงจากผู้ใช้]\n\"{$cleanPrompt}\"\nโปรดตอบคำถามนี้เป็นอันดับแรกให้ชัดเจนและตรงประเด็นที่สุด";
}

$payload = [
    'contents' => [
        [
            'parts' => [
                ['text' => $prompt]
            ]
        ]
    ],
    'generationConfig' => [
        'temperature' => 0.2,
        'maxOutputTokens' => 1024
    ]
];

$candidateModels = [
    'gemini-flash-lite-latest',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest'
];

$replyText = null;
$usedModel = null;
$lastError = null;

foreach ($candidateModels as $model) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json; charset=utf-8',
            'x-goog-api-key: ' . $apiKey
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 25,
        CURLOPT_SSL_VERIFYPEER => true
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($httpCode === 200 && !empty($response)) {
        $jsonRes = json_decode($response, true);
        $candidateText = $jsonRes['candidates'][0]['content']['parts'][0]['text'] ?? null;
        if (!empty($candidateText)) {
            $replyText = trim($candidateText);
            $usedModel = $model;
            break;
        }
    } else {
        $lastError = "Model {$model} returned HTTP {$httpCode}: " . ($curlError ?: $response);
    }
}

if ($replyText === null) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'data' => null,
        'message' => 'ไม่สามารถเชื่อมต่อบริการ AI ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
        'debug' => $lastError
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'success' => true,
    'data' => [
        'briefing' => $replyText,
        'model' => $usedModel,
        'generated_at' => date('Y-m-d H:i:s'),
        'auto_switched_date' => $autoSwitchedDate,
        'target_date' => $briefData['raw_date'] ?? $dateText,
        'updated_brief_data' => $autoSwitchedDate ? $briefData : null
    ],
    'message' => 'วิเคราะห์ข้อมูลด้วย AI สำเร็จ'
], JSON_UNESCAPED_UNICODE);
