"use strict";

document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // 1. DOM Element References & State Management
    // =================================================================
    const commandCenterBtn = document.getElementById('commandCenterBtn');
    const commandCenterBadge = document.getElementById('command-center-badge');
    const commandCenterMenu = document.getElementById('command-center-menu');
    const dockingSidebar = document.getElementById('docking-sidebar');

    if (!commandCenterBtn || !dockingSidebar) {
        console.warn('Docking Sidebar elements not found. Manager will not run.');
        return;
    }

    const activePanels = new Set(); 

    // =================================================================
    // 2. Core Functions (ฟังก์ชันหลัก)
    // =================================================================

    const fetchSummary = async () => {
        try {
            const response = await fetch(`../components/api/get_alert_summary.php`);
            if (!response.ok) throw new Error(`Network Error: ${response.status}`);
            
            const result = await response.json();
            
            if (result.success) {
                const summary = result.summary;
                commandCenterBadge.textContent = summary.total_alerts > 0 ? summary.total_alerts : '';
                
                commandCenterMenu.innerHTML = `
                    <li class="dropdown-header">Command Center</li>
                    <li><hr class="dropdown-divider"></li>
                `;
                
                summary.categories.forEach(cat => {
                    const li = document.createElement('li');
                    const link = document.createElement('a');
                    link.className = 'dropdown-item';
                    link.href = '#';
                    
                    if (cat.type === 'action') {
                        link.classList.add('text-primary');
                        link.innerHTML = `<i class="fas ${cat.icon}"></i> <span>${cat.name}</span>`;
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            openPanel(cat.id, cat.name);
                        });
                    } else {
                        link.innerHTML = `
                            <i class="fas ${cat.icon}"></i>
                            <span>${cat.name}</span>
                            ${cat.count > 0 ? `<span class="badge rounded-pill bg-danger">${cat.count}</span>` : ''}
                        `;
                        
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            if (activePanels.has(cat.id)) {
                                closePanel(cat.id);
                            } else {
                                openPanel(cat.id, cat.name);
                            }
                        });
                    }
                    li.appendChild(link);
                    commandCenterMenu.appendChild(li);
                });
            }
        } catch (error) {
            console.error("Fetch Summary Error:", error);
            commandCenterMenu.innerHTML = `<li class="px-3 text-danger">Error loading data.</li>`;
        }
    };

    const openPanel = (panelId, panelTitle, data = {}) => {
        if (activePanels.has(panelId)) {
            const existingPanel = document.getElementById(`panel-${panelId}`);
            if (existingPanel) {
                existingPanel.scrollIntoView({ behavior: 'smooth' });
            }
            return;
        }

        const panel = document.createElement('div');
        panel.className = 'docking-panel';
        panel.id = `panel-${panelId}`;
        panel.dataset.panelData = JSON.stringify(data); 

        panel.innerHTML = `
            <div class="docking-panel-header">
                <span class="docking-panel-title">${panelTitle}</span>
                <button class="docking-panel-close-btn" title="Close Panel">&times;</button>
            </div>
            <div class="docking-panel-body">
                <div class="text-center p-3"><div class="spinner-border spinner-border-sm"></div> กำลังโหลด...</div>
            </div>
        `;
        
        dockingSidebar.appendChild(panel);
        activePanels.add(panelId);
        
        panel.querySelector('.docking-panel-close-btn').addEventListener('click', () => {
            closePanel(panelId);
        });

        if (!dockingSidebar.classList.contains('open')) {
            dockingSidebar.classList.add('open');
            document.body.classList.add('docking-sidebar-open');
        }

        resizePanels();
        loadPanelContent(panelId, panel.querySelector('.docking-panel-body'), panel);
    };

    const closePanel = (panelId) => {
        const panel = document.getElementById(`panel-${panelId}`);
        if (panel) {
            panel.classList.add('is-closing');
            panel.addEventListener('transitionend', () => {
                panel.remove();
                activePanels.delete(panelId);
    
                if (activePanels.size === 0) {
                    dockingSidebar.classList.remove('open');
                    document.body.classList.remove('docking-sidebar-open');
                } else {
                    resizePanels();
                }
            }, { once: true });
        }
    };

    const resizePanels = () => {
        const panels = dockingSidebar.querySelectorAll('.docking-panel');
        const panelCount = panels.length;
        if (panelCount > 0) {
            const height = 100 / panelCount;
            panels.forEach(p => p.style.flexBasis = `${height}%`);
        }
    };

    const loadPanelContent = async (panelId, panelBody, panel) => {
        if (panelId === 'stock_management') {
            panelBody.innerHTML = `
                <div class="stock-panel p-0">
                    <ul class="nav nav-tabs nav-fill p-2">
                        <li class="nav-item">
                            <a class="nav-link active" href="#" data-tab="low_stock">สต็อกใกล้หมด</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-success" href="#" data-tab="search">+ ติดตาม</a>
                        </li>
                    </ul>
                    <div class="tab-content p-2" id="stock-tab-content" style="max-height: calc(100vh - 120px); overflow-y: auto;">
                        <div class="text-center p-3"><div class="spinner-border spinner-border-sm"></div></div>
                    </div>
                </div>
            `;

            const tabContent = panelBody.querySelector('#stock-tab-content');
            const tabs = panelBody.querySelectorAll('.nav-link');

            // --- ฟังก์ชันย่อยสำหรับจัดการแต่ละ View ---

            const renderManageItem = async (itemData) => {
                tabContent.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm"></div></div>';
                try {
                    const [itemRes, stockRes] = await Promise.all([
                        fetch(`../inventorySettings/api/itemMasterManage.php?action=get_items&search=${encodeURIComponent(itemData.sapNo)}`),
                        fetch(`../production/api/inventoryManage.php?action=get_stock_details_by_item&item_id=${itemData.itemId}`)
                    ]);
                    const itemResult = await itemRes.json();
                    const stockResult = await stockRes.json();
                    if (!itemResult.success || !stockResult.success) throw new Error('ไม่สามารถดึงข้อมูลได้');

                    const itemDetails = itemResult.data[0];
                    const stockDetails = stockResult.data;

                    let stockHtml = '<ul class="list-group list-group-flush mb-3">';
                    if (stockDetails.length > 0) {
                        stockDetails.forEach(stock => {
                            stockHtml += `<li class="list-group-item d-flex justify-content-between align-items-center">${stock.location_name}<span class="badge bg-secondary rounded-pill">${parseFloat(stock.quantity).toFixed(2)}</span></li>`;
                        });
                    } else {
                        stockHtml += '<li class="list-group-item text-muted">ไม่มีสต็อกในคลัง</li>';
                    }
                    stockHtml += '</ul>';

                    tabContent.innerHTML = `
                        <div>
                            <button class="btn btn-outline-secondary btn-sm mb-3" id="back-to-stock-btn"><i class="fas fa-arrow-left"></i> กลับ</button>
                            <h6><i class="fas fa-map-marker-alt"></i> สต็อกคงคลัง</h6>
                            ${stockHtml}
                            <hr>
                            <h6><i class="fas fa-sliders-h"></i> ตั้งค่าสต็อก</h6>
                            <form id="form-manage-stock-${itemData.itemId}">
                                <div class="mb-3">
                                    <label class="form-label">Min Stock</label>
                                    <input type="number" id="min-stock-${itemData.itemId}" class="form-control" value="${itemDetails.min_stock || 0}">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Max Stock</label>
                                    <input type="number" id="max-stock-${itemData.itemId}" class="form-control" value="${itemDetails.max_stock || 0}">
                                </div>
                                <div class="form-check form-switch mb-3">
                                    <input class="form-check-input" type="checkbox" id="is-tracking-${itemData.itemId}" ${itemDetails.is_tracking ? 'checked' : ''}>
                                    <label class="form-check-label" for="is-tracking-${itemData.itemId}">ติดตามสต็อก</label>
                                </div>
                                <button type="submit" class="btn btn-success w-100"><i class="fas fa-save"></i> บันทึก</button>
                            </form>
                        </div>
                    `;

                    tabContent.querySelector('#back-to-stock-btn').addEventListener('click', () => {
                        // กลับไปที่ Tab ที่เคยอยู่ก่อนหน้า
                        const activeTab = panelBody.querySelector('.nav-link.active').dataset.tab;
                        if(activeTab === 'search') renderSearchTab();
                        else renderLowStockList();
                    });
                    
                    tabContent.querySelector(`#form-manage-stock-${itemData.itemId}`).addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const payload = { item_details: itemDetails, routes_data: [] };
                        payload.item_details.min_stock = tabContent.querySelector(`#min-stock-${itemData.itemId}`).value;
                        payload.item_details.max_stock = tabContent.querySelector(`#max-stock-${itemData.itemId}`).value;
                        payload.item_details.is_tracking = tabContent.querySelector(`#is-tracking-${itemData.itemId}`).checked;
                        
                        try {
                            const saveRes = await fetch('../inventorySettings/api/itemMasterManage.php?action=save_item_and_routes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
                                body: JSON.stringify(payload)
                            });
                            const saveResult = await saveRes.json();
                            if (saveResult.success) {
                                alert('บันทึกเรียบร้อย');
                                renderLowStockList(); // กลับไปหน้าแรกและโหลดใหม่
                                fetchSummary();
                            } else { throw new Error(saveResult.message); }
                        } catch (error) { alert('Error: ' + error.message); }
                    });
                } catch (error) {
                    tabContent.innerHTML = `<div class="text-center text-danger p-3">${error.message}</div>`;
                }
            };

            const renderLowStockList = async () => {
                tabContent.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm"></div></div>';
                try {
                    const response = await fetch(`../components/api/get_alerts.php`);
                    const result = await response.json();
                    if (!result.success) throw new Error(result.message);

                    tabContent.innerHTML = '';
                    if (result.alerts.length > 0) {
                        result.alerts.forEach(alert => {
                            const alertDiv = document.createElement('div');
                            alertDiv.className = 'alert-item';
                            alertDiv.style.cursor = 'pointer';
                            alertDiv.innerHTML = `
                                <div class="alert-icon"><i class="fas fa-box text-warning"></i></div>
                                <div class="alert-content">
                                    <div class="alert-title">${alert.part_no}</div>
                                    <div class="alert-subtitle">${alert.sap_no}</div>
                                </div>
                            `;
                            alertDiv.addEventListener('click', () => renderManageItem({
                                itemId: alert.item_id, 
                                sapNo: alert.sap_no
                            }));
                            tabContent.appendChild(alertDiv);
                        });
                    } else {
                        tabContent.innerHTML = '<div class="text-center text-muted p-3">ไม่มีรายการสต็อกต่ำ</div>';
                    }
                } catch (error) {
                    tabContent.innerHTML = `<div class="text-center text-danger p-3">${error.message}</div>`;
                }
            };

            const renderSearchTab = () => {
                tabContent.innerHTML = `
                    <div class="mb-3">
                        <input type="text" class="form-control" id="stock-item-search" placeholder="ค้นหาสินค้า..." autocomplete="off">
                        <div id="stock-item-results" class="autocomplete-results" style="position: relative;"></div>
                    </div>
                `;
                
                const searchInput = tabContent.querySelector('#stock-item-search');
                const searchResults = tabContent.querySelector('#stock-item-results');
                let searchTimeout;

                searchInput.addEventListener('keyup', () => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(async () => {
                        const searchTerm = searchInput.value;
                        if (searchTerm.length < 2) {
                            searchResults.style.display = 'none';
                            return;
                        }
                        const response = await fetch(`../inventorySettings/api/itemMasterManage.php?action=get_items&search=${encodeURIComponent(searchTerm)}&limit=10`);
                        const result = await response.json();
                        searchResults.innerHTML = '';
                        if (result.success && result.data.length > 0) {
                            searchResults.style.display = 'block';
                            result.data.forEach(item => {
                                const itemDiv = document.createElement('div');
                                itemDiv.className = 'autocomplete-item';
                                itemDiv.innerHTML = `<strong>${item.sap_no}</strong> - ${item.part_no}`;
                                itemDiv.addEventListener('click', () => renderManageItem({
                                    itemId: item.item_id, 
                                    sapNo: item.sap_no
                                }));
                                searchResults.appendChild(itemDiv);
                            });
                        } else {
                            searchResults.style.display = 'none';
                        }
                    }, 300);
                });
            };
            
            // --- ระบบสลับ Tab ---
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    const view = tab.dataset.tab;
                    if (view === 'low_stock') renderLowStockList();
                    else if (view === 'search') renderSearchTab();
                });
            });

            // โหลด Tab เริ่มต้น
            renderLowStockList();
        } else if (panelId === 'job_order_management') {
            panelBody.innerHTML = `
                <div class="job-order-panel p-0">
                    <ul class="nav nav-tabs nav-fill p-2">
                        <li class="nav-item">
                            <a class="nav-link active" href="#" data-tab="pending">งานที่ค้างอยู่</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" data-tab="history">ประวัติ</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-success" href="#" data-tab="create">+ สร้างใหม่</a>
                        </li>
                    </ul>
                    <div class="tab-content p-2" id="job-order-tab-content" style="max-height: calc(100vh - 120px); overflow-y: auto;">
                        <div class="text-center p-3"><div class="spinner-border spinner-border-sm"></div></div>
                    </div>
                </div>
            `;
        
            const tabContent = panelBody.querySelector('#job-order-tab-content');
            const tabs = panelBody.querySelectorAll('.nav-link');
            let currentView = 'pending';
        
            const renderManageJob = async (jobOrderId) => {
                tabContent.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm"></div></div>';
                try {
                    const response = await fetch(`../components/api/jobOrderManage.php?action=get_details&job_order_id=${jobOrderId}`);
                    const result = await response.json();
                    if (!result.success) throw new Error(result.message);
                    
                    const details = result.data;
                    const dueDate = details.due_date ? new Date(details.due_date).toLocaleDateString('th-TH') : 'ไม่มี';
            
                    tabContent.innerHTML = `
                        <div class="p-2">
                            <button class="btn btn-outline-secondary btn-sm mb-3" id="back-to-pending-btn">
                                <i class="fas fa-arrow-left"></i> กลับไปที่รายการ
                            </button>
                            <h5>จัดการ: ${details.job_order_number}</h5>
                            <ul class="list-group list-group-flush mb-3">
                                <li class="list-group-item"><strong>Part No:</strong> ${details.part_no}</li>
                                <li class="list-group-item"><strong>จำนวน:</strong> ${parseFloat(details.quantity_required).toFixed(2)}</li>
                                <li class="list-group-item"><strong>กำหนดส่ง:</strong> ${dueDate}</li>
                            </ul>
                            <div class="d-grid gap-2">
                                <button class="btn btn-success" id="complete-job-btn"><i class="fas fa-check-circle"></i> ดำเนินการเสร็จสิ้น</button>
                                <button class="btn btn-danger" id="cancel-job-btn"><i class="fas fa-times-circle"></i> ยกเลิกใบสั่งงาน</button>
                            </div>
                        </div>
                    `;
            
                    const updateStatus = async (status) => {
                        const actionText = status === 'COMPLETED' ? 'ปิดงาน' : 'ยกเลิก';
                        if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการ ${actionText} ใบสั่งงานนี้?`)) return;
            
                        try {
                            const saveRes = await fetch('../components/api/jobOrderManage.php?action=update_status', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
                                body: JSON.stringify({ job_order_id: jobOrderId, status: status })
                            });
                            const saveResult = await saveRes.json();
                            if (saveResult.success) {
                                alert(`ใบสั่งงานถูก ${actionText} เรียบร้อยแล้ว`);
                                renderPending(); // กลับไปหน้ารายการ
                                fetchSummary();   // อัปเดต Badge
                            } else {
                                throw new Error(saveResult.message);
                            }
                        } catch (error) {
                            alert('Error: ' + error.message);
                        }
                    };
            
                    tabContent.querySelector('#back-to-pending-btn').addEventListener('click', renderPending);
                    tabContent.querySelector('#complete-job-btn').addEventListener('click', () => updateStatus('COMPLETED'));
                    tabContent.querySelector('#cancel-job-btn').addEventListener('click', () => updateStatus('CANCELLED'));
            
                } catch (error) {
                     tabContent.innerHTML = `<div class="text-center text-danger p-3">${error.message}</div>`;
                }
            };
            
            const renderPending = async () => {
                tabContent.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm"></div></div>';
                try {
                    const response = await fetch(`../components/api/jobOrderManage.php?action=get_pending`);
                    const result = await response.json();
                    if (!result.success) throw new Error(result.message);
            
                    tabContent.innerHTML = '';
                    if (result.data.length > 0) {
                        result.data.forEach(order => {
                            const orderDiv = document.createElement('div');
                            orderDiv.className = 'alert-item';
                            orderDiv.style.cursor = 'pointer';
                            orderDiv.title = 'คลิกเพื่อจัดการ';
                            const dueDate = order.due_date ? new Date(order.due_date).toLocaleDateString('th-TH') : 'N/A';
                            orderDiv.innerHTML = `
                                <div class="alert-icon"><i class="fas fa-list-alt text-info"></i></div>
                                <div class="alert-content">
                                    <div class="alert-title">${order.job_order_number}</div>
                                    <div class="alert-subtitle">${order.part_no || 'N/A'}</div>
                                    <div class="alert-details">จำนวน: ${parseFloat(order.quantity_required).toFixed(2)} | กำหนดส่ง: ${dueDate}</div>
                                </div>
                            `;
                            orderDiv.addEventListener('click', () => renderManageJob(order.job_order_id));
                            tabContent.appendChild(orderDiv);
                        });
                    } else {
                        tabContent.innerHTML = '<div class="text-center text-muted p-3">ไม่มีใบสั่งงานที่ยังค้างอยู่</div>';
                    }
                } catch (error) {
                    tabContent.innerHTML = `<div class="text-center text-danger p-3">${error.message}</div>`;
                }
            };
            
            const renderHistory = () => {
                tabContent.innerHTML = `
                    <div class="row g-2 mb-3">
                        <div class="col-12"><input type="text" class="form-control form-control-sm" id="history-search" placeholder="ค้นหา SAP No / Part No..."></div>
                        <div class="col-md-6"><input type="date" class="form-control form-control-sm" id="history-start-date" title="วันที่เริ่ม"></div>
                        <div class="col-md-6"><input type="date" class="form-control form-control-sm" id="history-end-date" title="วันที่สิ้นสุด"></div>
                        <div class="col-12">
                            <select class="form-select form-select-sm" id="history-status-filter">
                                <option value="">สถานะทั้งหมด</option>
                                <option value="COMPLETED">เสร็จสิ้น (Completed)</option>
                                <option value="CANCELLED">ยกเลิก (Cancelled)</option>
                            </select>
                        </div>
                    </div>
                    <div id="history-results-container"></div>
                `;
            
                const searchInput = tabContent.querySelector('#history-search');
                const startDateInput = tabContent.querySelector('#history-start-date');
                const endDateInput = tabContent.querySelector('#history-end-date');
                const statusFilter = tabContent.querySelector('#history-status-filter');
                const resultsContainer = tabContent.querySelector('#history-results-container');
            
                const fetchAndDisplayHistory = async () => {
                    resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm"></div></div>';
                    try {
                        const params = new URLSearchParams({
                            action: 'get_history',
                            search: searchInput.value,
                            startDate: startDateInput.value,
                            endDate: endDateInput.value,
                            status: statusFilter.value
                        });
                        const response = await fetch(`../components/api/jobOrderManage.php?${params.toString()}`);
                        const result = await response.json();
                        if (!result.success) throw new Error(result.message);
            
                        resultsContainer.innerHTML = '';
                        if (result.data.length > 0) {
                            result.data.forEach(item => {
                                const isCompleted = item.status === 'COMPLETED';
                                const completedDate = item.completed_at ? new Date(item.completed_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';
                                const dueDate = item.due_date ? new Date(item.due_date).toLocaleDateString('th-TH') : 'N/A';
                                const itemWrapper = document.createElement('div');
                                itemWrapper.className = 'alert-item-wrapper mb-1';
                                itemWrapper.innerHTML = `
                                    <div class="alert-item alert-item-header" style="cursor: pointer;">
                                        <div class="alert-icon"><i class="fas ${isCompleted ? 'fa-check-circle text-success' : 'fa-times-circle text-danger'}"></i></div>
                                        <div class="alert-content">
                                            <div class="alert-title">${item.job_order_number}</div>
                                            <div class="alert-subtitle">${item.sap_no} (${item.part_no})</div>
                                            <div class="alert-details"><strong>สถานะ:</strong> ${item.status} | <strong>จำนวน:</strong> ${parseFloat(item.quantity_required).toFixed(2)}</div>
                                        </div>
                                        <div class="alert-expand-icon ms-auto"><i class="fas fa-chevron-down"></i></div>
                                    </div>
                                    <div class="alert-item-details p-2" style="display: none; background-color: var(--bs-tertiary-bg);">
                                        <ul class="list-unstyled mb-0 small">
                                            <li><strong>Description:</strong> ${item.part_description || '-'}</li>
                                            <li class="mt-1"><strong>กำหนดส่ง:</strong> ${dueDate}</li>
                                            <li><strong>วันที่เสร็จสิ้น/ยกเลิก:</strong> ${completedDate}</li>
                                        </ul>
                                    </div>
                                `;
                                resultsContainer.appendChild(itemWrapper);
                            });
                            
                            resultsContainer.querySelectorAll('.alert-item-header').forEach(header => {
                                header.addEventListener('click', () => {
                                    const details = header.nextElementSibling;
                                    const icon = header.querySelector('.alert-expand-icon i');
                                    const isOpening = details.style.display === 'none';
                                    details.style.display = isOpening ? 'block' : 'none';
                                    icon.className = isOpening ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
                                });
                            });
                        } else {
                            resultsContainer.innerHTML = '<div class="text-center text-muted p-3">ไม่พบข้อมูล</div>';
                        }
                    } catch (error) {
                        resultsContainer.innerHTML = `<div class="text-center text-danger p-3">${error.message}</div>`;
                    }
                };
            
                let searchTimeout;
                [searchInput, startDateInput, endDateInput, statusFilter].forEach(el => {
                    el.addEventListener('change', fetchAndDisplayHistory);
                    if (el.id === 'history-search') {
                        el.addEventListener('keyup', () => {
                            clearTimeout(searchTimeout);
                            searchTimeout = setTimeout(fetchAndDisplayHistory, 300);
                        });
                    }
                });
            
                fetchAndDisplayHistory();
            };
            
            const renderCreateForm = () => {
                tabContent.innerHTML = `
                    <form id="new-job-order-form">
                        <div class="mb-3">
                            <label class="form-label">ค้นหาสินค้า</label>
                            <input type="text" class="form-control" id="jo-item-search" placeholder="พิมพ์เพื่อค้นหา..." required autocomplete="off">
                            <input type="hidden" id="jo-item-id">
                            <div id="jo-item-results" class="autocomplete-results" style="position: relative;"></div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">จำนวนที่ต้องการ</label>
                            <input type="number" class="form-control" id="jo-quantity" step="any" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">วันที่กำหนดส่ง</label>
                            <input type="date" class="form-control" id="jo-due-date">
                        </div>
                        <button type="submit" class="btn btn-primary w-100">สร้างใบสั่งงาน</button>
                    </form>
                `;
            
                // ★★★ โค้ดส่วนที่หายไปคือทั้งหมดข้างล่างนี้ครับ ★★★
                
                // 1. ระบบค้นหาสินค้า (Autocomplete)
                const itemSearchInput = tabContent.querySelector('#jo-item-search');
                const itemResultsDiv = tabContent.querySelector('#jo-item-results');
                const itemIdInput = tabContent.querySelector('#jo-item-id');
            
                itemSearchInput.addEventListener('input', async (e) => {
                    const searchTerm = e.target.value;
                    itemIdInput.value = ''; // Clear hidden ID when user types
                    if (searchTerm.length < 2) {
                        itemResultsDiv.innerHTML = '';
                        itemResultsDiv.style.display = 'none';
                        return;
                    }
                    
                    const response = await fetch(`../inventorySettings/api/itemMasterManage.php?action=get_items&search=${encodeURIComponent(searchTerm)}&limit=10`);
                    const result = await response.json();
            
                    itemResultsDiv.innerHTML = '';
                    if (result.success && result.data.length > 0) {
                        itemResultsDiv.style.display = 'block';
                        result.data.forEach(item => {
                            const itemDiv = document.createElement('div');
                            itemDiv.className = 'autocomplete-item';
                            itemDiv.innerHTML = `<strong>${item.sap_no}</strong> - ${item.part_no}`;
                            itemDiv.addEventListener('click', () => {
                                itemSearchInput.value = `${item.sap_no} - ${item.part_no}`;
                                itemIdInput.value = item.item_id;
                                itemResultsDiv.style.display = 'none';
                            });
                            itemResultsDiv.appendChild(itemDiv);
                        });
                    } else {
                        itemResultsDiv.style.display = 'none';
                    }
                });
            
                // 2. ระบบบันทึกฟอร์ม
                const form = tabContent.querySelector('#new-job-order-form');
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const data = {
                        item_id: itemIdInput.value,
                        quantity: tabContent.querySelector('#jo-quantity').value,
                        due_date: tabContent.querySelector('#jo-due-date').value,
                    };
            
                    if (!data.item_id) {
                        alert('กรุณาเลือกสินค้าจากรายการค้นหา');
                        return;
                    }
            
                    try {
                        const response = await fetch(`../components/api/jobOrderManage.php?action=create_job_order`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content
                            },
                            body: JSON.stringify(data)
                        });
                        const result = await response.json();
                        if (result.success) {
                            alert(result.message);
                            // กลับไปที่หน้า Pending jobs และโหลดข้อมูลใหม่
                            tabs.forEach(t => t.classList.remove('active'));
                            panelBody.querySelector('[data-tab="pending"]').classList.add('active');
                            renderPending();
                            fetchSummary(); // อัปเดต Badge
                        } else {
                            throw new Error(result.message);
                        }
                    } catch (error) {
                        alert('Error: ' + error.message);
                    }
                });
            };
        
            // --- ระบบสลับ Tab ---
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    currentView = tab.dataset.tab;
                    
                    if (currentView === 'pending') renderPending();
                    else if (currentView === 'history') renderHistory();
                    else if (currentView === 'create') renderCreateForm();
                });
            });
        
            // โหลด Tab เริ่มต้น
            renderPending(); 
        }
    };
    
    // =================================================================
    // 3. Initial Load (เริ่มการทำงาน)
    // =================================================================
    fetchSummary();
    setInterval(fetchSummary, 60000); // สั่งให้ดึงข้อมูลสรุปใหม่ทุกๆ 1 นาที
});