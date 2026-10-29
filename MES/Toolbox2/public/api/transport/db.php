<?php
// Toolbox2/public/api/transport/db.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Load central Toolbox2 config.php (or fallback .env)
$centralConfig = __DIR__ . '/../../config.php';
$localEnv = __DIR__ . '/.env';

if (file_exists($centralConfig)) {
    require_once $centralConfig;
} elseif (file_exists($localEnv)) {
    $lines = file($localEnv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $k = trim($key);
            $v = trim($value);
            $_ENV[$k] = $v;
            if (!defined($k)) define($k, $v);
        }
    }
}

function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $host = defined('DB_HOST') ? DB_HOST : (defined('DB_SERVER') ? DB_SERVER : (getenv('DB_SERVER') ?: '10.1.1.31'));
            $dbName = defined('DB_DATABASE') ? DB_DATABASE : (getenv('DB_DATABASE') ?: 'IIOT_TOOLBOX');
            $user = defined('DB_USER') ? DB_USER : (getenv('DB_USER') ?: 'TOOLBOX');
            $pass = defined('DB_PASSWORD') ? DB_PASSWORD : (getenv('DB_PASSWORD') ?: '');

            $dsn = "sqlsrv:Server=$host;Database=$dbName;TrustServerCertificate=true";
            $pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            sendResponse(false, null, "Database Connection Error: " . $e->getMessage(), 500);
        }
    }
    return $pdo;
}

function sendResponse($success, $data = null, $message = "", $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

function getJsonInput() {
    $json = file_get_contents('php://input');
    return json_decode($json, true) ?: [];
}
?>
