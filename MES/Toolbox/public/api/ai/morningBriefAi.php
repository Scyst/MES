<?php
// Toolbox/public/api/ai/morningBriefAi.php
// AI Executive Shift Briefing Generator via Gemini API

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
if (!$briefData || !is_array($briefData)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'data' => null,
        'message' => 'ไม่พบข้อมูล Morning Brief สำหรับให้ AI วิเคราะห์'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

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

// Extract and sanitize brief summary
$customPrompt = trim((string)($input['custom_prompt'] ?? ''));
$dateText = htmlspecialchars((string)($briefData['date_text'] ?? $briefData['raw_date'] ?? date('Y-m-d')));
$team = htmlspecialchars((string)($input['team'] ?? 'ALL'));

$mpTotal = (int)($briefData['mp_total'] ?? 0);
$mpPresent = (int)($briefData['mp_present'] ?? 0);
$mpLeave = (int)($briefData['mp_leave'] ?? 0);

$dlotTotal = htmlspecialchars((string)($briefData['dlot_total'] ?? '0'));
$otTotal = htmlspecialchars((string)($briefData['ot_total'] ?? '0'));
$elecCost = htmlspecialchars((string)($briefData['elec_cost'] ?? '0'));
$gasCost = htmlspecialchars((string)($briefData['gas_cost'] ?? '0'));

$moodAvg = (float)($briefData['mood_avg'] ?? 0.0);
$revenue = htmlspecialchars((string)($briefData['revenue'] ?? '0'));

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

// Construct industrial system prompt for SNC-B9
$prompt = <<<EOT
คุณคือ "AI ผู้ช่วยฝ่ายบริหารและปฏิบัติการอัจฉริยะ" ประจำระบบ MES โรงงาน B9 (บริษัท เอส เอ็น ซี ฟอร์เมอร์ จำกัด (มหาชน))
โปรดวิเคราะห์ข้อมูลสรุปประจำวัน (Morning Brief) ของวันที่: {$dateText} (ทีม: {$team}) เพื่อใช้บรรยายสรุปให้ผู้จัดการโรงงานและหัวหน้ากะฟังในที่ประชุม Morning Brief

[ข้อมูลสรุปตัวเลขจริงจากระบบ MES]
1. กำลังพล (Manpower): ทั้งหมด {$mpTotal} คน, เข้างาน {$mpPresent} คน, ขาด/ลา {$mpLeave} คน
2. ต้นทุนแรงงานและพลังงาน:
   - DLOT รวม: {$dlotTotal} บาท
   - ค่าล่วงเวลา (OT): {$otTotal} บาท
   - ค่าไฟฟ้า: {$elecCost} บาท
   - ค่าแก๊ส LPG: {$gasCost} บาท
3. ความสุขเฉลี่ยพนักงาน (Team Mood): {$moodAvg} / 5.0
4. ผลิตภัณฑ์และรายได้:
   - รายได้จากการผลิต FG รวม: ฿{$revenue} บาท
   - สรุปยอดผลิตตามโมเดลหลัก:
{$modelsText}

[คำสั่งและโครงสร้างคำตอบที่ต้องการ]
เขียนสรุปเป็นภาษาไทยเชิงวิชาชีพวิศวกรรมอุตสาหการ (Formal Industrial Tone) สั้น กระชับ ตรงประเด็น (ความยาวประมาณ 3-4 ย่อหน้าสั้น หรือเป็น Bullet points ชัดเจน):
1. **ภาพรวมการดำเนินงาน (Executive Overview):** สรุปสถานะรายได้เทียบกับอัตราการเข้างานและบรรยากาศทีม
2. **จุดเด่นและจุดเฝ้าระวัง (Key Highlights & Watchpoints):** สัดส่วนของเสีย (Scrap/Hold) หรือการใช้น้ำมัน/ไฟ/แก๊ส หรือประเด็นพนักงานขาดงานที่มีนัยสำคัญ
3. **ข้อเสนอแนะเชิงรุกสำหรับกะวันนี้ (Actionable Recommendations):** 2-3 ข้อสั้นๆ ให้หัวหน้างานนำไปลงมือทำทันที
EOT;

if (!empty($customPrompt)) {
    $cleanCustomPrompt = htmlspecialchars($customPrompt);
    $prompt .= "\n\n[ประเด็นหรือคำถามเพิ่มเติมที่ผู้ใช้/ผู้บริหารต้องการเน้นเป็นพิเศษ]\n\"{$cleanCustomPrompt}\"\nโปรดวิเคราะห์และให้คำตอบเน้นย้ำประเด็นนี้อย่างชัดเจน";
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
        'temperature' => 0.3,
        'maxOutputTokens' => 1024
    ]
];

// List candidate models in order of speed and stability
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
        'generated_at' => date('Y-m-d H:i:s')
    ],
    'message' => 'วิเคราะห์ข้อมูลด้วย AI สำเร็จ'
], JSON_UNESCAPED_UNICODE);

