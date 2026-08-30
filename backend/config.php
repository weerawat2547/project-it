<?php
// Polyfills สำหรับ PHP เวอร์ชั่นต่ำกว่า 8.0
if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle) {
        return $needle === '' || strpos($haystack, $needle) === 0;
    }
}
if (!function_exists('str_ends_with')) {
    function str_ends_with($haystack, $needle) {
        return $needle === '' || substr($haystack, -strlen($needle)) === $needle;
    }
}
if (!function_exists('str_contains')) {
    function str_contains($haystack, $needle) {
        return $needle === '' || strpos($haystack, $needle) !== false;
    }
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
// อนุญาต localhost และ Vercel frontend
if (preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)
    || str_ends_with($origin, '.vercel.app')
    || str_ends_with($origin, '.infinityfreeapp.com')
) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ===================================================
// ตั้งค่าฐานข้อมูลอัตโนมัติ (Localhost vs Hosting)
// ===================================================
$serverName = $_SERVER['SERVER_NAME'] ?? 'localhost';
if ($serverName === 'localhost' || $serverName === '127.0.0.1') {
    $host     = getenv('DB_HOST') ?: "localhost";
    $dbname   = getenv('DB_NAME') ?: "it_repair_system";
    $username = getenv('DB_USER') ?: "root";
    $password = getenv('DB_PASS') ?: "";
} else {
    $host     = getenv('DB_HOST') ?: "sql107.infinityfree.com";
    $dbname   = getenv('DB_NAME') ?: "if0_42548973_it_repair";
    $username = getenv('DB_USER') ?: "if0_42548973";
    $password = getenv('DB_PASS') ?: "Wee0900328740";
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "เชื่อมต่อฐานข้อมูลไม่ได้: " . $e->getMessage()]);
    exit();
}
