<?php
require_once __DIR__ . '/config.php';
$stmt = $pdo->query("SELECT * FROM repair_requests ORDER BY created_at DESC LIMIT 5");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
