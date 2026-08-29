<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit();
}

// 1. ตรวจสอบการอ่านค่า JSON ให้ชัดเจน
$json_input = file_get_contents('php://input');
$data = json_decode($json_input, true);

// Debug: บันทึกข้อมูลที่ได้รับลงใน error log (ตรวจสอบที่ไฟล์ log ของ server)
error_log("Register POST Payload: " . $json_input);

// ดึงค่า student_id
$student_id = $data['student_id'] ?? null;
error_log("Extracted student_id: " . var_export($student_id, true));

$username   = trim($data['username']   ?? '');
$password   = trim($data['password']   ?? '');
$name       = trim($data['name']       ?? '');
$email      = trim($data['email']      ?? '');
$phone      = trim($data['phone']      ?? '');
$department = trim($data['department'] ?? '');

// Validation
if (!$username || !$password || !$name || !$email) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "กรุณากรอกข้อมูลให้ครบถ้วน"]);
    exit();
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "รหัสผ่านต้องมีอักขระอย่างน้อย 6 ตัว"]);
    exit();
}

$id   = uniqid('u_', true);
$role = 'student';

try {
    // 2. ตรวจสอบคำสั่ง SQL INSERT INTO
    $stmt = $pdo->prepare("
        INSERT INTO users (id, username, password_hash, name, email, role, department, phone, student_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    // 3. ตรวจสอบและเตรียมตัวแปร (ใช้ Prepared Statement ของ PDO ไม่ใช่ bind_param)
    // การส่งค่าเข้า execute จะผูกค่าให้อัตโนมัติ ไม่ต้องกังวลเรื่องประเภท string/int ในระดับ code
    $stmt->execute([$id, $username, $password, $name, $email, $role, $department, $phone, $student_id]);

    echo json_encode([
        "success" => true,
        "message" => "สมัครสมาชิกสำเร็จ",
        "user" => [
            "id"         => $id,
            "username"   => $username,
            "name"       => $name,
            "email"      => $email,
            "role"       => $role,
            "department" => $department,
            "phone"      => $phone,
            "student_id" => $student_id,
        ]
    ]);
} catch (PDOException $e) {
    error_log("Register DB Error: " . $e->getMessage());
    if ($e->getCode() == 23000) {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "รหัสนักศึกษานี้ถูกใช้งานแล้ว (หรือข้อมูลซ้ำในระบบ)"]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "เกิดข้อผิดพลาดในการบันทึกข้อมูล: " . $e->getMessage()]);
    }
}
