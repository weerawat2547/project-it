<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 🔑 1. นำ API Key ที่ได้จาก console.groq.com มาใส่ตรงนี้
$apiKey = "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"; 

$data = json_decode(file_get_contents("php://input"), true);
$userMessage = $data['message'] ?? $data['prompt'] ?? '';

if (empty($userMessage)) {
    echo json_encode(["reply" => "PHP ได้รับข้อความว่างเปล่า (Empty Payload)"]);
    exit;
}

$systemPrompt = "คุณคือ AI ผู้ช่วยประจำระบบแจ้งซ่อมอุปกรณ์ IT ตอบอย่างสุภาพและกระชับ";

$payload = [
    "model" => "llama-3.3-70b-versatile",
    "messages" => [
        ["role" => "system", "content" => $systemPrompt],
        ["role" => "user", "content" => $userMessage]
    ]
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

// แสดง cURL Error ออกหน้าแชท
if ($curlError) {
    echo json_encode(["reply" => "cURL Connection Error: " . $curlError]);
    exit();
}

$result = json_decode($response, true);

// แสดง Groq API Error ออกหน้าแชท
if (isset($result['error'])) {
    echo json_encode(["reply" => "Groq API Error: " . $result['error']['message']]);
    exit();
}

// ส่งคำตอบที่ได้จาก AI
if (isset($result['choices'][0]['message']['content'])) {
    echo json_encode(["reply" => $result['choices'][0]['message']['content']]);
} else {
    echo json_encode(["reply" => "Groq Response Unknown Format: " . $response]);
}