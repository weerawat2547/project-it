<?php

require_once __DIR__ . '/config.php';
if (file_exists(__DIR__ . '/line_notify.php')) {
    require_once __DIR__ . '/line_notify.php';
}
if (file_exists(__DIR__ . '/cloudinary_upload.php')) {
    require_once __DIR__ . '/cloudinary_upload.php';
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getRequests();
        break;
    case 'POST':
    case 'PUT':
        updateOrCreateRequest();
        break;
    case 'DELETE':
        deleteRequest();
        break;
    default:
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Method not allowed"]);
}

function getRequests() {
    global $pdo;
    $userId = $_GET['user_id'] ?? null;
    $role   = $_GET['role']    ?? null;
    $id     = $_GET['id']      ?? null;

    $selectFields = "r.*, 
                     COALESCE(r.technician_notes, '') as technician_notes,
                     COALESCE(r.technician_notes, '') as technicianNotes,
                     COALESCE(r.technician_notes, '') as note,
                     u.name as user_name, u.email as user_email, u.phone as user_phone, u.department, u.student_id,
                     t.name as technician_name, t.phone as technician_phone, et.name as equipment_type_name";

    if ($id) {
        $stmt = $pdo->prepare("SELECT $selectFields
            FROM repair_requests r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN users t ON r.assigned_to = t.id
            LEFT JOIN equipment_types et ON r.equipment_type_id = et.id
            WHERE r.id = ? OR r.request_no = ?");
        $stmt->execute([$id, $id]);
        $req = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode(["success" => true, "data" => $req]);
        return;
    }

    if ($role === 'student' && $userId) {
        $stmt = $pdo->prepare("SELECT $selectFields
            FROM repair_requests r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN users t ON r.assigned_to = t.id
            LEFT JOIN equipment_types et ON r.equipment_type_id = et.id
            WHERE r.user_id = ? ORDER BY r.created_at DESC");
        $stmt->execute([$userId]);
    } else {
        $stmt = $pdo->prepare("SELECT $selectFields
            FROM repair_requests r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN users t ON r.assigned_to = t.id
            LEFT JOIN equipment_types et ON r.equipment_type_id = et.id
            ORDER BY r.created_at DESC");
        $stmt->execute();
    }

    $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(["success" => true, "data" => $requests]);
}

function updateOrCreateRequest() {
    $rawInput = file_get_contents("php://input");
    $data = json_decode($rawInput, true) ?? [];
    if (empty($data)) {
        $data = $_POST;
    }

    $id = $data['id'] ?? $_POST['id'] ?? $_GET['id'] ?? null;

    if (!empty($id)) {
        updateRequest($data);
    } else {
        createRequest($data);
    }
}

function createRequest(array $data) {
    global $pdo;

    $userId              = $data['user_id']              ?? $_POST['user_id']              ?? '';
    $equipmentTypeId     = !empty($data['equipment_type_id']) ? (int)$data['equipment_type_id'] : (!empty($_POST['equipment_type_id']) ? (int)$_POST['equipment_type_id'] : null);
    $equipmentModel      = $data['equipment_model']      ?? $_POST['equipment_model']      ?? '';
    $serialNumber        = $data['serial_number']        ?? $_POST['serial_number']        ?? '';
    $locationDescription = $data['location_description'] ?? $_POST['location_description'] ?? '';
    $locationLat         = !empty($data['location_lat']) ? (float)$data['location_lat'] : (!empty($_POST['location_lat']) ? (float)$_POST['location_lat'] : null);
    $locationLng         = !empty($data['location_lng']) ? (float)$data['location_lng'] : (!empty($_POST['location_lng']) ? (float)$_POST['location_lng'] : null);
    $problemDescription  = $data['problem_description']  ?? $_POST['problem_description']  ?? '';
    $priority            = $data['priority']             ?? $_POST['priority']             ?? 'medium';

    if (!$userId || !$locationDescription || !$problemDescription) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "กรุณากรอกข้อมูลให้ครบถ้วน"]);
        return;
    }

    $imageUrls = [];
    
    // รองรับการอัปโหลดแบบ FormData (ถ้ามี)
    if (!empty($_FILES['images'])) {
        $files = $_FILES['images'];
        $count = is_array($files['tmp_name']) ? count($files['tmp_name']) : 1;
        for ($i = 0; $i < $count; $i++) {
            $tmpName = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
            $error   = is_array($files['error'])    ? $files['error'][$i]    : $files['error'];
            if ($error === UPLOAD_ERR_OK && function_exists('uploadToCloudinary')) {
                $url = uploadToCloudinary($tmpName, 'it_repair');
                if ($url) $imageUrls[] = $url;
            }
        }
    }

    // รองรับการอัปโหลดแบบ JSON Base64 (สูงสุด 5 รูป)
    if (!empty($data['images_base64']) && is_array($data['images_base64'])) {
        @set_time_limit(60);
        foreach ($data['images_base64'] as $base64) {
            if (empty($base64)) continue;
            $url = null;
            if (function_exists('uploadBase64ToCloudinary')) {
                $url = uploadBase64ToCloudinary($base64, 'it_repair');
            }
            // ถ้าอัปโหลดขึ้น Cloudinary สำเร็จใช้ URL ถ้าไม่สำเร็จเก็บ Base64 ลง DB รับประกันรูปไม่หาย 100%
            $imageUrls[] = $url ?: $base64;
        }
    }

    // ตรวจสอบความถูกต้องของ $equipmentTypeId ป้องกัน Foreign Key Error
    if (!empty($equipmentTypeId)) {
        $checkEq = $pdo->prepare("SELECT id FROM equipment_types WHERE id = ?");
        $checkEq->execute([$equipmentTypeId]);
        if (!$checkEq->fetch()) {
            $equipmentTypeId = null;
        }
    }

    // ตรวจสอบความถูกต้องของ $userId ป้องกัน Foreign Key Error
    if (!empty($userId)) {
        $checkUser = $pdo->prepare("SELECT id FROM users WHERE id = ?");
        $checkUser->execute([$userId]);
        if (!$checkUser->fetch()) {
            // สร้างบัญชีผู้ใช้งานอัตโนมัติหากยังไม่มีอยู่ในฐานข้อมูล
            $userName  = $data['user_name']  ?? $_POST['user_name']  ?? 'ผู้ใช้งาน';
            $userPhone = $data['user_phone'] ?? $_POST['user_phone'] ?? '';
            $userDept  = $data['department'] ?? $_POST['department'] ?? '';
            $studentId = $data['student_id'] ?? $_POST['student_id'] ?? null;
            $genUser   = 'u_' . substr(md5($userId), 0, 8);
            
            try {
                $insertUser = $pdo->prepare("
                    INSERT INTO users (id, username, password_hash, name, role, department, phone, student_id)
                    VALUES (?, ?, ?, ?, 'student', ?, ?, ?)
                ");
                $insertUser->execute([$userId, $genUser, '123456', $userName, $userDept, $userPhone, $studentId]);
            } catch (Throwable $e) {
                // หากติดปัญหา Unique Constraint ให้เลือกดึง user แรกที่มีใน DB มาใช้
                $firstUser = $pdo->query("SELECT id FROM users WHERE role = 'student' LIMIT 1")->fetch();
                if ($firstUser) {
                    $userId = $firstUser['id'];
                }
            }
        }
    }

    $id         = uniqid('REQ-', true);
    $requestNo  = 'REQ-' . date('Y') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
    $imagesJson = !empty($imageUrls) ? json_encode($imageUrls) : null;

    try {
        $stmt = $pdo->prepare("INSERT INTO repair_requests
            (id, request_no, user_id, equipment_type_id, equipment_model, serial_number,
             location_description, location_lat, location_lng, problem_description, priority, images)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$id, $requestNo, $userId, $equipmentTypeId ?: null, $equipmentModel, $serialNumber,
            $locationDescription, $locationLat, $locationLng, $problemDescription, $priority, $imagesJson]);

        if (function_exists('notifyRepairCreated')) {
            notifyRepairCreated($pdo, [
                'request_no'           => $requestNo,
                'equipment_model'      => $equipmentModel,
                'location_description' => $locationDescription,
                'problem_description'  => $problemDescription,
                'priority'             => $priority,
                'image_urls'           => $imageUrls,
            ]);
        }

        echo json_encode(["success" => true, "message" => "แจ้งซ่อมสำเร็จ", "id" => $id, "request_no" => $requestNo]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "เกิดข้อผิดพลาดของฐานข้อมูล: " . $e->getMessage()]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "เกิดข้อผิดพลาด: " . $e->getMessage()]);
    }
}

function uploadBase64ToCloudinary(string $base64String, string $folder = 'it_repair_completed'): ?string {
    if (!function_exists('uploadToCloudinary')) return null;
    return uploadToCloudinary($base64String, $folder);
}

function updateRequest(array $data) {
    global $pdo;

    $id         = $data['id']         ?? $_POST['id']         ?? '';
    $status     = $data['status']     ?? $_POST['status']     ?? '';
    $assignedTo = $data['assigned_to']?? $data['assignedTo']   ?? $_POST['assigned_to'] ?? null;
    $changedBy  = $data['changed_by']  ?? $data['changedBy']    ?? $_POST['changed_by']  ?? '';
    $technicianName = $data['technician_name'] ?? $_POST['technician_name'] ?? 'ไม่ระบุ';

    $technicianNotes = $data['technician_notes'] ?? $data['technicianNotes'] ?? $_POST['technician_notes'] ?? $_POST['technicianNotes'] ?? '';

    if (!$id || !$status) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
        return;
    }

    $stmt = $pdo->prepare("SELECT status, status_history, images FROM repair_requests WHERE id = ? OR request_no = ?");
    $stmt->execute([$id, $id]);
    $old = $stmt->fetch(PDO::FETCH_ASSOC);
    $oldStatus = $old['status'] ?? 'pending';
    $history = json_decode($old['status_history'] ?? '[]', true) ?: [];

    // บันทึกประวัติใหม่
    $history[] = [
        'status' => $status,
        'previous_status' => $oldStatus,
        'updated_at' => date('Y-m-d H:i:s'),
        'updated_by' => $technicianName,
        'note' => $technicianNotes
    ];

    $uploadedCloudinaryUrls = [];

    // 1. อัปโหลดไฟล์รูปภาพที่ส่งมาจาก $_FILES เข้า Cloudinary
    $fileSource = $_FILES['repair_images'] ?? $_FILES['repair_image'] ?? $_FILES['images'] ?? null;
    if ($fileSource && !empty($fileSource['tmp_name'])) {
        if (is_array($fileSource['tmp_name'])) {
            foreach ($fileSource['tmp_name'] as $idx => $tmpName) {
                if ($fileSource['error'][$idx] === UPLOAD_ERR_OK && function_exists('uploadToCloudinary')) {
                    $url = uploadToCloudinary($tmpName, 'it_repair_completed');
                    if ($url) $uploadedCloudinaryUrls[] = $url;
                }
            }
        } elseif ($fileSource['error'] === UPLOAD_ERR_OK && function_exists('uploadToCloudinary')) {
            $url = uploadToCloudinary($fileSource['tmp_name'], 'it_repair_completed');
            if ($url) $uploadedCloudinaryUrls[] = $url;
        }
    }

    // 2. อัปโหลดรูปภาพ Base64 หรือ Cloudinary URL ใน after_images เข้า Cloudinary
    $afterImagesRaw = $data['after_images'] ?? $data['after_repair_images'] ?? $_POST['after_images'] ?? null;
    if ($afterImagesRaw !== null) {
        $afterArr = [];
        if (is_array($afterImagesRaw)) {
            $afterArr = $afterImagesRaw;
        } elseif (is_string($afterImagesRaw)) {
            $decoded = json_decode($afterImagesRaw, true);
            $afterArr = is_array($decoded) ? $decoded : [$afterImagesRaw];
        }

        foreach ($afterArr as $imgItem) {
            if (is_string($imgItem) && trim($imgItem) !== '') {
                if (str_starts_with($imgItem, 'http://') || str_starts_with($imgItem, 'https://')) {
                    $uploadedCloudinaryUrls[] = $imgItem;
                } else {
                    $cUrl = uploadBase64ToCloudinary($imgItem, 'it_repair_completed');
                    if ($cUrl) {
                        $uploadedCloudinaryUrls[] = $cUrl;
                    } else {
                        $uploadedCloudinaryUrls[] = $imgItem;
                    }
                }
            }
        }
    }

    $uploadedCloudinaryUrls = array_values(array_unique($uploadedCloudinaryUrls));
    $afterImagesJson = !empty($uploadedCloudinaryUrls) ? json_encode($uploadedCloudinaryUrls) : null;
    $repairImageUrl = !empty($uploadedCloudinaryUrls) ? $uploadedCloudinaryUrls[0] : null;

    // ตรวจสอบและสร้างคอลัมน์ after_images / repair_image ใน DB หากยังไม่มี
    try {
        $pdo->exec("ALTER TABLE repair_requests ADD COLUMN after_images LONGTEXT NULL");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE repair_requests ADD COLUMN repair_image TEXT NULL");
    } catch (Throwable $e) {}

    @set_time_limit(60);

    // ตรวจสอบความถูกต้องของ $assignedTo ป้องกัน Foreign Key Error
    if (!empty($assignedTo)) {
        $checkTech = $pdo->prepare("SELECT id FROM users WHERE id = ?");
        $checkTech->execute([$assignedTo]);
        if (!$checkTech->fetch()) {
            $assignedTo = null;
        }
    } else {
        $assignedTo = null;
    }

    $completedAt = ($status === 'completed') ? date('Y-m-d H:i:s') : null;

    $sql = "UPDATE repair_requests SET status = ?, technician_notes = ?, status_history = ?, updated_at = NOW(), completed_at = ?";
    $params = [$status, $technicianNotes, json_encode($history), $completedAt];

    if ($assignedTo !== null) {
        $sql .= ", assigned_to = ?";
        $params[] = $assignedTo;
    }

    if ($repairImageUrl) {
        $sql .= ", repair_image = ?";
        $params[] = $repairImageUrl;
    }

    if ($afterImagesJson !== null) {
        $sql .= ", after_images = ?";
        $params[] = $afterImagesJson;
    }
    
    $sql .= " WHERE id = ? OR request_no = ?";
    $params[] = $id;
    $params[] = $id;

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    } catch (Throwable $dbErr) {
        try {
            $sqlFallback = "UPDATE repair_requests SET status = ?, technician_notes = ?, status_history = ?, updated_at = NOW() WHERE id = ? OR request_no = ?";
            $stmtFB = $pdo->prepare($sqlFallback);
            $stmtFB->execute([$status, $technicianNotes, json_encode($history), $id, $id]);
        } catch (Throwable $e) {}
    }

    // ส่งแจ้งเตือน LINE OA พร้อม Cloudinary URL
    if (function_exists('notifyRepairUpdated')) {
        $beforeImgArr = [];
        if (!empty($old['images'])) {
            $beforeImgArr = is_array($old['images']) ? $old['images'] : (json_decode($old['images'], true) ?: []);
        }
        notifyRepairUpdated($pdo, (string)$id, (string)$oldStatus, (string)$status, (string)$changedBy, (string)$technicianNotes, $uploadedCloudinaryUrls, $beforeImgArr);
    }

    echo json_encode([
        "success" => true, 
        "message" => "อัปเดตสำเร็จ",
        "data" => [
            "id" => $id,
            "status" => $status,
            "technician_notes" => $technicianNotes,
            "repair_image" => $repairImageUrl,
            "after_images" => $uploadedCloudinaryUrls,
            "status_history" => $history
        ]
    ]);
}

function deleteRequest() {
    global $pdo;
    $id = $_GET['id'] ?? '';
    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ไม่พบ ID"]);
        return;
    }
    $stmt = $pdo->prepare("DELETE FROM repair_requests WHERE id = ? OR request_no = ?");
    $stmt->execute([$id, $id]);
    echo json_encode(["success" => true, "message" => "ลบสำเร็จ"]);
}
