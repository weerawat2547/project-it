<?php
if (!defined('CLOUDINARY_CLOUD_NAME')) {
    define('CLOUDINARY_CLOUD_NAME', 'zrsovvpb');
    define('CLOUDINARY_API_KEY',    '128811941525325');
    define('CLOUDINARY_API_SECRET', 'UXp7CVB0IssPK6uz6Hb8jTNFbR8');
}

function uploadToCloudinary(string $filePathOrBase64, string $folder = 'it_repair'): ?string {
    try {
        if (str_starts_with($filePathOrBase64, 'http://') || str_starts_with($filePathOrBase64, 'https://')) {
            return $filePathOrBase64;
        }

        $timestamp = time();
        $sigString = "folder={$folder}&timestamp={$timestamp}" . CLOUDINARY_API_SECRET;
        $signature = sha1($sigString);

        $url = "https://api.cloudinary.com/v1_1/" . CLOUDINARY_CLOUD_NAME . "/image/upload";

        $postFile = (is_file($filePathOrBase64)) ? new CURLFile($filePathOrBase64) : $filePathOrBase64;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_POSTFIELDS     => [
                'file'      => $postFile,
                'api_key'   => CLOUDINARY_API_KEY,
                'timestamp' => $timestamp,
                'signature' => $signature,
                'folder'    => $folder,
            ],
        ]);

        $res  = curl_exec($ch);
        curl_close($ch);

        $data = json_decode($res, true);
        return $data['secure_url'] ?? null;
    } catch (Throwable $e) {
        return null;
    }
}

function uploadBase64ToCloudinary(string $base64String, string $folder = 'it_repair'): ?string {
    return uploadToCloudinary($base64String, $folder);
}
