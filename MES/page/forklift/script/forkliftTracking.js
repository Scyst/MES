// ตั้งค่าความละเอียดของ Grid
const GRID_COLS = 40; 
const GRID_ROWS = 20; 
let isGridVisible = true;

// [NEW] ตัวแปรเก็บข้อมูล Zone ทั้งหมดที่ถูก Map แล้ว
let mappedZones = []; 

document.addEventListener('DOMContentLoaded', function() {
    drawGridOverlay();
    fetchMapData();
    fetchMappedZones(); // [NEW] โหลดข้อมูล Zone ทั้งหมดมาเก็บไว้ตอนเปิดหน้าเว็บ
    setInterval(fetchMapData, 3000);

    // ========================================================
    // 🛠️ DEV TOOL: คลิกบนแผนที่เพื่อ Map Wi-Fi Zone
    // ========================================================
    document.getElementById('factory-map-img').addEventListener('click', function(e) {
        if(typeof IS_ADMIN !== 'undefined' && !IS_ADMIN) return;

        const rect = this.getBoundingClientRect();
        
        const percentX = ((e.clientX - rect.left) / rect.width);
        const percentY = ((e.clientY - rect.top) / rect.height);
        
        const colIndex = Math.floor(percentX * GRID_COLS);
        const rowIndex = Math.floor(percentY * GRID_ROWS);
        
        let colLetter = getColumnLetter(colIndex);
        let gridName = `${colLetter}${rowIndex + 1}`;
        let fullZoneName = `Zone ${gridName}`;
        
        const dbX = Math.round(((colIndex + 0.5) / GRID_COLS) * 1000);
        const dbY = Math.round(((rowIndex + 0.5) / GRID_ROWS) * 1000);
        
        // 1. ใส่พิกัดและชื่อโซน
        document.getElementById('zone_svg_x').value = dbX;
        document.getElementById('zone_svg_y').value = dbY;
        document.getElementById('zone_name').value = fullZoneName;
        
        // 2. [NEW] เช็คว่าโซนนี้มีข้อมูลหรือยัง?
        let existingZone = mappedZones.find(z => z.zone_name === fullZoneName);

        if (existingZone) {
            // ถ้ามีข้อมูลเก่าอยู่ ให้ดึงมาแสดง
            document.getElementById('zone_bssid_1').value = existingZone.bssid_1 || '';
            document.getElementById('zone_rssi_1').value  = existingZone.rssi_1 || '';
            document.getElementById('zone_bssid_2').value = existingZone.bssid_2 || '';
            document.getElementById('zone_rssi_2').value  = existingZone.rssi_2 || '';
            document.getElementById('zone_bssid_3').value = existingZone.bssid_3 || '';
            document.getElementById('zone_rssi_3').value  = existingZone.rssi_3 || '';
        } else {
            // ถ้ายังไม่มีข้อมูล ให้เคลียร์เป็นช่องว่าง
            document.getElementById('zone_bssid_1').value = '';
            document.getElementById('zone_rssi_1').value  = '';
            document.getElementById('zone_bssid_2').value = '';
            document.getElementById('zone_rssi_2').value  = '';
            document.getElementById('zone_bssid_3').value = '';
            document.getElementById('zone_rssi_3').value  = '';
        }
        
        new bootstrap.Modal(document.getElementById('apZoneModal')).show();
    });
});

// ========================================================
// [NEW] ฟังก์ชันโหลดและไฮไลต์ช่องที่ Map แล้ว
// ========================================================
function fetchMappedZones() {
    fetch('api/manage_wifi_zones.php?action=get_all')
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                mappedZones = data.data; // เก็บใส่ตัวแปร Global
                highlightMappedGrids();  // ระบายสีตาราง
            }
        })
        .catch(err => console.error("Error fetching mapped zones:", err));
}

function highlightMappedGrids() {
    // 1. เคลียร์สีเก่าก่อน
    document.querySelectorAll('.grid-cell-overlay').forEach(el => {
        el.style.backgroundColor = 'transparent';
    });

    // 2. วนลูปตาม Database แล้วระบายสีเขียวอ่อน
    mappedZones.forEach(zone => {
        let rawName = zone.zone_name.replace('Zone ', ''); // ตัดคำว่า Zone ออกเหลือแค่ A1
        let cell = document.getElementById(`grid-cell-${rawName}`);
        if(cell) {
            cell.style.backgroundColor = 'rgba(25, 135, 84, 0.4)'; // สีเขียวโปร่งใส
        }
    });
}

// ========================================================
// ฟังก์ชันวาดเส้น Grid
// ========================================================
function drawGridOverlay() {
    const gridLayer = document.getElementById('grid-layer');
    gridLayer.innerHTML = '';
    
    gridLayer.style.display = 'grid';
    gridLayer.style.gridTemplateColumns = `repeat(${GRID_COLS}, 1fr)`;
    gridLayer.style.gridTemplateRows = `repeat(${GRID_ROWS}, 1fr)`;
    
    const totalCells = GRID_COLS * GRID_ROWS;
    
    for (let i = 0; i < totalCells; i++) {
        const r = Math.floor(i / GRID_COLS);
        const c = i % GRID_COLS;
        const gridName = `${getColumnLetter(c)}${r + 1}`;
        
        const cell = document.createElement('div');
        cell.id = `grid-cell-${gridName}`; // [NEW] เพิ่ม ID เพื่อใช้อ้างอิงตอนระบายสี
        cell.className = 'grid-cell-overlay'; // [NEW] เพิ่ม Class อ้างอิง
        cell.style.border = '1px solid rgba(0, 0, 0, 0.15)'; 
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        cell.style.pointerEvents = 'none'; 
        
        cell.innerHTML = `<span style="color: rgba(0,0,0,0.3); font-size: 0.5rem; font-weight: bold;">${gridName}</span>`;
        
        gridLayer.appendChild(cell);
    }
}

function toggleGrid() {
    isGridVisible = !isGridVisible;
    document.getElementById('grid-layer').style.display = isGridVisible ? 'grid' : 'none';
}

function getColumnLetter(colIndex) {
    let letter = '';
    while (colIndex >= 0) {
        letter = String.fromCharCode((colIndex % 26) + 65) + letter;
        colIndex = Math.floor(colIndex / 26) - 1;
    }
    return letter;
}

function fetchMapData() {
    fetch('api/get_realtime_map.php')
        .then(response => response.json())
        .then(res => {
            if(res.success) {
                renderMap(res.data);
                renderList(res.data);
            }
        })
        .catch(err => console.error("Map Fetch Error:", err));
}

function renderMap(data) {
    const layer = document.getElementById('markers-layer');
    layer.innerHTML = ''; 

    data.forEach(fl => {
        if (fl.indoor_x === null || fl.indoor_y === null) return;

        const leftPercent = (fl.indoor_x / 1000) * 100;
        const topPercent = (fl.indoor_y / 1000) * 100;

        const isOfflineClass = fl.is_offline == 1 ? 'offline' : '';
        
        const markerHtml = `
            <div class="forklift-marker ${isOfflineClass}" style="left: ${leftPercent}%; top: ${topPercent}%;">
                <i class="fas fa-truck-loading"></i>
                <div class="marker-label">${fl.code}</div>
            </div>
        `;
        layer.insertAdjacentHTML('beforeend', markerHtml);
    });
}

function renderList(data) {
    const list = document.getElementById('forklift-list');
    list.innerHTML = '';

    data.forEach(fl => {
        const statusBadge = fl.is_offline == 1 
            ? '<span class="badge bg-secondary">Offline (Parked)</span>' 
            : '<span class="badge bg-success">Online</span>';
        
        const batteryColor = fl.current_battery > 20 ? 'text-success' : 'text-danger';
        const loc = fl.last_location || 'Unknown';

        const li = `
            <li class="list-group-item d-flex justify-content-between align-items-start">
                <div class="ms-2 me-auto">
                    <div class="fw-bold">${fl.code} - ${fl.name || 'Forklift'}</div>
                    <small class="text-muted"><i class="fas fa-map-marker-alt me-1"></i> ${loc}</small>
                </div>
                <div class="text-end">
                    ${statusBadge}<br>
                    <small class="${batteryColor}"><i class="fas fa-battery-half"></i> ${fl.current_battery || 0}%</small>
                </div>
            </li>
        `;
        list.insertAdjacentHTML('beforeend', li);
    });
}

// ========================================================
// ฟังก์ชันเซฟข้อมูล
// ========================================================
function saveApZone() {
    const form = document.getElementById('apZoneForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    
    const formData = new FormData(form);
    const btn = document.querySelector('#apZoneModal .btn-primary');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
    btn.disabled = true;

    fetch('api/manage_wifi_zones.php', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('apZoneModal')).hide();
            // [NEW] เซฟเสร็จแล้ว โหลดข้อมูลมาตีสีไฮไลต์ใหม่ทันที
            fetchMappedZones(); 
            
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: data.message,
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    })
    .catch(err => {
        console.error(err);
        Swal.fire('Error', 'Connection failed', 'error');
    })
    .finally(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}