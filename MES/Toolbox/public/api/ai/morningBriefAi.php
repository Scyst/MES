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
- ผู้ใช้พิมพ์ "วันนี้" = วันผลิตปัจจุบัน, "เมื่อวาน" = วันก่อนหน้า, "เดือนนี้" = วันที่ 1 ถึงวันผลิตปัจจุบัน, "เดือนที่แล้ว" = ทั้งเดือนก่อนหน้า, "สัปดาห์นี้/สัปดาห์ที่แล้ว" = จันทร์ถึงอาทิตย์
- หากผู้ใช้ไม่ระบุวันที่ ให้ใช้วันที่ที่ผู้ใช้เลือกบนหน้าจอ

[วิธีทำงาน]
- ต้องเรียกเครื่องมือดึงข้อมูลจริงก่อนตอบทุกครั้งที่คำถามเกี่ยวกับตัวเลข ห้ามตอบจากความจำหรือการคาดเดา
- ถามวันเดียว/กำลังพล ใช้ get_daily_report ถามเป็นช่วงหรือเดือน ใช้ get_range_report ถามรายโมเดลหรือของเสียรายโมเดล ใช้ get_model_breakdown สามารถเรียกหลายเครื่องมือเพื่อเปรียบเทียบได้
- หากคำถามเป็นการถามต่อเนื่อง (Follow-up question) เช่น "แล้ววันที่ 3 ล่ะ?" ให้ดูบริบทจากข้อความก่อนหน้าเพื่อดึงข้อมูลอย่างถูกต้อง
- หากคำถามอยู่นอกขอบเขตข้อมูลที่เครื่องมือให้ได้ (เช่น ประวัติซ่อม สูตรสี สต็อกวัตถุดิบ คุณภาพรายใบงาน) ห้ามแต่งตัวเลข ให้บอกตรงๆ ว่าตอนนี้ AI ยังเข้าถึงข้อมูลนั้นไม่ได้ และแนะนำโมดูลที่ควรเปิดดู (PE Maintenance, PaintChem, Store Inventory, Quality) หรือบอกว่าต้องพัฒนาเครื่องมือดึงข้อมูลเพิ่ม
- หากเครื่องมือส่ง error กลับมา ให้อธิบายสาเหตุให้ผู้ใช้เข้าใจและแนะนำวิธีถามใหม่

[กฎความถูกต้อง]
- ใช้เฉพาะตัวเลขจากเครื่องมือ ห้ามคำนวณเองยกเว้นการเปรียบเทียบหรือหาร/ลบง่ายๆ ที่ตรวจสอบได้ และต้องระบุหน่วย (ชิ้น, บาท) ทุกครั้ง
- "revenue_minus_labor_and_energy" คือรายได้ลบค่าแรงและพลังงาน ยังไม่หักวัตถุดิบและค่าโสหุ้ย ไม่ใช่กำไรสุทธิ ต้องระบุคำเตือนนี้สั้นๆ เมื่อกล่าวถึง โดยเฉพาะเมื่อผู้ใช้ถามถึง "กำไร"
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

    $historyHash = !empty($historyContents) ? md5(json_encode($historyContents)) : '';
    $cacheKey = md5(implode('|', [$_SESSION['user']['id'] ?? 'anon', $team, $summaryStyle, $userQuestion, $selectedDate, $productionToday, $pageContext, $historyHash, (string)intdiv(time(), AI_CACHE_TTL_SECONDS)]));
    $cacheFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'mes_ai_brief_' . $cacheKey . '.json';
    if (is_file($cacheFile)) {
        $cached = json_decode((string)@file_get_contents($cacheFile), true);
        if (is_array($cached)) {
            $cached['cached'] = true;
            respondJson(200, true, $cached, 'วิเคราะห์ข้อมูลด้วย AI สำเร็จ (ผลลัพธ์ล่าสุดภายใน 1 นาที)');
        }
    }

    $systemInstruction = buildSystemInstruction($summaryStyle, $isLineMode, $productionToday, $selectedDate, $team, $pageContext);
    $contents = array_merge($historyContents, [['role' => 'user', 'parts' => [['text' => $userQuestion]]]]);
    $scopeLog = [];
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
