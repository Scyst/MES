<?php
// transport-system/api/auth/token_utils.php

// A static secret key for HMAC signature. In production, this should come from .env
$jwtSecret = getenv('JWT_SECRET') ?: 'SNC_TRANSPORT_SECURE_KEY_2026_V1_RANDOM_HASH';

/**
 * Creates a signed token string: base64(payload).signature
 */
function createSignedToken($payloadArray) {
    global $jwtSecret;
    $payloadJson = json_encode($payloadArray);
    $payloadB64 = base64_encode($payloadJson);
    $signature = hash_hmac('sha256', $payloadB64, $jwtSecret);
    return $payloadB64 . '.' . $signature;
}

/**
 * Verifies a signed token string and returns the payload array if valid.
 * Returns null if invalid or tampered with.
 */
function verifySignedToken($tokenStr) {
    global $jwtSecret;
    if (empty($tokenStr)) return null;
    
    $parts = explode('.', $tokenStr);
    if (count($parts) !== 2) return null;
    
    list($payloadB64, $signature) = $parts;
    
    $expectedSignature = hash_hmac('sha256', $payloadB64, $jwtSecret);
    
    if (hash_equals($expectedSignature, $signature)) {
        $payloadJson = base64_decode($payloadB64);
        return json_decode($payloadJson, true);
    }
    
    return null;
}
?>
