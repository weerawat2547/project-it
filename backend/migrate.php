<?php
require_once __DIR__ . '/config.php';
header("Content-Type: application/json; charset=UTF-8");

$queries = [
    "ALTER TABLE repair_requests ADD COLUMN technician_notes TEXT NULL",
    "ALTER TABLE repair_requests ADD COLUMN status_history LONGTEXT NULL",
    "ALTER TABLE repair_requests ADD COLUMN after_images LONGTEXT NULL",
    "ALTER TABLE repair_requests ADD COLUMN repair_image TEXT NULL",
    "ALTER TABLE repair_requests ADD COLUMN completed_at DATETIME NULL",
    "ALTER TABLE repair_requests ADD COLUMN updated_at DATETIME NULL",
    "ALTER TABLE users ADD COLUMN student_id VARCHAR(50) NULL",
    "ALTER TABLE users ADD COLUMN department VARCHAR(100) NULL",
    "ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL",
    "ALTER TABLE users ADD COLUMN line_user_id VARCHAR(100) NULL"
];

$results = [];
foreach ($queries as $q) {
    try {
        $pdo->exec($q);
        $results[] = ["query" => $q, "status" => "success"];
    } catch (Throwable $e) {
        $results[] = ["query" => $q, "status" => "skipped/exists", "error" => $e->getMessage()];
    }
}

echo json_encode(["success" => true, "message" => "Database schema verified and updated", "results" => $results], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
