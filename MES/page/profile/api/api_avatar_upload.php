<?php
/**
 * api_avatar_upload.php
 * Dedicated endpoint สำหรับอัปโหลดรูปโปรไฟล์
 * รับ multipart/form-data (field: 'avatar')
 * Validates: MIME type, size, dimensions → Upload ไป FTP → Update DB
 */
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../components/php/logger.php';

header('Content-Type: application/json; charset=utf-8');

// CSRF check
if (
    empty($_SERVER['HTTP_X_CSRF_TOKEN'])
    || empty($_SESSION['csrf_token'])
    || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])
) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'CSRF Token Validation Failed.']);
    exit;
}

$currentId = (int)$_SESSION['user']['id'];
$username  = $_SESSION['user']['username'];

// Constants
const MAX_FILE_SIZE    = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIMES    = ['image/jpeg', 'image/png', 'image/webp'];
const OUTPUT_WIDTH     = 256;
const OUTPUT_HEIGHT    = 256;
const FTP_UPLOAD_PATH  = '/MES/MES/uploads/profile_pictures/';

try {
    if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
        $uploadErrors = [
            UPLOAD_ERR_INI_SIZE   => 'ไฟล์ใหญ่เกินค่าที่กำหนดใน PHP config',
            UPLOAD_ERR_FORM_SIZE  => 'ไฟล์ใหญ่เกินค่า MAX_FILE_SIZE ในฟอร์ม',
            UPLOAD_ERR_PARTIAL    => 'ไฟล์อัปโหลดไม่สมบูรณ์',
            UPLOAD_ERR_NO_FILE    => 'ไม่พบไฟล์ที่อัปโหลด',
            UPLOAD_ERR_NO_TMP_DIR => 'ไม่พบโฟลเดอร์ temporary',
            UPLOAD_ERR_CANT_WRITE => 'ไม่สามารถเขียนไฟล์ลงดิสก์ได้',
        ];
        $errCode = $_FILES['avatar']['error'] ?? UPLOAD_ERR_NO_FILE;
        throw new Exception($uploadErrors[$errCode] ?? 'เกิดข้อผิดพลาดในการอัปโหลด');
    }

    $tmpPath  = $_FILES['avatar']['tmp_name'];
    $fileSize = $_FILES['avatar']['size'];

    // 1. ตรวจขนาดไฟล์
    if ($fileSize > MAX_FILE_SIZE) {
        throw new Exception('ขนาดไฟล์ต้องไม่เกิน 2MB');
    }

    // 2. ตรวจ MIME type จากเนื้อหาไฟล์จริง (ไม่เชื่อ client)
    $finfo    = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $tmpPath);
    finfo_close($finfo);

    if (!in_array($mimeType, ALLOWED_MIMES, true)) {
        throw new Exception('รองรับเฉพาะไฟล์ JPEG, PNG, และ WebP เท่านั้น');
    }

    // 3. ตรวจว่าเป็นรูปภาพจริง (ป้องกัน polyglot file attack)
    $imageInfo = @getimagesize($tmpPath);
    if ($imageInfo === false) {
        throw new Exception('ไฟล์ที่อัปโหลดไม่ใช่รูปภาพที่ถูกต้อง');
    }

    // 4. สร้าง GD resource จาก source
    switch ($mimeType) {
        case 'image/jpeg': $srcImage = imagecreatefromjpeg($tmpPath); break;
        case 'image/png':  $srcImage = imagecreatefrompng($tmpPath);  break;
        case 'image/webp': $srcImage = imagecreatefromwebp($tmpPath); break;
        default: throw new Exception('ไม่สามารถประมวลผลรูปภาพได้');
    }

    if (!$srcImage) {
        throw new Exception('ไม่สามารถโหลดรูปภาพเพื่อประมวลผลได้');
    }

    // 5. Resize + Crop เป็น 256×256 (center crop)
    [$srcW, $srcH] = [imagesx($srcImage), imagesy($srcImage)];
    $dstImage      = imagecreatetruecolor(OUTPUT_WIDTH, OUTPUT_HEIGHT);

    // รองรับ transparency (PNG)
    imagealphablending($dstImage, false);
    imagesavealpha($dstImage, true);
    $transparent = imagecolorallocatealpha($dstImage, 0, 0, 0, 127);
    imagefilledrectangle($dstImage, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT, $transparent);

    // Center crop ratio
    $srcRatio = $srcW / $srcH;
    $dstRatio = OUTPUT_WIDTH / OUTPUT_HEIGHT;

    if ($srcRatio > $dstRatio) {
        // Source กว้างกว่า → crop ด้านซ้าย-ขวา
        $cropH  = $srcH;
        $cropW  = (int)($srcH * $dstRatio);
        $cropX  = (int)(($srcW - $cropW) / 2);
        $cropY  = 0;
    } else {
        // Source สูงกว่า → crop ด้านบน-ล่าง
        $cropW  = $srcW;
        $cropH  = (int)($srcW / $dstRatio);
        $cropX  = 0;
        $cropY  = (int)(($srcH - $cropH) / 2);
    }

    imagecopyresampled($dstImage, $srcImage, 0, 0, $cropX, $cropY, OUTPUT_WIDTH, OUTPUT_HEIGHT, $cropW, $cropH);
    imagedestroy($srcImage);

    // 6. บันทึกเป็น WebP ใน temp file
    $localTmpWebp = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'avatar_' . $currentId . '_' . time() . '.webp';
    if (!imagewebp($dstImage, $localTmpWebp, 85)) {
        imagedestroy($dstImage);
        throw new Exception('ไม่สามารถแปลงรูปภาพเป็น WebP ได้');
    }
    imagedestroy($dstImage);

    // 7. กำหนด FTP path ปลายทาง
    $ftpFileName   = 'profile_' . $currentId . '.webp';
    $ftpRemotePath = FTP_UPLOAD_PATH . $ftpFileName;

    // 8. อ่านไฟล์ WebP เพื่อส่งผ่าน MCP (base64)
    $fileContent = file_get_contents($localTmpWebp);
    @unlink($localTmpWebp);

    if ($fileContent === false) {
        throw new Exception('ไม่สามารถอ่านไฟล์ชั่วคราวได้');
    }

    // 9. Upload ไป FTP server ผ่าน HTTP request ไปยัง MCP wrapper
    //    (MCP tools เรียกจาก PHP ไม่ได้โดยตรง — ใช้ file_put_contents ไป temp แล้ว Invoke ผ่าน Node MCP)
    //    Strategy: เขียนไปที่ Web-accessible temp path แล้ว trigger FTP upload via dedicated Node script
    //    หรือ: ใช้ PHP FTP functions โดยตรง
    //    ─── ใช้ PHP FTP extension ─────────────────────────────────

    // โหลด FTP credentials จาก .env / config
    $ftpHost = getenv('FTP_HOST') ?: '10.1.1.31';
    $ftpUser = getenv('FTP_USER') ?: '';
    $ftpPass = getenv('FTP_PASS') ?: '';
    $ftpPort = (int)(getenv('FTP_PORT') ?: 21);

    if (empty($ftpUser)) {
        // Fallback: บันทึกไฟล์ไว้ใน local path แทน (ถ้า FTP ยังไม่ config)
        $localUploadDir = __DIR__ . '/../../../uploads/profile_pictures/';
        if (!is_dir($localUploadDir)) {
            mkdir($localUploadDir, 0755, true);
        }
        $localPath = $localUploadDir . $ftpFileName;
        file_put_contents($localPath, $fileContent);
        $pictureUrl = BASE_URL . '/uploads/profile_pictures/' . $ftpFileName;
    } else {
        $ftpConn = ftp_connect($ftpHost, $ftpPort, 30);
        if (!$ftpConn) {
            throw new Exception('ไม่สามารถเชื่อมต่อ FTP Server ได้');
        }

        if (!ftp_login($ftpConn, $ftpUser, $ftpPass)) {
            ftp_close($ftpConn);
            throw new Exception('FTP login ล้มเหลว');
        }

        ftp_pasv($ftpConn, true);

        // เขียน content ไป temp file แล้ว upload
        $tmpForFtp = tempnam(sys_get_temp_dir(), 'mes_avatar_');
        file_put_contents($tmpForFtp, $fileContent);

        // สร้าง directory ถ้ายังไม่มี
        $remoteDir = FTP_UPLOAD_PATH;
        @ftp_mkdir($ftpConn, $remoteDir);

        if (!ftp_put($ftpConn, $ftpRemotePath, $tmpForFtp, FTP_BINARY)) {
            @unlink($tmpForFtp);
            ftp_close($ftpConn);
            throw new Exception('อัปโหลดไฟล์ไปยัง FTP ล้มเหลว');
        }

        @unlink($tmpForFtp);
        ftp_close($ftpConn);

        $pictureUrl = BASE_URL . '/uploads/profile_pictures/' . $ftpFileName;
    }

    // 10. อัปเดต DB
    $stmtUpdate = $pdo->prepare("
        EXEC " . DB_DATABASE . ".dbo.sp_ManageUser
            @Action         = 'UPDATE_AVATAR',
            @UserId         = ?,
            @ProfilePicture = ?,
            @ActionBy       = ?
    ");
    $stmtUpdate->execute([$currentId, $pictureUrl, $username]);

    // 11. อัปเดต session ทันที
    $_SESSION['user']['profile_picture'] = $pictureUrl;

    writeLog($pdo, 'UPDATE_AVATAR', 'PROFILE', $username, $currentId, null, 'User uploaded new profile picture');

    echo json_encode([
        'success'     => true,
        'message'     => 'อัปโหลดรูปโปรไฟล์สำเร็จ',
        'picture_url' => $pictureUrl
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
