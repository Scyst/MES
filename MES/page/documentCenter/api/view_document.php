<?php
// MES/page/documentCenter/api/view_document.php (IP Address Watermark)

error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

// ### ใช้ File Path เดิมของคุณสำหรับ Library ###
$fpdfPath = __DIR__ . '/../../../utils/libs/fpdf/fpdf.php';
$fpdiPath = __DIR__ . '/../../../utils/libs/fpdi/src/autoload.php';

if (!file_exists($fpdfPath) || !file_exists($fpdiPath)) {
    http_response_code(500);
    die("Server configuration error: FPDF or FPDI library not found.");
}
require_once $fpdfPath;
require_once $fpdiPath;
// #########################################

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

try {
    if (!isset($_SESSION['user'])) {
        http_response_code(403); die("Access Denied.");
    }
    
    $docId = $_GET['id'] ?? null;
    if (!$docId) {
        http_response_code(400); die("Invalid request.");
    }

    $currentUser = $_SESSION['user'];
    $ipAddress = $_SERVER['REMOTE_ADDR']; // IP Address ของผู้ใช้ถูกเก็บไว้ในตัวแปรนี้แล้ว

    $stmt = $pdo->prepare("SELECT file_name, file_path, file_type FROM dbo.DOCUMENTS WHERE id = ?");
    $stmt->execute([$docId]);
    $document = $stmt->fetch();

    if (!$document) {
        http_response_code(404); die("Document not found.");
    }

    $logStmt = $pdo->prepare("INSERT INTO dbo.DOCUMENT_ACCESS_LOGS (document_id, user_id, ip_address) VALUES (?, ?, ?)");
    $logStmt->execute([$docId, $currentUser['id'], $ipAddress]);

    $filePath = __DIR__ . '/../../../documents/' . $document['file_path'];
    if (!file_exists($filePath)) {
        http_response_code(404); die("File not found on server.");
    }

    if ($document['file_type'] === 'application/pdf') {
        $pdf = new PDF_Rotate();
        $pageCount = $pdf->setSourceFile($filePath);

        $watermarkImagePath = __DIR__ . '/../../components/images/watermark.png';
        if (!file_exists($watermarkImagePath)) {
             error_log("Watermark image not found at: " . $watermarkImagePath);
        }

        $watermarkUser = "Viewed by: {$currentUser['username']} on " . date('Y-m-d H:i');
        
        $watermarkIp = "IP: " . $ipAddress;

        for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
            $templateId = $pdf->importPage($pageNo);
            $size = $pdf->getTemplateSize($templateId);
            $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
            $pdf->useTemplate($templateId);

            if (file_exists($watermarkImagePath)) {
                $imageWidth = 150; 
                $imageHeight = 150;
                $x = ($size['width'] - $imageWidth) / 2;
                $y = ($size['height'] - $imageHeight) / 2;
                $pdf->Image($watermarkImagePath, $x, $y, $imageWidth, $imageHeight, 'PNG');
            }

            $pdf->SetFont('Helvetica', 'I', 8);
            $pdf->SetTextColor(150, 150, 150);
            $margin = 3;
            
            $pdf->Text($margin, $margin, $watermarkUser);
            $textWidthIp = $pdf->GetStringWidth($watermarkIp);
            $pdf->Text($size['width'] - $textWidthIp - $margin, $margin, $watermarkIp);
            $pdf->Text($margin, $size['height'] - $margin, $watermarkUser);
            $pdf->Text($size['width'] - $textWidthIp - $margin, $size['height'] - $margin, $watermarkIp);
        }

        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="' . $document['file_name'] . '"');
        $pdf->Output('I', $document['file_name']);

    } else {
        header('Content-Type: ' . $document['file_type']);
        header('Content-Disposition: attachment; filename="' . $document['file_name'] . '"');
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
    }

} catch (Throwable $e) {
    http_response_code(500);
    error_log("View Document Error: " . $e->getMessage() . " on line " . $e->getLine());
    die("An error occurred while processing the document.");
}
?>