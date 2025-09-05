"use strict";

document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // 1. DOM Element References & State Management
    // =================================================================
    const commandCenterBtn = document.getElementById('commandCenterBtn');
    const commandCenterBadge = document.getElementById('command-center-badge');
    const commandCenterMenu = document.getElementById('command-center-menu');
    const dockingSidebar = document.getElementById('docking-sidebar');

    // ตรวจสอบว่า Element ที่จำเป็นมีอยู่จริงหรือไม่
    if (!commandCenterBtn || !dockingSidebar) {
        console.warn('Docking Sidebar elements not found. Manager will not run.');
        return;
    }

    // ตัวแปรสำหรับเก็บสถานะว่า Panel ไหนกำลังเปิดอยู่บ้าง
    const activePanels = new Set(); 

    // =================================================================
    // 2. Core Functions (ฟังก์ชันหลัก)
    // =================================================================

    /**
     * ดึงข้อมูลสรุปการแจ้งเตือนและอัปเดต UI
     */
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
                    
                    link.innerHTML = `
                        <i class="bi ${cat.icon}"></i>
                        <span>${cat.name}</span>
                        ${cat.count > 0 ? `<span class="badge rounded-pill bg-danger">${cat.count}</span>` : ''}
                    `;
                    
                    // ===== ✅ [แก้ไข] เปลี่ยน Logic ใน Event Listener ตรงนี้ =====
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        // ตรวจสอบว่า Panel นี้เปิดอยู่แล้วหรือไม่
                        if (activePanels.has(cat.id)) {
                            // ถ้าเปิดอยู่แล้ว ให้สั่งปิด
                            closePanel(cat.id);
                        } else {
                            // ถ้ายังไม่เปิด ให้สั่งเปิด
                            openPanel(cat.id, cat.name);
                        }
                    });
                    // ===== จบส่วนที่แก้ไข =====

                    li.appendChild(link);
                    commandCenterMenu.appendChild(li);
                });
            }
        } catch (error) {
            console.error("Fetch Summary Error:", error);
            commandCenterMenu.innerHTML = `<li class="px-3 text-danger">Error loading data.</li>`;
        }
    };

    /**
     * เปิด Panel ใหม่ใน Sidebar
     * @param {string} panelId - ID ของ Panel (เช่น 'low_stock')
     * @param {string} panelTitle - ชื่อที่จะแสดงบนหัวของ Panel
     */
    const openPanel = (panelId, panelTitle) => {
        // ถ้า Panel นี้เปิดอยู่แล้ว ไม่ต้องทำอะไร
        if (activePanels.has(panelId)) {
             // ทำให้ panel ที่มีอยู่แล้วเด้งขึ้นมาให้เห็น
            const existingPanel = document.getElementById(`panel-${panelId}`);
            if (existingPanel) {
                existingPanel.scrollIntoView({ behavior: 'smooth' });
            }
            return;
        }

        const panel = document.createElement('div');
        panel.className = 'docking-panel';
        panel.id = `panel-${panelId}`;
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
        
        // เพิ่ม Event ให้ปุ่มปิด
        panel.querySelector('.docking-panel-close-btn').addEventListener('click', () => {
            closePanel(panelId);
        });

        // ถ้า Sidebar ยังไม่เปิด ให้เปิดมันขึ้นมา
        if (!dockingSidebar.classList.contains('open')) {
            dockingSidebar.classList.add('open');
            document.body.classList.add('docking-sidebar-open');
        }

        resizePanels();
        loadPanelContent(panelId, panel.querySelector('.docking-panel-body'));
    };

    /**
     * ปิด Panel
     * @param {string} panelId - ID ของ Panel ที่จะปิด
     */
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

    /**
     * ปรับขนาด Panel ทั้งหมดที่เปิดอยู่ให้มีความสูงเท่ากัน
     */
    const resizePanels = () => {
        const panels = dockingSidebar.querySelectorAll('.docking-panel');
        const panelCount = panels.length;
        if (panelCount > 0) {
            const height = 100 / panelCount;
            panels.forEach(p => p.style.flexBasis = `${height}%`);
        }
    };

    /**
     * โหลดเนื้อหาสำหรับ Panel ที่ถูกเปิด
     * @param {string} panelId - ID ของ Panel
     * @param {HTMLElement} panelBody - Element ของส่วนเนื้อหาใน Panel
     */
     const loadPanelContent = async (panelId, panelBody) => {
        // แยก Logic การโหลดตามประเภทของ Panel
        if (panelId === 'low_stock') {
            try {
                const response = await fetch(`../components/api/get_alerts.php`);
                const result = await response.json();
                
                panelBody.innerHTML = ''; // ลบ Spinner ออก

                if (result.success && result.alerts && result.alerts.length > 0) {
                     result.alerts.forEach(alert => {
                        const alertLink = document.createElement('a');
                        alertLink.href = `../inventorySettings/inventorySettings.php?tab=item-master-pane&search=${encodeURIComponent(alert.sap_no)}`;
                        alertLink.className = 'alert-item';
                        alertLink.innerHTML = `
                            <div class="alert-icon"><i class="bi bi-box-seam-fill text-warning"></i></div>
                            <div class="alert-content">
                                <div class="alert-title">${alert.part_no}</div>
                                <div class="alert-subtitle">${alert.sap_no}</div>
                                <div class="alert-details">
                                    ปัจจุบัน: ${parseFloat(alert.total_onhand).toFixed(2)} / ต่ำสุด: ${parseFloat(alert.min_stock).toFixed(2)}
                                </div>
                            </div>
                        `;
                        panelBody.appendChild(alertLink);
                    });
                } else {
                     panelBody.innerHTML = '<div class="text-center text-muted p-3">ไม่มีรายการสต็อกต่ำ</div>';
                }
            } catch(error) {
                panelBody.innerHTML = '<div class="text-center text-danger p-3">ไม่สามารถโหลดข้อมูลได้</div>';
            }
            
        } else if (panelId === 'job_orders') {
            try {
                const response = await fetch(`../components/api/get_job_orders.php`);
                const result = await response.json();

                panelBody.innerHTML = ''; // ลบ Spinner ออก

                if (result.success && result.orders && result.orders.length > 0) {
                    result.orders.forEach(order => {
                        const orderLink = document.createElement('a');
                        // TODO: แก้ไขลิงก์ไปยังหน้ารายละเอียดใบสั่งงานในอนาคต
                        orderLink.href = '#'; 
                        orderLink.className = 'alert-item';
                        
                        // แปลงวันที่ (ถ้ามี)
                        const dueDate = order.due_date ? new Date(order.due_date).toLocaleDateString('th-TH') : 'N/A';

                        orderLink.innerHTML = `
                            <div class="alert-icon"><i class="bi bi-list-check text-info"></i></div>
                            <div class="alert-content">
                                <div class="alert-title">${order.job_order_number}</div>
                                <div class="alert-subtitle">${order.part_no || 'N/A'}</div>
                                <div class="alert-details">
                                    จำนวน: ${parseFloat(order.quantity_required).toFixed(2)} | กำหนดส่ง: ${dueDate}
                                </div>
                            </div>
                        `;
                        panelBody.appendChild(orderLink);
                    });
                } else {
                    panelBody.innerHTML = '<div class="text-center text-muted p-3">ไม่มีใบสั่งงานที่ยังค้างอยู่</div>';
                }

            } catch(error) {
                console.error("Error loading job orders:", error);
                panelBody.innerHTML = '<div class="text-center text-danger p-3">ไม่สามารถโหลดข้อมูลใบสั่งงานได้</div>';
            }
        }
    };


    // =================================================================
    // 3. Initial Load (เริ่มการทำงาน)
    // =================================================================
    fetchSummary();
    setInterval(fetchSummary, 60000); // สั่งให้ดึงข้อมูลสรุปใหม่ทุกๆ 1 นาที
});