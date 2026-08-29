<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 🔑 1. ใส่ Groq API Key ของคุณตรงนี้ (รับฟรีได้ที่ console.groq.com)
$apiKey = getenv('GROQ_API_KEY') ?: "YOUR_GROQ_API_KEY_HERE"; 

$data = json_decode(file_get_contents("php://input"), true);
$userMessage = $data['message'] ?? $data['prompt'] ?? '';

if (empty($userMessage)) {
    echo json_encode(["reply" => "กรุณาพิมพ์ข้อความที่ต้องการสอบถามครับ"]);
    exit;
}

$systemPrompt = "คุณคือ AI ผู้ช่วยประจำระบบแจ้งซ่อมอุปกรณ์ IT ตอบเป็นภาษาไทยอย่างสุภาพ กระชับ และเป็นกันเอง";

$payload = [
    // เปลี่ยนโมเดลเป็นรุ่นที่มีให้บริการบน Groq
    "model" => "openai/gpt-oss-20b", 
    "messages" => [
        ["role" => "system", "content" => $systemPrompt],
        ["role" => "user", "content" => $userMessage]
    ],
    "temperature" => 0.7,
    "max_tokens" => 500
];

$ch = curl_init("https://api.groq.com/openai/v1/chat/completions");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . trim($apiKey)
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

$response = curl_exec($ch);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    echo json_encode(["reply" => "การเชื่อมต่อผิดพลาด: " . $curlError]);
    exit();
}

$result = json_decode($response, true);

if (isset($result['error'])) {
    echo json_encode(["reply" => "เกิดข้อผิดพลาด: " . $result['error']['message']]);
    exit();
}

if (isset($result['choices'][0]['message']['content'])) {
    echo json_encode(["reply" => $result['choices'][0]['message']['content']]);
} else {
    echo json_encode(["reply" => "ไม่สามารถประมวลผลคำตอบได้ในขณะนี้"]);
}