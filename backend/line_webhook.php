<?php
// ============================================================
// LINE OA Webhook Handler - ระบบบอทแจ้งซ่อมอุปกรณ์ไอที
// ตั้ง URL ไฟล์นี้เป็น Webhook ใน LINE Developers Console
// ============================================================

header("Content-Type: application/json; charset=UTF-8");

// ============================================================
// ค่าคงที่สำหรับ LINE API
// ============================================================
define("LINE_CHANNEL_TOKEN", "DHjt0bQw6MKuH6jxwmD+nER4YGp+ixenbssdcDyU4Gw/zsFVB9k5tGGmbLTM+hsNYe70/kC5V/m7/8/CXOW5TBXrFdFnLaGfpx6cN2ZBgDn+c/yJWqFS0u5qu87TJEeb061QTJ/iHPYeYpzmCbb18wdB04t89/1O/w1cDnyilFU=");
define("LINE_CHANNEL_SECRET", ""); // ใส่ Channel Secret ที่นี่ (ถ้ามี)
define("SITE_URL", "https://it-repair-api.freehosting.dev/?openExternalBrowser=1"); // URL หน้าเว็บแจ้งซ่อม (เปิดในเบราว์เซอร์นอกอัตโนมัติ)

// ============================================================
// รับข้อมูลจาก LINE
// ============================================================
$rawBody = file_get_contents("php://input");

// บันทึก Log สำหรับ Debug
file_put_contents(__DIR__ . "/webhook_debug.log",
    date("Y-m-d H:i:s") . " WEBHOOK: " . $rawBody . PHP_EOL,
    FILE_APPEND
);

// ตรวจสอบ Signature (ถ้ามี Channel Secret)
if (!empty(LINE_CHANNEL_SECRET)) {
    $signature = $_SERVER["HTTP_X_LINE_SIGNATURE"] ?? "";
    $expectedSig = base64_encode(hash_hmac("sha256", $rawBody, LINE_CHANNEL_SECRET, true));
    if ($signature !== $expectedSig) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid signature"]);
        exit();
    }
}

$events = json_decode($rawBody, true)["events"] ?? [];

// เชื่อมต่อ DB
require_once __DIR__ . "/config.php";

// ============================================================
// วนประมวลผลแต่ละ Event
// ============================================================
foreach ($events as $event) {
    $eventType  = $event["type"] ?? "";
    $replyToken = $event["replyToken"] ?? "";
    $source     = $event["source"] ?? [];
    $lineUserId = $source["userId"] ?? "";

    if ($eventType === "follow") {
        handleFollowEvent($pdo, $lineUserId, $replyToken);
    } elseif ($eventType === "message") {
        $msgType = $event["message"]["type"] ?? "";
        if ($msgType === "text") {
            $text = trim($event["message"]["text"] ?? "");
            handleTextMessage($pdo, $lineUserId, $replyToken, $text);
        }
    }
}

echo json_encode(["status" => "ok"]);
exit();

// ============================================================
// ฟังก์ชันส่งข้อความตอบกลับ (Reply API)
// ============================================================
function replyMessage(string $replyToken, array $messages): void {
    $payload = json_encode([
        "replyToken" => $replyToken,
        "messages"   => $messages,
    ]);

    $ch = curl_init("https://api.line.me/v2/bot/message/reply");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            "Content-Type: application/json",
            "Authorization: Bearer " . LINE_CHANNEL_TOKEN,
        ],
    ]);
    $res = curl_exec($ch);
    curl_close($ch);

    file_put_contents(__DIR__ . "/webhook_debug.log",
        date("Y-m-d H:i:s") . " REPLY RESPONSE: " . $res . PHP_EOL,
        FILE_APPEND
    );
}

// ============================================================
// Event: ผู้ใช้เพิ่มเพื่อน LINE OA
// ============================================================
function handleFollowEvent(PDO $pdo, string $lineUserId, string $replyToken): void {
    replyMessage($replyToken, [buildWelcomeMessage()]);
}

// ============================================================
// ประมวลผลข้อความที่ผู้ใช้พิมพ์มา
// ============================================================
function handleTextMessage(PDO $pdo, string $lineUserId, string $replyToken, string $text): void {
    $lower = mb_strtolower($text, "UTF-8");

    // --- ตรวจสอบสถานะงานซ่อมตามเลขที่ REQ- ---
    if (preg_match("/REQ-\d{4}-\d+/i", $text, $matches)) {
        $reqNo = strtoupper($matches[0]);
        $replies = handleCheckByRequestNo($pdo, $reqNo);
        replyMessage($replyToken, $replies);
        return;
    }

    // --- สถานะ / ตรวจสอบ / งานซ่อมของฉัน ---
    if (containsAny($lower, ["สถานะ", "ตรวจสอบ", "งานซ่อม", "status", "my repair", "ของฉัน", "ของผม"])) {
        $replies = handleCheckMyRepairs($pdo, $lineUserId);
        replyMessage($replyToken, $replies);
        return;
    }

    // --- แจ้งซ่อม ---
    if (containsAny($lower, ["แจ้งซ่อม", "แจ้ง", "report", "ซ่อม"])) {
        replyMessage($replyToken, [buildRepairLinkMessage()]);
        return;
    }

    // --- ติดต่อช่าง ---
    if (containsAny($lower, ["ติดต่อ", "ช่าง", "เบอร์", "โทร", "contact", "technician"])) {
        $replies = handleContactTechnician($pdo);
        replyMessage($replyToken, $replies);
        return;
    }

    // --- ช่วยเหลือ ---
    if (containsAny($lower, ["ช่วยเหลือ", "help", "วิธี", "ใช้งาน", "คำสั่ง", "menu", "เมนู"])) {
        replyMessage($replyToken, [buildHelpMessage()]);
        return;
    }

    // --- สวัสดี ---
    if (containsAny($lower, ["สวัสดี", "hello", "hi", "หวัดดี", "เริ่ม", "start"])) {
        replyMessage($replyToken, [buildWelcomeMessage()]);
        return;
    }

    // --- ขอบคุณ ---
    if (containsAny($lower, ["ขอบคุณ", "ขอบใจ", "thanks", "thank you"])) {
        replyMessage($replyToken, [["type" => "text", "text" => "ยินดีให้บริการครับ! อิอิ\nหากต้องการความช่วยเหลืออีก พิมพ์ \"เมนู\" ได้เลยครับ"]]);
        return;
    }

    // --- Default ---
    replyMessage($replyToken, [buildDefaultMessage()]);
}

// ============================================================
// ดึงงานซ่อมของผู้ใช้จาก LINE User ID
// ============================================================
function handleCheckMyRepairs(PDO $pdo, string $lineUserId): array {
    $stmtUser = $pdo->prepare("SELECT id, name FROM users WHERE line_user_id = ? LIMIT 1");
    $stmtUser->execute([$lineUserId]);
    $user = $stmtUser->fetch();

    if (!$user) {
        return [["type" => "text", "text" => "❌ ไม่พบข้อมูลของคุณในระบบ\n\nกรุณาสมัครสมาชิกและเข้าสู่ระบบผ่านเว็บไซต์ก่อนครับ\n🌐 " . SITE_URL]];
    }

    $stmtReq = $pdo->prepare("
        SELECT r.request_no, r.equipment_model, r.status, r.created_at, r.updated_at,
               t.name as technician_name
        FROM repair_requests r
        LEFT JOIN users t ON r.assigned_to = t.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
        LIMIT 5
    ");
    $stmtReq->execute([$user["id"]]);
    $repairs = $stmtReq->fetchAll();

    if (empty($repairs)) {
        return [["type" => "text", "text" => "📋 คุณ {$user["name"]} ยังไม่มีรายการแจ้งซ่อมในระบบครับ\n\nต้องการแจ้งซ่อม? พิมพ์ \"แจ้งซ่อม\" ได้เลย"]];
    }

    $msg  = "📋 งานซ่อมของคุณ {$user["name"]}\n";
    $msg .= "━━━━━━━━━━━━━━━━━━━━\n";

    foreach ($repairs as $r) {
        $statusLabel = statusLabelTH($r["status"]);
        $createdDate = date("d/m/Y", strtotime($r["created_at"]));
        $techName    = $r["technician_name"] ? "ช่าง: {$r["technician_name"]}" : "ยังไม่มอบหมาย";
        $msg .= "\n🔖 {$r["request_no"]}\n";
        $msg .= "📦 {$r["equipment_model"]}\n";
        $msg .= "📅 {$createdDate} | 📌 {$statusLabel}\n";
        $msg .= "👷 {$techName}\n";
        $msg .= "━━━━━━━━━━━━━━━━━━━━\n";
    }

    $msg .= "\n💡 พิมพ์เลขที่ (เช่น REQ-2026-1234) เพื่อดูรายละเอียด";

    return [["type" => "text", "text" => $msg]];
}

// ============================================================
// ดึงงานซ่อมตามเลขที่
// ============================================================
function handleCheckByRequestNo(PDO $pdo, string $requestNo): array {
    $stmt = $pdo->prepare("
        SELECT r.*, 
               u.name as user_name, u.phone as user_phone, u.student_id, u.department,
               t.name as technician_name, t.phone as technician_phone
        FROM repair_requests r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN users t ON r.assigned_to = t.id
        WHERE r.request_no = ?
        LIMIT 1
    ");
    $stmt->execute([$requestNo]);
    $r = $stmt->fetch();

    if (!$r) {
        return [["type" => "text", "text" => "❌ ไม่พบรายการ {$requestNo} ในระบบ\n\nกรุณาตรวจสอบเลขที่อีกครั้ง หรือพิมพ์ \"สถานะ\" เพื่อดูรายการทั้งหมดครับ"]];
    }

    $statusLabel = statusLabelTH($r["status"]);
    $createdDate = date("d/m/Y H:i", strtotime($r["created_at"]));
    $updatedDate = !empty($r["updated_at"]) ? date("d/m/Y H:i", strtotime($r["updated_at"])) : "-";

    $msg  = "🔍 รายละเอียดงานซ่อม\n";
    $msg .= "━━━━━━━━━━━━━━━━━━━━\n";
    $msg .= "📝 เลขที่: {$r["request_no"]}\n";
    $msg .= "📦 อุปกรณ์: {$r["equipment_model"]}\n";
    if (!empty($r["serial_number"])) $msg .= "🔢 S/N: {$r["serial_number"]}\n";
    $msg .= "📍 สถานที่: {$r["location_description"]}\n";
    $msg .= "🛠️ ปัญหา: {$r["problem_description"]}\n";
    $msg .= "⚡ ความเร่งด่วน: " . priorityLabelTH($r["priority"]) . "\n";
    $msg .= "━━━━━━━━━━━━━━━━━━━━\n";
    $msg .= "📌 สถานะ: {$statusLabel}\n";
    $msg .= "📅 วันแจ้ง: {$createdDate}\n";
    $msg .= "🔄 อัปเดต: {$updatedDate}\n";

    if (!empty($r["technician_name"])) {
        $msg .= "👷 ช่าง: {$r["technician_name"]}\n";
        if (!empty($r["technician_phone"])) $msg .= "📞 โทร: {$r["technician_phone"]}\n";
    } else {
        $msg .= "👷 ช่าง: ยังไม่มอบหมาย\n";
    }

    if (!empty($r["technician_notes"])) {
        $msg .= "━━━━━━━━━━━━━━━━━━━━\n";
        $msg .= "💬 บันทึกช่าง: {$r["technician_notes"]}\n";
    }

    return [["type" => "text", "text" => $msg]];
}

// ============================================================
// ดึงรายชื่อช่างเทคนิค
// ============================================================
function handleContactTechnician(PDO $pdo): array {
    $stmt = $pdo->prepare("SELECT name, phone, email FROM users WHERE role = 'technician' AND is_active = 1 ORDER BY name ASC");
    $stmt->execute();
    $techs = $stmt->fetchAll();

    if (empty($techs)) {
        return [["type" => "text", "text" => "📞 ขณะนี้ไม่มีช่างเทคนิคที่ออนไลน์\n\nกรุณาแจ้งซ่อมผ่านเว็บไซต์ ทีมงานจะติดต่อกลับครับ"]];
    }

    $msg  = "📞 ทีมช่างเทคนิค IT\n";
    $msg .= "━━━━━━━━━━━━━━━━━━━━\n";
    foreach ($techs as $t) {
        $msg .= "\n👷 {$t["name"]}\n";
        if (!empty($t["phone"])) $msg .= "📱 โทร: {$t["phone"]}\n";
        if (!empty($t["email"])) $msg .= "📧 {$t["email"]}\n";
    }
    $msg .= "\n⏰ เวลาทำการ: จันทร์-ศุกร์ 08:00-17:00 น.";

    return [["type" => "text", "text" => $msg]];
}

// ============================================================
// ข้อความต้อนรับ
// ============================================================
function buildWelcomeMessage(): array {
    $msg  = "🔧 สวัสดีครับ! บอทระบบแจ้งซ่อม IT\n";
    $msg .= "━━━━━━━━━━━━━━━━━━━━\n\n";
    $msg .= "🤖 สิ่งที่ผมช่วยได้:\n\n";
    $msg .= "📌 \"สถานะ\" → ดูงานซ่อมทั้งหมด\n";
    $msg .= "🔍 \"REQ-2026-1234\" → รายละเอียดงานนั้น\n";
    $msg .= "🌐 \"แจ้งซ่อม\" → ไปหน้าแจ้งซ่อม\n";
    $msg .= "📞 \"ติดต่อช่าง\" → เบอร์ทีมช่าง\n";
    $msg .= "❓ \"ช่วยเหลือ\" → คำแนะนำทั้งหมด\n";
    $msg .= "\n⏰ พร้อมให้บริการ 24 ชั่วโมงครับ!";
    return ["type" => "text", "text" => $msg];
}

function buildRepairLinkMessage(): array {
    $msg  = "🌐 แจ้งซ่อมอุปกรณ์ไอที\n";
    $msg .= "━━━━━━━━━━━━━━━━━━━━\n\n";
    $msg .= "📋 ขั้นตอน:\n";
    $msg .= "1. เข้าสู่ระบบด้วยบัญชีนักศึกษา\n";
    $msg .= "2. กด \"แจ้งซ่อม\" ในเมนู\n";
    $msg .= "3. กรอกข้อมูลอุปกรณ์และอาการ\n";
    $msg .= "4. แนบรูปถ่าย (ถ้ามี)\n";
    $msg .= "5. กดยืนยันส่ง\n\n";
    $msg .= "🔗 เว็บไซต์:\n" . SITE_URL . "\n\n";
    $msg .= "📌 ระบบจะแจ้งเตือนความคืบหน้าผ่าน LINE นี้ครับ";
    return ["type" => "text", "text" => $msg];
}

function buildHelpMessage(): array {
    $msg  = "❓ วิธีใช้งานบอท\n";
    $msg .= "━━━━━━━━━━━━━━━━━━━━\n\n";
    $msg .= "คำสั่งที่รองรับ:\n\n";
    $msg .= "• สวัสดี / เมนู → เมนูหลัก\n";
    $msg .= "• สถานะ → รายการงานซ่อมของคุณ\n";
    $msg .= "• REQ-2026-XXXX → รายละเอียดงานซ่อม\n";
    $msg .= "• แจ้งซ่อม → ลิงก์หน้าแจ้งซ่อม\n";
    $msg .= "• ติดต่อช่าง → เบอร์ช่างเทคนิค\n\n";
    $msg .= "━━━━━━━━━━━━━━━━━━━━\n";
    $msg .= "⏰ เวลาทำการช่าง: จ-ศ 08:00-17:00\n";
    $msg .= "🌐 เว็บไซต์: " . SITE_URL;
    return ["type" => "text", "text" => $msg];
}

function buildDefaultMessage(): array {
    $msg  = "🤔 ขออภัยครับ ไม่เข้าใจคำสั่งนี้\n\n";
    $msg .= "💡 ลองพิมพ์:\n";
    $msg .= "• \"สถานะ\" → ดูงานซ่อม\n";
    $msg .= "• \"แจ้งซ่อม\" → แจ้งซ่อมใหม่\n";
    $msg .= "• \"ติดต่อช่าง\" → เบอร์โทร\n";
    $msg .= "• \"เมนู\" → ดูทุกคำสั่ง";
    return ["type" => "text", "text" => $msg];
}

// ============================================================
// Helpers
// ============================================================
function statusLabelTH(string $status): string {
    switch ($status) {
        case "pending":       return "⏳ รอดำเนินการ";
        case "assigned":      return "👤 มอบหมายช่างแล้ว";
        case "in_progress":   return "⚙️ กำลังดำเนินการ";
        case "waiting_parts": return "📦 รออะไหล่";
        case "completed":     return "✅ ซ่อมเสร็จแล้ว";
        case "cancelled":     return "❌ ยกเลิก / ซ่อมไม่ได้";
        default:              return $status;
    }
}

function priorityLabelTH(string $priority): string {
    switch ($priority) {
        case "urgent": return "🔴 เร่งด่วนมาก";
        case "high":   return "🟠 เร่งด่วน";
        case "medium": return "🟡 ปานกลาง";
        case "low":    return "🟢 ต่ำ";
        default:       return $priority;
    }
}

function containsAny(string $text, array $keywords): bool {
    foreach ($keywords as $keyword) {
        if (mb_strpos($text, $keyword, 0, "UTF-8") !== false) return true;
    }
    return false;
}
