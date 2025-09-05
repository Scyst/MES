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
                        link.innerHTML = `<i class="bi ${cat.icon}"></i> <span>${cat.name}</span>`;
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            openPanel(cat.id, cat.name);
                        });
                    } else {
                        link.innerHTML = `
                            <i class="bi ${cat.icon}"></i>
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
        if (panelId === 'low_stock') {
            try {
                const response = await fetch(`../components/api/get_alerts.php`);
                const result = await response.json();
                
                panelBody.innerHTML = ''; 

                if (result.success && result.alerts && result.alerts.length > 0) {
                     result.alerts.forEach(alert => {
                        const alertDiv = document.createElement('div');
                        alertDiv.className = 'alert-item';
                        alertDiv.style.cursor = 'pointer';
                        alertDiv.title = 'คลิกเพื่อจัดการสต็อก';
                        
                        alertDiv.innerHTML = `
                            <div class="alert-icon"><i class="bi bi-box-seam-fill text-warning"></i></div>
                            <div class="alert-content">
                                <div class="alert-title">${alert.part_no}</div>
                                <div class="alert-subtitle">${alert.sap_no}</div>
                                <div class="alert-details">
                                    ปัจจุบัน: ${parseFloat(alert.total_onhand).toFixed(2)} / ต่ำสุด: ${parseFloat(alert.min_stock).toFixed(2)}
                                </div>
                            </div>
                        `;
                        
                        alertDiv.addEventListener('click', () => {
                            openPanel(`manage-stock-${alert.item_id}`, `จัดการสต็อก: ${alert.part_no}`, { 
                                itemId: alert.item_id, 
                                sapNo: alert.sap_no,
                                partNo: alert.part_no 
                            });
                        });
                        panelBody.appendChild(alertDiv);
                    });
                } else {
                     panelBody.innerHTML = '<div class="text-center text-muted p-3">ไม่มีรายการสต็อกต่ำ</div>';
                }
            } catch(error) {
                panelBody.innerHTML = '<div class="text-center text-danger p-3">ไม่สามารถโหลดข้อมูลได้</div>';
            }
    
        } else if (panelId.startsWith('manage-stock-')) {
            const data = JSON.parse(panel.dataset.panelData);
            const itemId = data.itemId;
    
            try {
                const [itemRes, stockRes] = await Promise.all([
                    fetch(`../inventorySettings/api/itemMasterManage.php?action=get_items&search=${encodeURIComponent(data.sapNo)}`),
                    fetch(`../production/api/inventoryManage.php?action=get_stock_details_by_item&item_id=${itemId}`)
                ]);
    
                const itemResult = await itemRes.json();
                const stockResult = await stockRes.json();
    
                if (!itemResult.success || !stockResult.success) {
                    throw new Error('ไม่สามารถดึงข้อมูลสินค้าหรือสต็อกได้');
                }
                
                const itemDetails = itemResult.data[0];
                const stockDetails = stockResult.data;
    
                let stockHtml = '<ul class="list-group list-group-flush mb-3">';
                if (stockDetails.length > 0) {
                    stockDetails.forEach(stock => {
                        stockHtml += `<li class="list-group-item d-flex justify-content-between align-items-center">
                                        ${stock.location_name}
                                        <span class="badge bg-secondary rounded-pill">${parseFloat(stock.quantity).toFixed(2)}</span>
                                      </li>`;
                    });
                } else {
                    stockHtml += '<li class="list-group-item text-muted">ไม่มีสต็อกในคลัง</li>';
                }
                stockHtml += '</ul>';
    
                panelBody.innerHTML = `
                    <div class="p-2">
                        <h6><i class="bi bi-pin-map-fill"></i> สต็อกคงคลังตามคลัง</h6>
                        ${stockHtml}
                        <hr>
                        <h6><i class="bi bi-sliders"></i> ตั้งค่าสต็อก</h6>
                        <form id="form-manage-stock-${itemId}">
                            <div class="mb-3">
                                <label for="min-stock-${itemId}" class="form-label">Min Stock</label>
                                <input type="number" id="min-stock-${itemId}" class="form-control" value="${itemDetails.min_stock || 0}">
                            </div>
                            <div class="mb-3">
                                <label for="max-stock-${itemId}" class="form-label">Max Stock</label>
                                <input type="number" id="max-stock-${itemId}" class="form-control" value="${itemDetails.max_stock || 0}">
                            </div>
                            
                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input" type="checkbox" role="switch" id="is-tracking-${itemId}" ${itemDetails.is_tracking ? 'checked' : ''}>
                                <label class="form-check-label" for="is-tracking-${itemId}">ติดตามสต็อก (Stock Tracking)</label>
                            </div>
    
                             <button type="submit" class="btn btn-success w-100">
                                <i class="bi bi-save-fill"></i> บันทึกการเปลี่ยนแปลง
                            </button>
                        </form>
                    </div>
                `;
    
                const stockForm = panelBody.querySelector(`#form-manage-stock-${itemId}`);
                stockForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const payload = {
                        item_details: itemDetails,
                        routes_data: []
                    };
    
                    payload.item_details.min_stock = panelBody.querySelector(`#min-stock-${itemId}`).value;
                    payload.item_details.max_stock = panelBody.querySelector(`#max-stock-${itemId}`).value;
                    payload.item_details.is_tracking = panelBody.querySelector(`#is-tracking-${itemId}`).checked;
                    
                    try {
                        const saveRes = await fetch('../inventorySettings/api/itemMasterManage.php?action=save_item_and_routes', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content
                            },
                            body: JSON.stringify(payload)
                        });
    
                        const saveResult = await saveRes.json();
                        if (saveResult.success) {
                            alert('บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว');
                            closePanel(panelId);
                            const lowStockPanel = document.getElementById('panel-low_stock');
                            if(lowStockPanel) {
                                loadPanelContent('low_stock', lowStockPanel.querySelector('.docking-panel-body'), lowStockPanel);
                            }
                        } else {
                            throw new Error(saveResult.message);
                        }
                    } catch (error) {
                         alert('Error: ' + error.message);
                    }
                });
    
            } catch(error) {
                panelBody.innerHTML = `<div class="text-center text-danger p-3">เกิดข้อผิดพลาด: ${error.message}</div>`;
            }
    
        } else if (panelId === 'job_orders') {
            try {
                const response = await fetch(`../components/api/get_job_orders.php`);
                const result = await response.json();
                panelBody.innerHTML = '';
                if (result.success && result.orders && result.orders.length > 0) {
                    result.orders.forEach(order => {
                        const orderDiv = document.createElement('div');
                        orderDiv.className = 'alert-item';
                        orderDiv.style.cursor = 'pointer';
                        orderDiv.title = 'คลิกเพื่อจัดการใบสั่งงาน';

                        const dueDate = order.due_date ? new Date(order.due_date).toLocaleDateString('th-TH') : 'N/A';
                        orderDiv.innerHTML = `
                            <div class="alert-icon"><i class="bi bi-list-check text-info"></i></div>
                            <div class="alert-content">
                                <div class="alert-title">${order.job_order_number}</div>
                                <div class="alert-subtitle">${order.part_no || 'N/A'}</div>
                                <div class="alert-details">
                                    จำนวน: ${parseFloat(order.quantity_required).toFixed(2)} | กำหนดส่ง: ${dueDate}
                                </div>
                            </div>
                        `;

                        orderDiv.addEventListener('click', () => {
                            openPanel(`manage-job-order-${order.job_order_id}`, `จัดการ: ${order.job_order_number}`, { 
                                jobOrderId: order.job_order_id
                            });
                        });

                        panelBody.appendChild(orderDiv);
                    });
                } else {
                    panelBody.innerHTML = '<div class="text-center text-muted p-3">ไม่มีใบสั่งงานที่ยังค้างอยู่</div>';
                }
            } catch(error) {
                console.error("Error loading job orders:", error);
                panelBody.innerHTML = '<div class="text-center text-danger p-3">ไม่สามารถโหลดข้อมูลใบสั่งงานได้</div>';
            }
        } else if (panelId.startsWith('manage-job-order-')) {
            const data = JSON.parse(panel.dataset.panelData);
            const jobOrderId = data.jobOrderId;

            try {
                const response = await fetch(`../components/api/jobOrderManage.php?action=get_details&job_order_id=${jobOrderId}`);
                const result = await response.json();

                if (!result.success) throw new Error(result.message);
                
                const details = result.data;
                const dueDate = details.due_date ? new Date(details.due_date).toLocaleDateString('th-TH') : 'ไม่มี';

                panelBody.innerHTML = `
                    <div class="p-2">
                        <ul class="list-group list-group-flush mb-3">
                            <li class="list-group-item"><strong>Part No:</strong> ${details.part_no}</li>
                            <li class="list-group-item"><strong>จำนวน:</strong> ${parseFloat(details.quantity_required).toFixed(2)}</li>
                            <li class="list-group-item"><strong>กำหนดส่ง:</strong> ${dueDate}</li>
                        </ul>
                        <div class="d-grid gap-2">
                            <button class="btn btn-success" id="complete-job-btn"><i class="bi bi-check2-circle"></i> ดำเนินการเสร็จสิ้น</button>
                            <button class="btn btn-danger" id="cancel-job-btn"><i class="bi bi-x-circle"></i> ยกเลิกใบสั่งงาน</button>
                        </div>
                    </div>
                `;

                const updateStatus = async (status) => {
                    const actionText = status === 'COMPLETED' ? 'ปิดงาน' : 'ยกเลิก';
                    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการ ${actionText} ใบสั่งงานนี้?`)) return;

                    try {
                        const saveRes = await fetch('../components/api/jobOrderManage.php?action=update_status', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content
                            },
                            body: JSON.stringify({ job_order_id: jobOrderId, status: status })
                        });
                        const saveResult = await saveRes.json();
                        if (saveResult.success) {
                            alert(`ใบสั่งงานถูก ${actionText} เรียบร้อยแล้ว`);
                            closePanel(panelId);
                            
                            const jobOrdersPanel = document.getElementById('panel-job_orders');
                            if (jobOrdersPanel) {
                                loadPanelContent('job_orders', jobOrdersPanel.querySelector('.docking-panel-body'), jobOrdersPanel);
                            }
                            fetchSummary();
                        } else {
                            throw new Error(saveResult.message);
                        }
                    } catch (error) {
                        alert('Error: ' + error.message);
                    }
                };

                panelBody.querySelector('#complete-job-btn').addEventListener('click', () => updateStatus('COMPLETED'));
                panelBody.querySelector('#cancel-job-btn').addEventListener('click', () => updateStatus('CANCELLED'));

            } catch (error) {
                 panelBody.innerHTML = `<div class="text-center text-danger p-3">เกิดข้อผิดพลาด: ${error.message}</div>`;
            }

        } else if (panelId === 'create_job_order_form') {
            panelBody.innerHTML = `
                <form id="new-job-order-form" class="p-2">
                    <div class="mb-3">
                        <label for="jo-item-search" class="form-label">ค้นหาสินค้า (SAP No. / Part No.)</label>
                        <input type="text" class="form-control" id="jo-item-search" placeholder="พิมพ์เพื่อค้นหา..." required autocomplete="off">
                        <input type="hidden" id="jo-item-id">
                        <div id="jo-item-results" class="autocomplete-results" style="position: absolute; width: calc(100% - 1rem); z-index: 1055;"></div>
                    </div>
                    <div class="mb-3">
                        <label for="jo-quantity" class="form-label">จำนวนที่ต้องการผลิต</label>
                        <input type="number" class="form-control" id="jo-quantity" step="any" required>
                    </div>
                    <div class="mb-3">
                        <label for="jo-due-date" class="form-label">วันที่กำหนดส่ง (ถ้ามี)</label>
                        <input type="date" class="form-control" id="jo-due-date">
                    </div>
                    <button type="submit" class="btn btn-primary w-100">
                        <i class="bi bi-check-circle-fill"></i> สร้างใบสั่งงาน
                    </button>
                </form>
            `;
            
            const itemSearchInput = panelBody.querySelector('#jo-item-search');
            const itemResultsDiv = panelBody.querySelector('#jo-item-results');
            const itemIdInput = panelBody.querySelector('#jo-item-id');
    
            itemSearchInput.addEventListener('input', async (e) => {
                const searchTerm = e.target.value;
                if (searchTerm.length < 2) {
                    itemResultsDiv.innerHTML = '';
                    itemResultsDiv.style.display = 'none';
                    return;
                }
                
                const response = await fetch(`../inventorySettings/api/itemMasterManage.php?action=get_items&search=${encodeURIComponent(searchTerm)}&limit=-1`);
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
    
            const form = panelBody.querySelector('#new-job-order-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = {
                    item_id: itemIdInput.value,
                    quantity: panelBody.querySelector('#jo-quantity').value,
                    due_date: panelBody.querySelector('#jo-due-date').value,
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
                        closePanel('create_job_order_form');
                        fetchSummary();
                    } else {
                        throw new Error(result.message);
                    }
                } catch (error) {
                    alert('Error: ' + error.message);
                }
            });
        } else if (panelId === 'search_stock_item') {
            panelBody.innerHTML = `
                <div class="p-2">
                    <div class="mb-3">
                        <label for="stock-item-search" class="form-label">ค้นหาสินค้า (SAP No. / Part No.)</label>
                        <input type="text" class="form-control" id="stock-item-search" placeholder="พิมพ์เพื่อค้นหา..." autocomplete="off">
                        <div id="stock-item-results" class="autocomplete-results" style="position: absolute; width: calc(100% - 1rem); z-index: 1055;"></div>
                    </div>
                </div>
            `;
        
            const searchInput = panelBody.querySelector('#stock-item-search');
            const searchResults = panelBody.querySelector('#stock-item-results');
        
            searchInput.addEventListener('input', async (e) => {
                const searchTerm = e.target.value;
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
                        itemDiv.addEventListener('click', () => {
                            closePanel('search_stock_item');
                            openPanel(`manage-stock-${item.item_id}`, `จัดการสต็อก: ${item.part_no}`, { 
                                itemId: item.item_id, 
                                sapNo: item.sap_no,
                                partNo: item.part_no 
                            });
                        });
                        searchResults.appendChild(itemDiv);
                    });
                } else {
                    searchResults.style.display = 'none';
                }
            });
        } else if (panelId === 'job_order_history') {
            panelBody.innerHTML = `
                <div class="p-2">
                    <div class="mb-3">
                        <label for="history-status-filter" class="form-label">กรองตามสถานะ</label>
                        <select class="form-select" id="history-status-filter">
                            <option value="">ทั้งหมด</option>
                            <option value="COMPLETED">เสร็จสิ้น (Completed)</option>
                            <option value="CANCELLED">ยกเลิก (Cancelled)</option>
                        </select>
                    </div>
                    <div id="history-results-container" style="max-height: calc(100vh - 150px); overflow-y: auto;">
                        <div class="text-center p-3"><div class="spinner-border spinner-border-sm"></div></div>
                    </div>
                </div>
            `;
        
            const statusFilter = panelBody.querySelector('#history-status-filter');
            const resultsContainer = panelBody.querySelector('#history-results-container');
        
            const fetchHistory = async () => {
                const status = statusFilter.value;
                resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm"></div></div>';
        
                try {
                    const response = await fetch(`../components/api/jobOrderManage.php?action=get_history&status=${status}`);
                    const result = await response.json();
        
                    if (!result.success) throw new Error(result.message);
        
                    resultsContainer.innerHTML = '';
                    if (result.data.length > 0) {
                        result.data.forEach(item => {
                            const isCompleted = item.status === 'COMPLETED';
                            const completedDate = item.completed_at ? new Date(item.completed_at).toLocaleString('th-TH') : 'N/A';
                            
                            const itemDiv = document.createElement('div');
                            itemDiv.className = 'alert-item';
                            itemDiv.innerHTML = `
                                <div class="alert-icon">
                                    <i class="bi ${isCompleted ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'}"></i>
                                </div>
                                <div class="alert-content">
                                    <div class="alert-title">${item.job_order_number}</div>
                                    <div class="alert-subtitle">${item.part_no}</div>
                                    <div class="alert-details">
                                        สถานะ: ${item.status} | วันที่: ${completedDate}
                                    </div>
                                </div>
                            `;
                            resultsContainer.appendChild(itemDiv);
                        });
                    } else {
                        resultsContainer.innerHTML = '<div class="text-center text-muted p-3">ไม่พบข้อมูล</div>';
                    }
                } catch (error) {
                    resultsContainer.innerHTML = `<div class="text-center text-danger p-3">${error.message}</div>`;
                }
            };
            
            // ★★★ This is the corrected part from the user's finding ★★★
            statusFilter.addEventListener('change', fetchHistory);
            fetchHistory(); 
        } 
    };
    
    // =================================================================
    // 3. Initial Load (เริ่มการทำงาน)
    // =================================================================
    fetchSummary();
    setInterval(fetchSummary, 60000); // สั่งให้ดึงข้อมูลสรุปใหม่ทุกๆ 1 นาที
});