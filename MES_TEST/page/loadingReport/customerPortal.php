<?php
require_once __DIR__ . '/../../config/config.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SNC - Document Tracking</title>
    <link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="../../utils/libs/fontawesome/css/all.min.css">
    <style>
        body { background-color: #f4f6f9; font-family: 'Sarabun', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .tracking-box { background: #fff; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); width: 100%; max-width: 500px; }
        .logo-text { color: #0d6efd; font-weight: 800; font-size: 1.5rem; letter-spacing: 1px; }
    </style>
</head>
<body>

<div class="tracking-box text-center">
    <div class="mb-4">
        <i class="fas fa-search-location fa-3x text-primary mb-2"></i>
        <div class="logo-text">SNC TRACKING</div>
        <div class="text-muted small">C-TPAT Loading Inspection Document</div>
    </div>

    <form id="trackingForm" onsubmit="searchDocument(event)">
        <div class="mb-3 text-start">
            <label class="form-label fw-bold small text-muted">Search by PO Number, Container or Invoice No.</label>
            <input type="text" id="searchInput" class="form-control form-control-lg bg-light" placeholder="e.g. PO-12345 or INV-001" required>
        </div>
        <button type="submit" id="btnSearch" class="btn btn-primary btn-lg w-100 fw-bold shadow-sm">
            <i class="fas fa-search me-2"></i> Find Document
        </button>
    </form>

    <div id="searchResult" class="mt-4 text-start d-none"></div>
</div>

<script src="../../utils/libs/jquery-3.6.0.min.js"></script>
<script>
function searchDocument(e) {
    e.preventDefault();
    const input = $('#searchInput').val().trim();
    if(!input) return;

    $('#btnSearch').html('<i class="fas fa-spinner fa-spin me-2"></i> Searching...').prop('disabled', true);
    $('#searchResult').addClass('d-none').empty();

    $.post('api/customerViewAPI.php', { action: 'search', keyword: input }, function(res) {
        $('#btnSearch').html('<i class="fas fa-search me-2"></i> Find Document').prop('disabled', false);
        
        if(res.success && res.data.length > 0) {
            let html = '<h6 class="fw-bold border-bottom pb-2 mb-3">Found Document(s):</h6><div class="list-group">';
            res.data.forEach(doc => {
                const ref = btoa('SNC-' + doc.report_id);
                html += `
                    <a href="customerView.php?ref=${ref}" target="_blank" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                        <div>
                            <div class="fw-bold text-primary">${doc.po_number}</div>
                            <small class="text-muted">INV: ${doc.snc_ci_no || '-'} | Cont: ${doc.container_no}</small>
                        </div>
                        <i class="fas fa-external-link-alt text-secondary"></i>
                    </a>`;
            });
            html += '</div>';
            $('#searchResult').html(html).removeClass('d-none');
        } else {
            $('#searchResult').html('<div class="alert alert-warning mb-0 text-center"><i class="fas fa-exclamation-circle me-2"></i> No completed document found.</div>').removeClass('d-none');
        }
    }, 'json').fail(function() {
        $('#btnSearch').html('<i class="fas fa-search me-2"></i> Find Document').prop('disabled', false);
        $('#searchResult').html('<div class="alert alert-danger mb-0 text-center">System Error.</div>').removeClass('d-none');
    });
}
</script>
</body>
</html>