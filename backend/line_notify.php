<?php
if (basename($_SERVER['PHP_SELF']) === 'line_notify.php') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }

    $rawInput = file_get_contents('php://input');
    file_put_contents('debug.log', date('Y-m-d H:i:s') . ' - Payload: ' . $rawInput . PHP_EOL, FILE_APPEND);
    
    // ตั้งตัวแปร global เพื่อให้ใช้ข้างล่างได้
    $GLOBALS['line_notify_raw_input'] = $rawInput;
}
define('LINE_CHANNEL_TOKEN', 'DHjt0bQw6MKuH6jxwmD+nER4YGp+ixenbssdcDyU4Gw/zsFVB9k5tGGmbLTM+hsNYe70/kC5V/m7/8/CXOW5TBXrFdFnLaGfpx6cN2ZBgDn+c/yJWqFS0u5qu87TJEeb061QTJ/iHPYeYpzmCbb18wdB04t89/1O/w1cDnyilFU=');

function sendLineMessage(string $userId, string $message, array $imageUrls = []): bool {
    if (empty($userId) || empty($message)) return false;

    $validUrls = [];
    foreach ($imageUrls as $url) {
        if (is_string($url) && (str_starts_with($url, 'http://') || str_starts_with($url, 'https://'))) {
            // LINE API บังคับให้เป็น HTTPS เท่านั้น หาก Cloudinary คืนค่า HTTP ต้องแปลงก่อน ไม่งั้น LINE จะไม่ส่งข้อความเลย!
            $secureUrl = str_replace('http://', 'https://', $url);
            $validUrls[] = $secureUrl;
        }
    }

    // LINE Push รองรับสูงสุด 5 ข้อความต่อครั้ง: ข้อความตัวหนังสือ 1 + รูปภาพ 4
    $firstBatch = array_slice($validUrls, 0, 4);
    $secondBatch = array_slice($validUrls, 4);

    $messages = [
        ["type" => "text", "text" => $message]
    ];

    foreach ($firstBatch as $url) {
        $messages[] = [
            "type" => "image",
            "originalContentUrl" => $url,
            "previewImageUrl"   => $url
        ];
    }

    $ch = curl_init("https://api.line.me/v2/bot/message/push");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_POSTFIELDS     => json_encode(["to" => $userId, "messages" => $messages]),
        CURLOPT_HTTPHEADER     => [
            "Content-Type: application/json",
            "Authorization: Bearer " . LINE_CHANNEL_TOKEN,
        ],
    ]);
    $res  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // หากมีรูปภาพเกิน 4 รูป (เช่น รูปที่ 5) ให้ยิงชุดที่สองส่งรูปที่เหลือให้ครบ 100%
    if (!empty($secondBatch)) {
        $extraMessages = [];
        foreach ($secondBatch as $url) {
            $extraMessages[] = [
                "type" => "image",
                "originalContentUrl" => $url,
                "previewImageUrl"   => $url
            ];
        }
        $ch2 = curl_init("https://api.line.me/v2/bot/message/push");
        curl_setopt_array($ch2, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_TIMEOUT        => 5,
            CURLOPT_POSTFIELDS     => json_encode(["to" => $userId, "messages" => $extraMessages]),
            CURLOPT_HTTPHEADER     => [
                "Content-Type: application/json",
                "Authorization: Bearer " . LINE_CHANNEL_TOKEN,
            ],
        ]);
        curl_exec($ch2);
        curl_close($ch2);
    }

    return $code === 200;
}

function notifyRepairCreated(PDO $pdo, array $request): void {
    $msg = "🔧 แจ้งซ่อมใหม่!\n";
    $msg .= "เลขที่: {$request['request_no']}\n";
    $msg .= "อุปกรณ์: {$request['equipment_model']}\n";
    $msg .= "สถานที่: {$request['location_description']}\n";
    $msg .= "ปัญหา: {$request['problem_description']}\n";
    $msg .= "ความเร่งด่วน: " . priorityLabel($request['priority']) . "\n";

    if (!empty($request['image_urls'])) {
        $msg .= "📷 รูปภาพ (" . count($request['image_urls']) . " รูป):\n";
        foreach ($request['image_urls'] as $i => $url) {
            $msg .= "รูปที่ " . ($i + 1) . ": {$url}\n";
        }
    }

    $msg .= "เวลา: " . date('d/m/Y H:i');

    $stmt = $pdo->prepare(
        "SELECT line_user_id FROM users
         WHERE role IN ('admin','technician')
           AND is_active = 1
           AND line_user_id IS NOT NULL
           AND line_user_id != ''"
    );
    $stmt->execute();
    $recipients = $stmt->fetchAll(PDO::FETCH_COLUMN);

    foreach ($recipients as $userId) {
        sendLineMessage($userId, $msg, $request['image_urls'] ?? []);
    }
}

function notifyRepairUpdated(
    PDO $pdo, 
    string $requestId, 
    string $oldStatus, 
    string $newStatus, 
    string $changedBy, 
    string $technicianNotes = '',
    array $afterImagesParam = [],
    array $beforeImagesParam = []
): void {
    // 1. ดึงข้อมูลใบแจ้งซ่อมและผู้แจ้ง
    $stmt = $pdo->prepare("
        SELECT r.*,
               u.name as requester_name, u.line_user_id as requester_line_id
        FROM repair_requests r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.id = ? OR r.request_no = ?
    ");
    $stmt->execute([$requestId, $requestId]);
    $info = $stmt->fetch(PDO::FETCH_ASSOC);

    // 2. ค้นหาชื่อผู้แก้ไข (changer)
    $changerName = 'ช่างเทคนิค';
    if (!empty($changedBy)) {
        $stmtC = $pdo->prepare("SELECT name FROM users WHERE id = ?");
        $stmtC->execute([$changedBy]);
        $cRow = $stmtC->fetch(PDO::FETCH_ASSOC);
        if (!empty($cRow['name'])) {
            $changerName = $cRow['name'];
        } else {
            $changerName = $changedBy;
        }
    }

    $requestNo = $info['request_no'] ?? $requestId;
    $equipmentModel = $info['equipment_model'] ?? '-';
    $locationDesc = $info['location_description'] ?? '-';

    $dbNote = trim((string)($info['technician_notes'] ?? ''));
    $paramNote = trim((string)$technicianNotes);
    $finalNote = ($paramNote !== '' && $paramNote !== '-') ? $paramNote : (($dbNote !== '') ? $dbNote : '-');

    // 3. จัดการรูปภาพ ก่อนซ่อม (Before) และ หลังซ่อม (After)
    $beforeImages = [];
    $bRaw = !empty($beforeImagesParam) ? $beforeImagesParam : ($info['images'] ?? null);
    if (!empty($bRaw)) {
        $bArr = is_array($bRaw) ? $bRaw : (json_decode($bRaw, true) ?: [$bRaw]);
        foreach ($bArr as $img) {
            if (is_string($img) && (str_starts_with($img, 'http://') || str_starts_with($img, 'https://'))) {
                $beforeImages[] = $img;
            } elseif (is_string($img) && str_contains($img, ';base64,') && function_exists('uploadBase64ToCloudinary')) {
                $cUrl = uploadBase64ToCloudinary($img, 'it_repair');
                if ($cUrl) $beforeImages[] = $cUrl;
            }
        }
    }

    $afterImages = [];
    $aRaw = !empty($afterImagesParam) ? $afterImagesParam : ($info['after_images'] ?? $info['repair_image'] ?? null);
    if (!empty($aRaw)) {
        $aArr = is_array($aRaw) ? $aRaw : (json_decode($aRaw, true) ?: [$aRaw]);
        foreach ($aArr as $img) {
            if (is_string($img) && (str_starts_with($img, 'http://') || str_starts_with($img, 'https://'))) {
                $afterImages[] = $img;
            } elseif (is_string($img) && str_contains($img, ';base64,') && function_exists('uploadBase64ToCloudinary')) {
                $cUrl = uploadBase64ToCloudinary($img, 'it_repair_completed');
                if ($cUrl) $afterImages[] = $cUrl;
            }
        }
    }

    $msg = "📋 อัปเดตสถานะงานซ่อม\n";
    $msg .= "เลขที่: " . ($requestNo !== '' ? $requestNo : '-') . "\n";
    if ($equipmentModel !== '-') $msg .= "อุปกรณ์: {$equipmentModel}\n";
    if ($locationDesc !== '-') $msg .= "สถานที่: {$locationDesc}\n";
    $msg .= "สถานะเดิม: " . statusLabel($oldStatus) . "\n";
    $msg .= "สถานะใหม่: " . statusLabel($newStatus) . "\n";
    $msg .= "💬 หมายเหตุ: " . ($finalNote !== '' ? $finalNote : '-') . "\n";
    $msg .= "อัปเดตโดย: " . ($changerName !== '' ? $changerName : 'ช่างเทคนิค') . "\n";

    // แสดงรายการรูปภาพก่อนซ่อม (Before)
    if (!empty($beforeImages)) {
        $msg .= "\n📷 รูปภาพก่อนซ่อม (Before):\n";
        foreach ($beforeImages as $i => $url) {
            $msg .= "- รูปที่ " . ($i + 1) . ": {$url}\n";
        }
    }

    // แสดงรายการรูปภาพหลังซ่อมเสร็จ (After)
    if (!empty($afterImages)) {
        $msg .= "\n📸 รูปภาพหลังซ่อมเสร็จ (After):\n";
        foreach ($afterImages as $i => $url) {
            $msg .= "- รูปที่ " . ($i + 1) . ": {$url}\n";
        }
    }

    $msg .= "\nเวลา: " . date('d/m/Y H:i');

    // รวบรวมรูปภาพ HTTP/HTTPS สำหรับแนบเข้า LINE Image Messages (นำรูปผลงานหลังซ่อมขึ้นก่อน)
    $onlineImageUrls = [];
    foreach (array_merge((array)$afterImages, (array)$beforeImages) as $imgUrl) {
        if (is_string($imgUrl) && (str_starts_with($imgUrl, 'http://') || str_starts_with($imgUrl, 'https://'))) {
            $onlineImageUrls[] = $imgUrl;
        }
    }

    // ส่งให้ผู้แจ้งซ่อม (ถ้ามี LINE ID)
    if (!empty($info['requester_line_id'])) {
        sendLineMessage($info['requester_line_id'], $msg, $onlineImageUrls);
    }

    // ส่งให้ Admin และ Technician
    $stmtAdmin = $pdo->prepare("
        SELECT line_user_id FROM users
        WHERE role IN ('admin', 'technician') AND is_active = 1
          AND line_user_id IS NOT NULL AND line_user_id != ''
    ");
    $stmtAdmin->execute();
    $admins = $stmtAdmin->fetchAll(PDO::FETCH_COLUMN);
    foreach ($admins as $adminLineId) {
        if (!empty($info['requester_line_id']) && $info['requester_line_id'] === $adminLineId) {
            continue;
        }
        sendLineMessage($adminLineId, $msg, $onlineImageUrls);
    }
}

function statusLabel(string $status): string {
    switch ($status) {
        case 'pending':       return '⏳ รอดำเนินการ';
        case 'assigned':      return '👤 มอบหมายแล้ว';
        case 'in_progress':   return '⚙️ กำลังดำเนินการ';
        case 'waiting_parts': return '📦 รออะไหล่';
        case 'completed':     return '✅ ซ่อมเสร็จแล้ว';
        case 'cancelled':     return '❌ ยกเลิก/ซ่อมไม่ได้';
        default:              return $status;
    }
}

function priorityLabel(string $priority): string {
    switch ($priority) {
        case 'urgent': return '🔴 เร่งด่วนมาก';
        case 'high':   return '🟠 เร่งด่วน';
        case 'medium': return '🟡 ปานกลาง';
        case 'low':    return '🟡 ปานกลาง';
        default:       return $priority;
    }
}


$rawInputToCheck = $GLOBALS['line_notify_raw_input'] ?? '';
if (!empty($rawInputToCheck)) {
    $input = json_decode($rawInputToCheck, true);

    // บันทึก Log สำหรับตรวจสอบ
    file_put_contents('debug.log', date('Y-m-d H:i:s') . ' - Decoded Input: ' . print_r($input, true) . PHP_EOL, FILE_APPEND);

    $action = $input['action'] ?? $input['type'] ?? '';

    if (in_array($action, ['update_status', 'update_repair', 'new_repair'], true)) {
        require_once __DIR__ . '/config.php';
        
        if (!isset($pdo)) {
            echo json_encode(["success" => false, "message" => "Database connection failed"]);
            exit();
        }
        
        if ($action === 'new_repair') {
            notifyRepairCreated($pdo, [
                'request_no'           => $input['ticket_id'] ?? $input['request_no'] ?? 'REQ-NEW',
                'equipment_model'      => $input['device'] ?? $input['equipment_model'] ?? 'อุปกรณ์',
                'location_description' => $input['location'] ?? $input['location_description'] ?? 'ไม่ระบุ',
                'problem_description'  => $input['problem'] ?? $input['problem_description'] ?? '-',
                'priority'             => $input['priority'] ?? 'medium',
                'image_urls'           => $input['images'] ?? [],
            ]);
            echo json_encode(["success" => true, "message" => "New repair notification sent"]);
            exit();
        }

        $reqId = $input['request_id'] ?? $input['ticket_id'] ?? '';
        $oldSt = $input['old_status'] ?? 'pending';
        $newSt = $input['new_status'] ?? $input['status'] ?? '';
        $chBy  = (string)($input['changed_by'] ?? $input['changedBy'] ?? $input['reporter'] ?? 'ช่างเทคนิค');
        $notes = (string)($input['technician_notes'] ?? $input['technicianNotes'] ?? $input['note'] ?? '-');

        $afterImgs  = $input['after_images'] ?? $input['afterImages'] ?? [];
        $beforeImgs = $input['before_images'] ?? $input['beforeImages'] ?? $input['images'] ?? [];

        if (is_string($afterImgs)) {
            $afterImgs = json_decode($afterImgs, true) ?: [$afterImgs];
        }
        if (is_string($beforeImgs)) {
            $beforeImgs = json_decode($beforeImgs, true) ?: [$beforeImgs];
        }

        notifyRepairUpdated($pdo, $reqId, $oldSt, $newSt, $chBy, $notes, (array)$afterImgs, (array)$beforeImgs);
        echo json_encode(["success" => true, "message" => "Notification sent"]);
        exit();
    }
}
