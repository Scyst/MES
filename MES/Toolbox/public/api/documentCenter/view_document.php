<?php
/**
 * view_document.php
 * Secure Document Streamer with Dynamic On-the-Fly Watermark and Audit Access Logging
 * Toolbox OS - MES & IIoT Sandbox (B9)
 */

error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../utils/logger.php';

// Helper to locate library files
function findLibraryFile($relativeTail) {
    $candidates = [
        __DIR__ . '/../../../../utils/libs/' . $relativeTail,
        __DIR__ . '/../../../MES/MES/utils/libs/' . $relativeTail,
        __DIR__ . '/../../MES/MES/utils/libs/' . $relativeTail,
        __DIR__ . '/../MES/MES/utils/libs/' . $relativeTail
    ];
    foreach ($candidates as $c) {
        if (file_exists($c)) return realpath($c);
    }
    return null;
}

// Helper to locate upload directory
function getDocUploadDir() {
    $candidates = [
        __DIR__ . '/../../../../uploads/documentCenter/',
        __DIR__ . '/../../../MES/MES/uploads/documentCenter/',
        __DIR__ . '/../../MES/MES/uploads/documentCenter/',
        __DIR__ . '/../MES/MES/uploads/documentCenter/',
        __DIR__ . '/../../uploads/documentCenter/'
    ];
    foreach ($candidates as $dir) {
        if (is_dir($dir)) {
            return realpath($dir) . DIRECTORY_SEPARATOR;
        }
    }
    return __DIR__ . '/../../../../uploads/documentCenter/';
}

// Helper to locate watermark image
function getWatermarkImagePath() {
    $candidates = [
        __DIR__ . '/../../../../page/components/images/watermark.png',
        __DIR__ . '/../../../MES/MES/page/components/images/watermark.png',
        __DIR__ . '/../../MES/MES/page/components/images/watermark.png'
    ];
    foreach ($candidates as $c) {
        if (file_exists($c)) return realpath($c);
    }
    return null;
}

$fpdfPath = findLibraryFile('fpdf/fpdf.php');
$fpdiPath = findLibraryFile('fpdi/src/autoload.php');

$hasPdfLibs = ($fpdfPath && $fpdiPath && file_exists($fpdfPath) && file_exists($fpdiPath));
if ($hasPdfLibs) {
    require_once $fpdfPath;
    require_once $fpdiPath;

    if (!class_exists('PDF_Rotate', false)) {
        class PDF_Rotate extends \setasign\Fpdi\Fpdi {
            protected $angle = 0;
            function Rotate($angle, $x=-1, $y=-1) {
                if ($x == -1) $x = $this->x;
                if ($y == -1) $y = $this->y;
                if ($this->angle != 0) $this->_out('Q');
                $this->angle = $angle;
                if ($angle != 0) {
                    $angle *= M_PI/180;
                    $c = cos($angle); $s = sin($angle);
                    $cx = $x*$this->k; $cy = ($this->h - $y)*$this->k;
                    $this->_out(sprintf('q %.5F %.5F %.5F %.5F %.2F %.2F cm 1 0 0 1 %.2F %.2F cm', $c, $s, -$s, $c, $cx, $cy, -$cx, -$cy));
                }
            }
            function _endpage() {
                if ($this->angle != 0) {
                    $this->angle = 0;
                    $this->_out('Q');
                }
                parent::_endpage();
            }
        }
    }
}

try {
    $documentsTable = defined('DOCUMENTS_TABLE') ? DOCUMENTS_TABLE : 'DOCUMENTS';
    $documentLogsTable = defined('DOCUMENT_LOGS_TABLE') ? DOCUMENT_LOGS_TABLE : 'DOCUMENT_ACCESS_LOGS';

    if (!isset($_SESSION['user'])) {
        http_response_code(403);
        die("Access Denied. กรุณาเข้าสู่ระบบก่อนเปิดดูเอกสาร");
    }

    $docId = (int)($_GET['id'] ?? 0);
    $forceDownload = isset($_GET['download']) && $_GET['download'] == 1;

    if (!$docId) {
        http_response_code(400);
        die("Invalid document request.");
    }

    $currentUser = $_SESSION['user'];
    $ipAddress = getClientIpAddress();

    $stmt = $pdo->prepare("SELECT file_name, file_path, file_type FROM dbo.{$documentsTable} WITH (NOLOCK) WHERE id = ?");
    $stmt->execute([$docId]);
    $document = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$document) {
        http_response_code(404);
        die("Document record not found.");
    }

    // Log document access to audit tables
    try {
        $logStmt = $pdo->prepare("INSERT INTO dbo.{$documentLogsTable} (document_id, user_id, ip_address) VALUES (?, ?, ?)");
        $logStmt->execute([$docId, $currentUser['id'], $ipAddress]);

        writeLog(
            $pdo,
            $forceDownload ? 'DOWNLOAD_DOCUMENT' : 'VIEW_DOCUMENT',
            'DOCUMENT_CENTER',
            $docId,
            null,
            ['file_name' => $document['file_name'], 'download' => $forceDownload],
            ($forceDownload ? 'ดาวน์โหลดเอกสาร: ' : 'เปิดอ่านเอกสาร: ') . $document['file_name']
        );
    } catch (Exception $logEx) {
        // Keep streaming even if log fails
    }

    $uploadDir = getDocUploadDir();
    $filePath = $uploadDir . $document['file_path'];

    if (!file_exists($filePath)) {
        http_response_code(404);
        die("Physical file not found on server.");
    }

    $isPdf = (strtolower(pathinfo($document['file_name'], PATHINFO_EXTENSION)) === 'pdf') || 
             (stripos($document['file_type'], 'pdf') !== false);

    if ($isPdf && $hasPdfLibs) {
        $pdf = new PDF_Rotate();
        $pageCount = $pdf->setSourceFile($filePath);
        $watermarkImg = getWatermarkImagePath();

        $watermarkUser = "Viewed by: {$currentUser['username']} on " . date('Y-m-d H:i');
        $watermarkIp = "IP: " . $ipAddress;

        for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
            $templateId = $pdf->importPage($pageNo);
            $size = $pdf->getTemplateSize($templateId);
            $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
            $pdf->useTemplate($templateId);

            if ($watermarkImg && file_exists($watermarkImg)) {
                $imageWidth = 150;
                $imageHeight = 150;
                $x = ($size['width'] - $imageWidth) / 2;
                $y = ($size['height'] - $imageHeight) / 2;
                $pdf->Image($watermarkImg, $x, $y, $imageWidth, $imageHeight, 'PNG');
            }

            $pdf->SetFont('Helvetica', 'I', 8);
            $pdf->SetTextColor(150, 150, 150);
            $margin = 4;

            $pdf->Text($margin, $margin + 3, $watermarkUser);
            $textWidthIp = $pdf->GetStringWidth($watermarkIp);
            $pdf->Text($size['width'] - $textWidthIp - $margin, $margin + 3, $watermarkIp);
            $pdf->Text($margin, $size['height'] - $margin, $watermarkUser);
            $pdf->Text($size['width'] - $textWidthIp - $margin, $size['height'] - $margin, $watermarkIp);
        }

        header('Cache-Control: private, max-age=0, must-revalidate');
        header('Pragma: public');

        if ($forceDownload) {
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . rawurlencode($document['file_name']) . '"');
            $pdf->Output('D', $document['file_name']);
        } else {
            header('Content-Type: application/pdf');
            header('Content-Disposition: inline; filename="' . rawurlencode($document['file_name']) . '"');
            $pdf->Output('I', $document['file_name']);
        }
    } else {
        header('Cache-Control: private, max-age=0, must-revalidate');
        header('Pragma: public');
        if ($forceDownload) {
            header('Content-Type: application/octet-stream');
        } else {
            header('Content-Type: ' . ($document['file_type'] ?: 'application/octet-stream'));
        }
        header('Content-Disposition: attachment; filename="' . rawurlencode($document['file_name']) . '"');
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
    }
} catch (Throwable $e) {
    if (isset($pdo)) {
        writeErrorLog($pdo, 'DOCUMENT_VIEW', $e->getMessage(), ['doc_id' => $docId ?? null]);
    }
    http_response_code(500);
    die("An error occurred while streaming document: " . htmlspecialchars($e->getMessage()));
}
