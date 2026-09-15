// script/link_loading.js
// ฟีเจอร์ Link Loading Report - ไฟล์ใหม่ ไม่กระทบ cctv_downloader.js เดิม

document.addEventListener('DOMContentLoaded', function() {

    // ===================== DOM Elements =====================
    var btnFetchLoading   = document.getElementById('btnFetchLoading');
    var btnApplyLink      = document.getElementById('btnApplyLink');
    var linkDateInput     = document.getElementById('linkDateInput');
    var linkSelectAll     = document.getElementById('linkSelectAll');
    var linkTableBody     = document.getElementById('linkTableBody');
    var linkTableContainer = document.getElementById('linkTableContainer');
    var linkLoadingState  = document.getElementById('linkLoadingState');
    var linkEmptyState    = document.getElementById('linkEmptyState');
    var linkResultInfo    = document.getElementById('linkResultInfo');
    var linkResultCount   = document.getElementById('linkResultCount');
    var linkSelectedCount = document.getElementById('linkSelectedCount');
    var linkBadgeCount    = document.getElementById('linkBadgeCount');
    var linkInlineMsg     = document.getElementById('linkInlineMsg');
    var linkLoadingModal  = document.getElementById('linkLoadingModal');

    // Data store
    var loadingReportsData = [];

    // Default date = today
    if (linkDateInput) {
        var today = new Date();
        var yyyy = today.getFullYear();
        var mm = String(today.getMonth() + 1).padStart(2, '0');
        var dd = String(today.getDate()).padStart(2, '0');
        linkDateInput.value = yyyy + '-' + mm + '-' + dd;
    }

    // Auto-fetch when modal opens
    if (linkLoadingModal) {
        linkLoadingModal.addEventListener('shown.bs.modal', function() {
            if (!linkTableBody || linkTableBody.children.length === 0) {
                fetchLoadingReports();
            }
        });
    }

    // Search button click
    if (btnFetchLoading) {
        btnFetchLoading.addEventListener('click', fetchLoadingReports);
    }

    // Date input change triggers search
    if (linkDateInput) {
        linkDateInput.addEventListener('change', fetchLoadingReports);
    }

    // Select All checkbox
    if (linkSelectAll) {
        linkSelectAll.addEventListener('change', function() {
            if (!linkTableBody) return;
            var checkboxes = linkTableBody.querySelectorAll('.link-row-check');
            var isChecked = linkSelectAll.checked;
            checkboxes.forEach(function(cb) { cb.checked = isChecked; });
            updateRowHighlights();
            updateSelectionCount();
        });
    }

    // Event delegation for individual checkboxes
    if (linkTableBody) {
        linkTableBody.addEventListener('change', function(e) {
            if (e.target.classList.contains('link-row-check')) {
                updateRowHighlights();
                updateSelectionCount();
                syncSelectAllState();
            }
        });

        // Click on row to toggle checkbox (UX improvement)
        linkTableBody.addEventListener('click', function(e) {
            if (e.target.type === 'checkbox' || e.target.closest('input[type="checkbox"]')) return;
            var tr = e.target.closest('tr');
            if (!tr) return;
            var cb = tr.querySelector('.link-row-check');
            if (cb) {
                cb.checked = !cb.checked;
                updateRowHighlights();
                updateSelectionCount();
                syncSelectAllState();
            }
        });
    }

    // Apply button
    if (btnApplyLink) {
        btnApplyLink.addEventListener('click', applySelectedReports);
    }

    // Event delegation สำหรับปุ่มเคลียข้อมูลในแถว batch (ทุกแถวรวมถึงแถวแรก)
    document.addEventListener('click', function(e) {
        var btnClear = e.target.closest('.btn-clear-row');
        if (!btnClear) return;
        var row = btnClear.closest('.batch-row');
        if (!row) return;

        var startInput   = row.querySelector('.start-time-input');
        var endInput     = row.querySelector('.end-time-input');
        var filenameInput = row.querySelector('.filename-input');
        var estContainer = row.querySelector('.est-time-container');

        if (startInput)    startInput.value    = '';
        if (endInput)      endInput.value      = '';
        if (filenameInput) filenameInput.value = '';
        if (estContainer)  estContainer.style.display = 'none';
    });

    // MutationObserver: อัปเดตเลขลำดับ "รายการที่ N" อัตโนมัติทุกครั้งที่แถวเพิ่ม/ลบ
    function updateRowNumbers() {
        var batchContainer = document.getElementById('batchContainer');
        if (!batchContainer) return;
        var rows = batchContainer.querySelectorAll('.batch-row');
        rows.forEach(function(row, index) {
            var numSpan = row.querySelector('.row-num');
            if (numSpan) numSpan.textContent = index + 1;
        });
    }

    var batchContainerEl = document.getElementById('batchContainer');
    if (batchContainerEl) {
        updateRowNumbers(); // ตั้งต้นครั้งแรก
        var batchObserver = new MutationObserver(function() {
            updateRowNumbers();
        });
        batchObserver.observe(batchContainerEl, { childList: true, subtree: false });
    }

    // ===================== Core Functions =====================


    function fetchLoadingReports() {
        var date = linkDateInput ? linkDateInput.value : '';
        if (!date) {
            showLinkMessage('warning', 'กรุณาเลือกวันที่');
            return;
        }

        // Reset UI states
        if (linkLoadingState)  linkLoadingState.style.display = 'block';
        if (linkTableContainer) linkTableContainer.style.display = 'none';
        if (linkEmptyState)    linkEmptyState.style.display = 'none';
        if (linkResultInfo)    linkResultInfo.style.display = 'none';
        if (linkInlineMsg)     linkInlineMsg.style.display = 'none';
        if (btnFetchLoading)   btnFetchLoading.disabled = true;

        fetch('api/link_loading.php?date=' + encodeURIComponent(date))
            .then(function(res) { return res.json(); })
            .then(function(result) {
                if (btnFetchLoading)  btnFetchLoading.disabled = false;
                if (linkLoadingState) linkLoadingState.style.display = 'none';

                if (!result.success) {
                    showLinkMessage('danger', result.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
                    return;
                }

                loadingReportsData = result.data || [];

                if (loadingReportsData.length === 0) {
                    if (linkEmptyState)  linkEmptyState.style.display = 'block';
                    if (linkResultInfo)  linkResultInfo.style.display = 'none';
                    return;
                }

                // Show results info badge
                if (linkResultInfo)  linkResultInfo.style.display = 'block';
                if (linkResultCount) linkResultCount.textContent = loadingReportsData.length;

                // Render table
                renderTable(loadingReportsData);
                if (linkTableContainer) linkTableContainer.style.display = 'block';

                // Reset selections
                if (linkSelectAll) linkSelectAll.checked = false;
                updateSelectionCount();
            })
            .catch(function(err) {
                if (btnFetchLoading)  btnFetchLoading.disabled = false;
                if (linkLoadingState) linkLoadingState.style.display = 'none';
                showLinkMessage('danger', 'เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.toString());
            });
    }

    function renderTable(data) {
        if (!linkTableBody) return;
        linkTableBody.innerHTML = '';

        data.forEach(function(row, index) {
            var tr = document.createElement('tr');

            // Highlight row if file already exists
            if (row.already_exists) {
                tr.classList.add('row-exists');
            }

            // Build status badge HTML
            var statusHtml = '<span class="link-status-badge link-status-none">--</span>';
            if (row.already_exists) {
                if (row.exists_status === 'downloaded') {
                    statusHtml = '<span class="link-status-badge link-status-downloaded"><i class="fas fa-check-circle me-1"></i>มีไฟล์แล้ว</span>';
                } else if (row.exists_status === 'downloading') {
                    statusHtml = '<span class="link-status-badge link-status-downloading"><i class="fas fa-spinner fa-spin me-1"></i>กำลังโหลด</span>';
                } else if (row.exists_status === 'queued') {
                    statusHtml = '<span class="link-status-badge link-status-queued"><i class="fas fa-clock me-1"></i>รอคิว</span>';
                }
            }

            // Format times for display (show only HH:mm)
            var startDisplay = row.loading_start_time ? row.loading_start_time.substring(11) : '--';
            var endDisplay   = row.loading_end_time   ? row.loading_end_time.substring(11)   : '--';

            tr.innerHTML =
                '<td><input type="checkbox" class="form-check-input link-row-check" data-index="' + index + '"></td>' +
                '<td class="link-row-num">' + (index + 1) + '</td>' +
                '<td><span class="link-report-id">#' + escapeHtml(String(row.report_id || '')) + '</span></td>' +
                '<td class="link-po-number">' + escapeHtml(row.po_number || '--') + '</td>' +
                '<td>' + escapeHtml(row.container_no || '--') + '</td>' +
                '<td class="link-time-cell"><i class="fas fa-play-circle text-success me-1" style="font-size:0.7rem"></i>' + startDisplay + '</td>' +
                '<td class="link-time-cell"><i class="fas fa-stop-circle text-danger me-1" style="font-size:0.7rem"></i>' + endDisplay + '</td>' +
                '<td>' + statusHtml + '</td>';

            linkTableBody.appendChild(tr);
        });
    }

    function updateSelectionCount() {
        var checked = linkTableBody ? linkTableBody.querySelectorAll('.link-row-check:checked').length : 0;

        if (linkSelectedCount) linkSelectedCount.textContent = checked;
        if (btnApplyLink)      btnApplyLink.disabled = (checked === 0);

        // Update badge on main button
        if (linkBadgeCount) {
            if (checked > 0) {
                linkBadgeCount.textContent = checked;
                linkBadgeCount.style.display = 'inline-block';
            } else {
                linkBadgeCount.style.display = 'none';
            }
        }
    }

    function updateRowHighlights() {
        if (!linkTableBody) return;
        var rows = linkTableBody.querySelectorAll('tr');
        rows.forEach(function(tr) {
            var cb = tr.querySelector('.link-row-check');
            if (cb) {
                if (cb.checked) {
                    tr.classList.add('row-selected');
                } else {
                    tr.classList.remove('row-selected');
                }
            }
        });
    }

    function syncSelectAllState() {
        if (!linkSelectAll || !linkTableBody) return;
        var allChecks = linkTableBody.querySelectorAll('.link-row-check');
        var allChecked = allChecks.length > 0 && Array.from(allChecks).every(function(cb) { return cb.checked; });
        linkSelectAll.checked = allChecked;
    }

    function applySelectedReports() {
        if (!linkTableBody) return;
        var checkedBoxes = linkTableBody.querySelectorAll('.link-row-check:checked');
        if (checkedBoxes.length === 0) return;

        var batchContainer = document.getElementById('batchContainer');
        if (!batchContainer) return;

        var addedItems    = [];   // { modalRow, po }
        var skippedItems  = [];   // { modalRow, po, reason }

        checkedBoxes.forEach(function(cb) {
            var idx = parseInt(cb.getAttribute('data-index'));
            var row = loadingReportsData[idx];
            if (!row) return;

            var modalRowNum = idx + 1;
            var po          = row.po_number || '(ไม่ระบุ)';

            // Sanitize PO number for filename (same regex as download.php)
            var sanitizedFilename = (row.po_number || 'unknown').replace(/[^a-zA-Z0-9_\-]/g, '_');

            // Time validation
            var startTime = row.loading_start_time ? row.loading_start_time.replace(' ', 'T') : '';
            var endTime   = row.loading_end_time   ? row.loading_end_time.replace(' ', 'T')   : '';

            if (!startTime || !endTime) {
                skippedItems.push({ modalRow: modalRowNum, po: po, reason: 'ข้อมูลเวลาไม่ครบ' });
                return;
            }
            if (new Date(endTime) <= new Date(startTime)) {
                skippedItems.push({ modalRow: modalRowNum, po: po, reason: 'เวลาจบต้องมากกว่าเวลาเริ่ม' });
                return;
            }

            // Duplicate check
            var existingFilenames = Array.from(batchContainer.querySelectorAll('.filename-input'))
                .map(function(input) { return input.value.trim().toLowerCase(); });

            if (existingFilenames.includes(sanitizedFilename.toLowerCase())) {
                skippedItems.push({ modalRow: modalRowNum, po: po, reason: 'ซ้ำกับรายการในฟอร์มแล้ว' });
                return;
            }

            // Smart Row Management: หาช่องว่างใดๆ ที่มีอยู่ในฟอร์มก่อน
            var targetRow = null;
            var allRows = Array.from(batchContainer.querySelectorAll('.batch-row'));
            
            for (var r = 0; r < allRows.length; r++) {
                var rStart = allRows[r].querySelector('.start-time-input').value;
                var rEnd   = allRows[r].querySelector('.end-time-input').value;
                var rName  = allRows[r].querySelector('.filename-input').value;
                if (!rStart && !rEnd && !rName) {
                    targetRow = allRows[r];
                    break;
                }
            }

            if (!targetRow) {
                var templateRow = batchContainer.querySelector('.batch-row');
                if (!templateRow) return;
                var newRow = templateRow.cloneNode(true);
                newRow.querySelector('.start-time-input').value = '';
                newRow.querySelector('.end-time-input').value   = '';
                newRow.querySelector('.filename-input').value   = '';
                newRow.querySelector('.est-time-container').style.display = 'none';
                newRow.querySelector('.btn-remove-row').style.display = 'inline-block';
                batchContainer.appendChild(newRow);
                targetRow = newRow;
            }

            var startInput    = targetRow.querySelector('.start-time-input');
            var endInput      = targetRow.querySelector('.end-time-input');
            var filenameInput = targetRow.querySelector('.filename-input');

            startInput.value    = startTime;
            endInput.value      = endTime;
            filenameInput.value = sanitizedFilename;

            startInput.dispatchEvent(new Event('change', { bubbles: true }));
            endInput.dispatchEvent(new Event('change', { bubbles: true }));

            addedItems.push({ modalRow: modalRowNum, po: po });
        });

        // Close modal
        if (linkLoadingModal) {
            var modalInstance = bootstrap.Modal.getInstance(linkLoadingModal);
            if (modalInstance) modalInstance.hide();
        }

        // --- Render split notification blocks ---
        var statusContainer = document.getElementById('downloadStatusContainer');
        var statusText      = document.getElementById('downloadStatusText');
        var spinner         = document.getElementById('downloadSpinner');

        if (!statusContainer || !statusText || !spinner) return;

        statusContainer.style.display = 'block';

        var html = '';

        // Success block
        if (addedItems.length > 0) {
            var addedLines = addedItems.map(function(it) {
                return '<span style="margin-left:1rem;">&#8226; รายการที่ ' + it.modalRow + ': <strong>' + escapeHtml(it.po) + '</strong></span>';
            }).join('<br>');

            html += '<div style="margin-bottom:' + (skippedItems.length > 0 ? '0.75rem' : '0') + ';">'
                  + '<span style="color:#15803d;font-weight:700;"><i class="fas fa-check-circle me-1"></i>เติมข้อมูลลงฟอร์มสำเร็จ ' + addedItems.length + ' รายการ</span><br>'
                  + addedLines
                  + '</div>';
        }

        // Failure block
        if (skippedItems.length > 0) {
            var skippedLines = skippedItems.map(function(it) {
                return '<span style="margin-left:1rem;">&#8226; รายการที่ ' + it.modalRow + ' (' + escapeHtml(it.po) + '): <span style="color:#b91c1c;">' + escapeHtml(it.reason) + '</span></span>';
            }).join('<br>');

            html += '<div>'
                  + '<span style="color:#b45309;font-weight:700;"><i class="fas fa-exclamation-triangle me-1"></i>ข้ามทั้งหมด ' + skippedItems.length + ' รายการ</span><br>'
                  + skippedLines
                  + '</div>';
        }

        if (html === '') {
            html = '<span style="color:#b91c1c;"><i class="fas fa-times-circle me-1"></i>ไม่สามารถเติมข้อมูลได้</span>';
        }

        // Set alert class based on outcome
        if (addedItems.length > 0 && skippedItems.length === 0) {
            statusContainer.className = 'alert alert-success mt-3';
            spinner.className = 'fas fa-check-circle me-2 d-none';
        } else if (addedItems.length > 0 && skippedItems.length > 0) {
            statusContainer.className = 'alert alert-warning mt-3';
            spinner.className = 'fas fa-exclamation-triangle me-2 d-none';
        } else {
            statusContainer.className = 'alert alert-danger mt-3';
            spinner.className = 'fas fa-times-circle me-2 d-none';
        }

        statusText.innerHTML = html;

        // Reset badge on main button
        if (linkBadgeCount) linkBadgeCount.style.display = 'none';
    }

    // ===================== Utility Functions =====================

    function showLinkMessage(type, message) {
        if (!linkInlineMsg) return;
        linkInlineMsg.style.display = 'block';
        linkInlineMsg.className = 'mt-2 alert alert-' + type;
        linkInlineMsg.textContent = message;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
