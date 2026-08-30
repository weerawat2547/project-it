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

function uploadMultipleToCloudinary(array $items, string $folder = 'it_repair'): array {
    $results = [];
    $toUpload = [];

    foreach ($items as $idx => $item) {
        if (empty($item) || !is_string($item)) continue;
        if (str_starts_with($item, 'http://') || str_starts_with($item, 'https://')) {
            $results[$idx] = $item;
        } else {
            $toUpload[$idx] = $item;
        }
    }

    if (empty($toUpload)) {
        ksort($results);
        return array_values($results);
    }

    $mh = curl_multi_init();
    $curlHandles = [];

    foreach ($toUpload as $idx => $base64OrPath) {
        $timestamp = time();
        $sigString = "folder={$folder}&timestamp={$timestamp}" . CLOUDINARY_API_SECRET;
        $signature = sha1($sigString);
        $url = "https://api.cloudinary.com/v1_1/" . CLOUDINARY_CLOUD_NAME . "/image/upload";

        $postFile = (is_file($base64OrPath)) ? new CURLFile($base64OrPath) : $base64OrPath;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_POSTFIELDS     => [
                'file'      => $postFile,
                'api_key'   => CLOUDINARY_API_KEY,
                'timestamp' => $timestamp,
                'signature' => $signature,
                'folder'    => $folder,
            ],
        ]);

        curl_multi_add_handle($mh, $ch);
        $curlHandles[$idx] = [
            'ch' => $ch,
            'original' => $base64OrPath
        ];
    }

    $running = null;
    do {
        $status = curl_multi_exec($mh, $running);
        if ($running) {
            curl_multi_select($mh, 0.1);
        }
    } while ($running > 0 && $status === CURLM_OK);

    foreach ($curlHandles as $idx => $meta) {
        $ch = $meta['ch'];
        $res = curl_multi_getcontent($ch);
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);

        $data = json_decode($res, true);
        if (!empty($data['secure_url'])) {
            $results[$idx] = $data['secure_url'];
        } else {
            $results[$idx] = $meta['original'];
        }
    }

    curl_multi_close($mh);
    ksort($results);
    return array_values($results);
}
