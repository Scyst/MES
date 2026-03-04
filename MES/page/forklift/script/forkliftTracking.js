// ตั้งค่าความละเอียดของ Grid
const GRID_COLS = 40; 
const GRID_ROWS = 30; 
let mappedZones = [];
let currentFilter = 'ALL';
let followedForklift = null;
let snailTrailLayer = null;
let showingTrailFor = null;
let heatmapLayer = null;


// 📌 [สำคัญ] พิกัดขอบเขตของรูปโรงงานคุณ (มุมซ้ายบน, มุมขวาล่าง)
// ไปหาพิกัดจริงจาก Google Maps แล้วมาเปลี่ยนตรงนี้นะครับ
const FACTORY_BOUNDS = [
    [12.889578, 101.088351], // Lat, Lng ซ้ายบนของอาคาร
    [12.883121, 101.096783]  // Lat, Lng ขวาล่างของอาคาร
];

let map;
let forkliftMarkers = {}; 
let gridLayerGroup; // สำหรับเก็บเส้น Grid และสีไฮไลต์
let isGridVisible = true;

// [FUTURE FEATURE] ตัวแปรสำหรับ X-Ray Mode
let xrayLayer;
let isXrayOn = false;

document.addEventListener('DOMContentLoaded', function() {
    initMap();
    fetchMapData();
    fetchMappedZones(); // โหลดข้อมูล Zone ทั้งหมดมาเก็บไว้ตอนเปิดหน้าเว็บ
    setInterval(fetchMapData, 3000);

    // ========================================================
    // 🛠️ DEV TOOL: คลิกบนแผนที่เพื่อ Map Wi-Fi Zone
    // ========================================================
    document.getElementById('map-container').addEventListener('click', function(e) {
        // ให้ฟังก์ชันนี้ทำงานผ่าน Leaflet map.on('click') แทนจะดีกว่า เพื่อให้ตรงพิกัด
        // แต่ถ้าผูกไว้กับ Grid Rectangle แล้ว ส่วนนี้อาจจะไม่ค่อยได้ใช้ครับ
    });
});

// ========================================================
// 1. สร้างแผนที่ Leaflet และ Image Overlay
// ========================================================
function initMap() {
    // สร้างแผนที่ เล็งไปที่จุดกึ่งกลางของโรงงาน
    map = L.map('map-container', { zoomControl: false }).fitBounds(FACTORY_BOUNDS);

    /*lyrs=y คือ Hybrid (ภาพดาวเทียม + เส้นถนน/ชื่อสถานที่) -> แนะนำอันนี้ครับ ดูง่ายสุด
    lyrs=s คือ Satellite (ดาวเทียมล้วนๆ ไม่มีเส้นถนน)
    lyrs=m คือ Standard Road Map (แผนที่ถนนแบบดั้งเดิมของกูเกิล)
    เปลี่ยนมาใช้ Google Maps ดาวเทียม (Hybrid: ดาวเทียม + ชื่อถนน)*/
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 22,
        attribution: '© Google'
    }).addTo(map);

    // ========================================================
    // [FUTURE FEATURE] เตรียมไว้สำหรับอนาคต (X-Ray View)
    // ถ้าทำรูป PNG พื้นหลังใสเสร็จแล้ว ให้เอา // ข้างล่างนี้ออก
    // ========================================================
    // const xrayImageUrl = '../components/images/Factory_Xray_Transparent.png'; 
    // xrayLayer = L.imageOverlay(xrayImageUrl, FACTORY_BOUNDS, { opacity: 0.8 });
    // (ยังไม่ต้อง .addTo(map) เพราะเราจะให้มันโชว์ตอนกดปุ่ม X-Ray)

    // สร้าง Layer Group ไว้ใส่ Grid จะได้สั่งเปิด/ปิดได้ง่ายๆ
    gridLayerGroup = L.layerGroup().addTo(map);
}

// ========================================================
// [FUTURE FEATURE] ฟังก์ชันเปิด/ปิดโหมด X-Ray
// ========================================================
function toggleXray() {
    if (!xrayLayer) {
        alert("ระบบ X-Ray ยังไม่พร้อมใช้งาน (กรุณาเปิดตั้งค่าในโค้ด JS ก่อน)");
        return;
    }
    
    isXrayOn = !isXrayOn;
    if (isXrayOn) {
        xrayLayer.addTo(map); // วางแผ่นใสทับ
    } else {
        map.removeLayer(xrayLayer); // ดึงแผ่นใสออก
    }
}

// ========================================================
// 2. โหลดข้อมูล Zone ที่เคย Map ไว้แล้ว
// ========================================================
function fetchMappedZones() {
    // 💡 อัปเดต Path เป็น webTracking.php
    fetch('api/webTracking.php?action=get_zones')
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                mappedZones = data.data; 
                drawLeafletGrid(); // วาด Grid พร้อมไฮไลต์สี
            }
        })
        .catch(err => console.error("Error fetching mapped zones:", err));
}

// ========================================================
// 3. วาด Grid ลงบนแผนที่ Leaflet (รองรับการ Zoom/Pan)
// ========================================================
function drawLeafletGrid() {
    gridLayerGroup.clearLayers(); // เคลียร์ของเก่าทิ้งก่อนวาดใหม่

    const latTop = FACTORY_BOUNDS[0][0];
    const lngLeft = FACTORY_BOUNDS[0][1];
    const latBottom = FACTORY_BOUNDS[1][0];
    const lngRight = FACTORY_BOUNDS[1][1];

    const latStep = (latTop - latBottom) / GRID_ROWS;
    const lngStep = (lngRight - lngLeft) / GRID_COLS;

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            // คำนวณขอบเขตของแต่ละช่อง Grid
            const cellTop = latTop - (r * latStep);
            const cellBottom = latTop - ((r + 1) * latStep);
            const cellLeft = lngLeft + (c * lngStep);
            const cellRight = lngLeft + ((c + 1) * lngStep);

            const bounds = [[cellTop, cellLeft], [cellBottom, cellRight]];
            
            const colLetter = getColumnLetter(c);
            const gridName = `${colLetter}${r + 1}`;
            const fullZoneName = `Zone ${gridName}`;

            // เช็คว่ามีข้อมูลหรือยังเพื่อระบายสีเขียว
            const isMapped = mappedZones.some(z => z.zone_name === fullZoneName);
            const fillColor = isMapped ? '#198754' : 'transparent';
            const fillOpacity = isMapped ? 0.4 : 0;

            // สร้างกรอบสี่เหลี่ยม Leaflet
            const rect = L.rectangle(bounds, {
                color: 'rgba(0,0,0,0.3)', // สีเส้นขอบ
                weight: 1,
                fillColor: fillColor,
                fillOpacity: fillOpacity
            });

            // ผูก Event Click ให้เปิด Modal
            rect.on('click', function() {
                openZoneModal(c, r, fullZoneName);
            });

            rect.addTo(gridLayerGroup);

            // ใส่ตัวอักษรชื่อ Grid ไว้ตรงกลางช่อง
            const centerLat = cellTop - (latStep / 2);
            const centerLng = cellLeft + (lngStep / 2);
            
            const labelIcon = L.divIcon({
                className: 'custom-grid-label',
                html: `<div style="color: rgba(0,0,0,0.4); font-size: 10px; font-weight: bold; text-align: center;">${gridName}</div>`,
                iconSize: [30, 15],
                iconAnchor: [15, 7]
            });
            L.marker([centerLat, centerLng], {icon: labelIcon, interactive: false}).addTo(gridLayerGroup);
        }
    }
}

// ฟังก์ชันเปิด/ปิดตาราง Grid
function toggleGrid() {
    isGridVisible = !isGridVisible;
    if (isGridVisible) {
        map.addLayer(gridLayerGroup);
    } else {
        map.removeLayer(gridLayerGroup);
    }
}

// ========================================================
// 4. ฟังก์ชันเปิด Modal พร้อมโหลดข้อมูลเก่า
// ========================================================
function openZoneModal(colIndex, rowIndex, fullZoneName) {
    if(typeof IS_ADMIN !== 'undefined' && !IS_ADMIN) return;

    // คำนวณพิกัดฐาน 1000 ส่งให้ Database (เหมือนเดิม)
    const dbX = Math.round(((colIndex + 0.5) / GRID_COLS) * 1000);
    const dbY = Math.round(((rowIndex + 0.5) / GRID_ROWS) * 1000);

    document.getElementById('zone_svg_x').value = dbX;
    document.getElementById('zone_svg_y').value = dbY;
    document.getElementById('zone_name').value = fullZoneName;

    // เช็คว่ามีข้อมูลเก่าไหม
    let existingZone = mappedZones.find(z => z.zone_name === fullZoneName);

    if (existingZone) {
        document.getElementById('zone_bssid_1').value = existingZone.bssid_1 || '';
        document.getElementById('zone_rssi_1').value  = existingZone.rssi_1 || '';
        document.getElementById('zone_bssid_2').value = existingZone.bssid_2 || '';
        document.getElementById('zone_rssi_2').value  = existingZone.rssi_2 || '';
        document.getElementById('zone_bssid_3').value = existingZone.bssid_3 || '';
        document.getElementById('zone_rssi_3').value  = existingZone.rssi_3 || '';
    } else {
        document.getElementById('zone_bssid_1').value = '';
        document.getElementById('zone_rssi_1').value  = '';
        document.getElementById('zone_bssid_2').value = '';
        document.getElementById('zone_rssi_2').value  = '';
        document.getElementById('zone_bssid_3').value = '';
        document.getElementById('zone_rssi_3').value  = '';
    }
    
    new bootstrap.Modal(document.getElementById('apZoneModal')).show();
}

function getColumnLetter(colIndex) {
    let letter = '';
    while (colIndex >= 0) {
        letter = String.fromCharCode((colIndex % 26) + 65) + letter;
        colIndex = Math.floor(colIndex / 26) - 1;
    }
    return letter;
}

// ========================================================
// 5. ดึงข้อมูลรถโฟล์คลิฟต์
// ========================================================
function fetchMapData() {
    // 💡 อัปเดต Path เป็น webTracking.php
    fetch('api/webTracking.php?action=get_realtime')
        .then(response => response.json())
        .then(res => {
            if(res.success) {
                renderMapMarkers(res.data);
                renderList(res.data);
            }
        })
        .catch(err => console.error("Map Fetch Error:", err));
}

// ========================================================
// 6. วาดจุด Marker รถหลายคันลงบนแผนที่ (ใช้ FontAwesome แทนรูปภาพ)
// ========================================================
function renderMapMarkers(data) {
    data.forEach(fl => {
        let finalLat = null;
        let finalLng = null;

        // แยกโหมด GPS กับ WiFi
        if (fl.location_type === 'OUTDOOR' && fl.lat && fl.lng && fl.lat != 0) {
            finalLat = parseFloat(fl.lat);
            finalLng = parseFloat(fl.lng);
        } 
        else if (fl.location_type === 'INDOOR' && fl.indoor_x !== null && fl.indoor_y !== null) {
            const latDiff = FACTORY_BOUNDS[0][0] - FACTORY_BOUNDS[1][0]; 
            const lngDiff = FACTORY_BOUNDS[1][1] - FACTORY_BOUNDS[0][1]; 
            
            finalLat = FACTORY_BOUNDS[0][0] - ((fl.indoor_y / 1000) * latDiff);
            finalLng = FACTORY_BOUNDS[0][1] + ((fl.indoor_x / 1000) * lngDiff);
        }

        if (finalLat === null || finalLng === null) return;

        // 📌 สร้าง HTML Marker ด้วย FontAwesome
        // กำหนดสีพื้นหลัง: Offline=เทา, แบตน้อยกว่า 20%=แดง, ปกติ=ส้ม (ปรับสีได้ตามใจชอบ)
        let bgColor = '#fd7e14'; // สีส้ม Default
        if (fl.is_offline == 1) bgColor = '#6c757d'; // สีเทา
        else if (fl.current_battery <= 20) bgColor = '#dc3545'; // สีแดง

        const customIcon = L.divIcon({
            className: 'custom-leaflet-icon', // อ้างอิง CSS ที่เราเพิ่งใส่ไป
            html: `
                <div class="forklift-marker-wrapper" style="background-color: ${bgColor};">
                    <i class="fas fa-truck-loading text-white"></i>
                </div>
                <div class="marker-label-floating">${fl.code}</div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16], // ให้จุดศูนย์กลางอยู่ตรงกลางเป๊ะ
            popupAnchor: [0, -16] // ให้ Popup เด้งขึ้นมาจากด้านบนของไอคอน
        });

        const popupContent = `<b>${fl.code}</b><br>Location: ${fl.last_location}<br>Battery: ${fl.current_battery || 0}%`;

        // วาดและขยับ Marker
        if (forkliftMarkers[fl.code]) {
            forkliftMarkers[fl.code].setLatLng([finalLat, finalLng]);
            forkliftMarkers[fl.code].setIcon(customIcon);
            forkliftMarkers[fl.code].getPopup().setContent(popupContent);
        } else {
            forkliftMarkers[fl.code] = L.marker([finalLat, finalLng], { icon: customIcon })
                .addTo(map)
                .bindPopup(popupContent);
        }

        if (followedForklift === fl.code) {
            map.panTo([finalLat, finalLng], { animate: true, duration: 1.0 });
        }
    });
}

// ========================================================
// 7. วาด List รายการรถด้านขวามือ
// ========================================================
function renderList(data) {
    window.lastData = data;
    const list = document.getElementById('forklift-list');
    list.innerHTML = '';

    data.forEach(fl => {
        const statusBadge = fl.is_offline == 1 
            ? '<span class="badge bg-secondary">Offline</span>' 
            : '<span class="badge bg-success">Online</span>';
        
        const batteryColor = fl.current_battery > 20 ? 'text-success' : 'text-danger';
        const locTypeBadge = fl.location_type === 'OUTDOOR' 
            ? '<span class="badge bg-primary ms-1"><i class="fas fa-satellite"></i> GPS</span>' 
            : '<span class="badge bg-info ms-1"><i class="fas fa-wifi"></i> WiFi</span>';
        const loc = fl.last_location || 'Unknown';

        // เช็คว่าคันนี้กำลังถูก Follow อยู่ไหม เพื่อเปลี่ยนสีปุ่ม
        const isFollowing = (followedForklift === fl.code);
        // เช็คว่ากำลังโชว์เส้นทางคันนี้อยู่ไหม
        const isShowingTrail = (showingTrailFor === fl.code); 
        
        const followBtnClass = isFollowing ? 'btn-danger' : 'btn-outline-primary';
        const trailBtnClass = isShowingTrail ? 'btn-info text-white' : 'btn-outline-info';

        const li = `
            <li class="list-group-item d-flex justify-content-between align-items-center list-hover-effect" 
                style="cursor: pointer; transition: background 0.3s;" 
                onclick="flyToForklift('${fl.code}')"
                onmouseover="this.style.backgroundColor='#f8f9fa'" 
                onmouseout="this.style.backgroundColor='transparent'">
                
                <div class="ms-2 me-auto">
                    <div class="fw-bold">${fl.code} - ${fl.name || 'Forklift'} ${locTypeBadge}</div>
                    <small class="text-muted"><i class="fas fa-map-marker-alt me-1"></i> ${loc}</small>
                </div>
                
                <div class="text-end me-3">
                    ${statusBadge}<br>
                    <small class="${batteryColor}"><i class="fas fa-battery-half"></i> ${fl.current_battery || 0}%</small>
                </div>

                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-warning text-dark" onclick="initPlayback('${fl.code}', event)" title="จำลองการวิ่งย้อนหลัง">
                        <i class="fas fa-play-circle"></i>
                    </button>
                    
                    <button class="btn btn-sm ${trailBtnClass}" onclick="toggleSnailTrail('${fl.code}', event)" title="ดูเส้นทางย้อนหลัง 1 ชม.">
                        <i class="fas fa-route"></i>
                    </button>
                    <button class="btn btn-sm ${followBtnClass}" onclick="toggleFollow('${fl.code}', event)" title="ล็อกเป้าติดตาม">
                        <i class="fas fa-crosshairs"></i>
                    </button>
                </div>
            </li>
        `;
        list.insertAdjacentHTML('beforeend', li);
    });
    filterForkliftList();
}

// ========================================================
// 8. ฟังก์ชันเซฟข้อมูล
// ========================================================
function saveApZone() {
    const form = document.getElementById('apZoneForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    
    const formData = new FormData(form);
    
    // 💡 ส่ง action=save_zone ไปด้วยเพื่อให้ webTracking.php รู้ว่าต้องทำอะไร
    formData.append('action', 'save_zone');
    
    const btn = document.querySelector('#apZoneModal .btn-primary');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
    btn.disabled = true;

    // 💡 อัปเดต Path เป็น webTracking.php
    fetch('api/webTracking.php', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('apZoneModal')).hide();
            fetchMappedZones(); // โหลดใหม่เพื่อให้ขึ้นสีเขียวทันที
            
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

// ========================================================
// 🎯 ฟีเจอร์เสริม: คลิกเพื่อบินไปหารถ (Fly-to)
// ========================================================
function flyToForklift(code) {
    if (forkliftMarkers[code]) {
        const latLng = forkliftMarkers[code].getLatLng();
        
        // สั่งให้แผนที่บินไปที่พิกัดนั้น พร้อมซูมระดับ 20 (ซูมลึกสุด)
        map.flyTo(latLng, 20, {
            animate: true,
            duration: 1.5 // ใช้เวลาบิน 1.5 วินาที (ดูนุ่มนวล)
        });
        
        // สั่งให้เปิด Popup รายละเอียดรถขึ้นมาอัตโนมัติ
        setTimeout(() => {
            forkliftMarkers[code].openPopup();
        }, 1500); // รอให้บินเสร็จก่อนค่อยเปิด
    } else {
        // ถ้ารถคันนั้นพิกัดเป็น NULL (หาพิกัดไม่เจอ)
        Swal.fire({
            icon: 'warning',
            title: 'พิกัดไม่พร้อม',
            text: 'ระบบยังไม่ได้รับพิกัดล่าสุดของรถคันนี้',
            timer: 2000,
            showConfirmButton: false
        });
    }
}

// ========================================================
// 🔍 ฟีเจอร์เสริม: ช่องค้นหารถ (Live Filter)
// ========================================================
function filterByStatus(status, btnElement) {
    currentFilter = status;
    
    // สลับสีปุ่มให้รู้ว่ากดอันไหนอยู่
    let buttons = btnElement.parentElement.children;
    for(let i=0; i<buttons.length; i++) {
        buttons[i].classList.remove('active');
    }
    btnElement.classList.add('active');

    filterForkliftList();
}

function filterForkliftList() {
    let searchInput = document.getElementById('search-forklift');
    if (!searchInput) return; // ป้องกัน Error ตอนโหลดหน้าเว็บครั้งแรก

    let input = searchInput.value.toLowerCase();
    let listItems = document.querySelectorAll('#forklift-list li');
    
    listItems.forEach(li => {
        // ข้ามบรรทัด "กำลังโหลดข้อมูล..."
        if (li.innerText.includes("กำลังโหลดข้อมูล")) return;

        let text = li.innerText.toLowerCase(); 
        let isMatchText = text.includes(input);
        
        let isMatchStatus = true;
        if (currentFilter === 'ONLINE') {
            isMatchStatus = text.includes('online'); // คำว่า online มาจาก Badge
        } else if (currentFilter === 'LOW_BAT') {
            isMatchStatus = li.innerHTML.includes('text-danger'); // สีแดงของแบตเตอรี่
        }

        // 💡 [SOLVED] สลับ Class d-none กับ d-flex แทนการใช้ style.display
        if (isMatchText && isMatchStatus) {
            li.classList.remove('d-none');
            li.classList.add('d-flex');
        } else {
            li.classList.remove('d-flex');
            li.classList.add('d-none');
        }
    });
}

// ========================================================
// 🎯 ฟีเจอร์เสริม: โหมดล็อกเป้าติดตาม (Follow Mode)
// ========================================================
function toggleFollow(code, event) {
    if (event) event.stopPropagation(); // ป้องกันไม่ให้ไปทับซ้อนกับ Event คลิก <li> ของ Fly-to
    
    if (followedForklift === code) {
        followedForklift = null; // กดซ้ำเพื่อเลิกติดตาม
        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'ยกเลิกการติดตามเป้าหมาย', showConfirmButton: false, timer: 1500 });
    } else {
        followedForklift = code; // ล็อกเป้า
        flyToForklift(code); // สั่งให้บินไปหาก่อน 1 รอบ
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'กำลังติดตาม: ' + code, showConfirmButton: false, timer: 1500 });
    }
    
    renderList(window.lastData || []); // รีเฟรชปุ่มในลิสต์ให้เปลี่ยนสี
}

// ========================================================
// 🐌 ฟีเจอร์เสริม: เส้นทางย้อนหลัง (Snail Trail)
// ========================================================
function toggleSnailTrail(code, event) {
    if (event) event.stopPropagation(); 

    // ถ้ากดซ้ำคันเดิม คือการสั่ง "ปิด" เส้นทาง
    if (showingTrailFor === code) {
        if (snailTrailLayer) map.removeLayer(snailTrailLayer);
        showingTrailFor = null;
        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'ซ่อนเส้นทางแล้ว', showConfirmButton: false, timer: 1500 });
        renderList(window.lastData || []);
        return;
    }

    // แจ้งเตือนกำลังโหลด
    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'กำลังโหลดเส้นทาง...', showConfirmButton: false, timer: 1000 });

    // 💡 อัปเดต Path เป็น webTracking.php
    fetch(`api/webTracking.php?action=get_history&code=${code}&mins=60`) // ดึง 60 นาทีล่าสุด
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data.length > 0) {
                drawTrail(res.data, code);
            } else {
                Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'ไม่พบประวัติการวิ่ง', showConfirmButton: false, timer: 2000 });
            }
        });
}

function drawTrail(logs, code) {
    // ลบเส้นเก่าทิ้งก่อน (ถ้ามี)
    if (snailTrailLayer) map.removeLayer(snailTrailLayer);
    
    let pathCoordinates = [];

    logs.forEach(log => {
        let lat = null;
        let lng = null;

        // คอนเวิร์ตพิกัดเหมือนที่เราทำตอน Live Tracking เลย
        if (log.location_type === 'OUTDOOR' && log.lat && log.lng) {
            lat = parseFloat(log.lat);
            lng = parseFloat(log.lng);
        } else if (log.location_type === 'INDOOR' && log.indoor_x !== null && log.indoor_y !== null) {
            const latDiff = FACTORY_BOUNDS[0][0] - FACTORY_BOUNDS[1][0]; 
            const lngDiff = FACTORY_BOUNDS[1][1] - FACTORY_BOUNDS[0][1]; 
            lat = FACTORY_BOUNDS[0][0] - ((log.indoor_y / 1000) * latDiff);
            lng = FACTORY_BOUNDS[0][1] + ((log.indoor_x / 1000) * lngDiff);
        }

        if (lat !== null && lng !== null) {
            pathCoordinates.push([lat, lng]);
        }
    });

    if (pathCoordinates.length < 2) {
         Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'พิกัดน้อยเกินไปที่จะวาดเส้น', showConfirmButton: false, timer: 2000 });
         return;
    }

    // วาดเส้น Polyline สีน้ำเงินสุดเท่! (ปรับสีได้ตรง color)
    snailTrailLayer = L.polyline(pathCoordinates, {
        color: '#0d6efd',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10', // ทำให้เป็นเส้นประ
        lineJoin: 'round'
    }).addTo(map);

    showingTrailFor = code;
    
    // บินไปซูมให้เห็นเส้นทางทั้งหมดพอดีจอ
    map.fitBounds(snailTrailLayer.getBounds(), { padding: [50, 50], animate: true });
    
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `แสดงเส้นทาง 1 ชม. ของ ${code}`, showConfirmButton: false, timer: 2000 });
    renderList(window.lastData || []);
}

// ========================================================
// 🔥 ฟีเจอร์เสริม: แผนที่จุดความร้อน (Traffic Heatmap)
// ========================================================
function toggleHeatmap() {
    // ถ้ามี Heatmap อยู่แล้ว ให้ลบออก (กดเพื่อปิด)
    if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
        heatmapLayer = null;
        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'ปิดโหมด Heatmap แล้ว', showConfirmButton: false, timer: 1500 });
        return;
    }

    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'กำลังคำนวณความหนาแน่น...', showConfirmButton: false, timer: 1000 });

    // 💡 อัปเดต Path เป็น webTracking.php
    fetch('api/webTracking.php?action=get_heatmap&hours=24')
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data.length > 0) {
                drawHeatmap(res.data);
            } else {
                Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'ไม่มีประวัติการวิ่งใน 24 ชม.', showConfirmButton: false, timer: 2000 });
            }
        })
        .catch(err => console.error("Heatmap Error:", err));
}

function drawHeatmap(logs) {
    let heatPoints = [];

    // แปลงข้อมูลให้อยู่ในรูปแบบ [lat, lng, intensity]
    logs.forEach(log => {
        let lat = null;
        let lng = null;

        if (log.location_type === 'OUTDOOR' && log.lat && log.lng) {
            lat = parseFloat(log.lat);
            lng = parseFloat(log.lng);
        } else if (log.location_type === 'INDOOR' && log.indoor_x !== null && log.indoor_y !== null) {
            const latDiff = FACTORY_BOUNDS[0][0] - FACTORY_BOUNDS[1][0]; 
            const lngDiff = FACTORY_BOUNDS[1][1] - FACTORY_BOUNDS[0][1]; 
            lat = FACTORY_BOUNDS[0][0] - ((log.indoor_y / 1000) * latDiff);
            lng = FACTORY_BOUNDS[0][1] + ((log.indoor_x / 1000) * lngDiff);
        }

        if (lat !== null && lng !== null) {
            // ค่าที่ 3 คือความแรง (Intensity) ตั้งไว้ที่ 1 ต่อ 1 จุดพิกัด
            heatPoints.push([lat, lng, 1]);
        }
    });

    // วาด Heatmap ลงบนแผนที่
    heatmapLayer = L.heatLayer(heatPoints, {
        radius: 35,       // ขนาดรัศมีของเมฆแต่ละจุด (ขยายให้ดูฟุ้งๆ)
        blur: 20,         // ความเบลอขอบ
        maxZoom: 18,      // ซูมระดับไหนถึงจะเห็นชัดสุด
        max: 5,           // ถ้ามีจุดทับกัน 5 จุด จะกลายเป็น "สีแดงเข้มสุด"
        gradient: {
            0.4: 'blue',  // ทับกันนิดหน่อย (สีฟ้า)
            0.6: 'cyan',  // ปานกลาง (สีเขียวอมฟ้า)
            0.7: 'lime',  // เริ่มเยอะ (สีเขียวตอง)
            0.8: 'yellow',// หนาแน่น (สีเหลือง)
            1.0: 'red'    // คอขวด/จอดแช่ (สีแดง)
        }
    }).addTo(map);

    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'เปิดโหมด Heatmap สำเร็จ', showConfirmButton: false, timer: 2000 });
}

// ========================================================
// ⏪▶️ ฟีเจอร์เสริม: โหมดจำลองการวิ่งย้อนหลัง (Time Playback)
// ========================================================
let playbackData = [];
let playbackIndex = 0;
let playbackTimer = null;
let isPlaying = false;
let playbackMarker = null;

function initPlayback(code, event) {
    if (event) event.stopPropagation();
    
    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'กำลังดึงข้อมูลจำลอง...', showConfirmButton: false, timer: 1000 });

    // 💡 อัปเดต Path เป็น webTracking.php
    fetch(`api/webTracking.php?action=get_history&code=${code}&mins=60`)
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data.length > 0) {
                setupPlaybackUI(res.data, code);
            } else {
                Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'ไม่มีประวัติเพียงพอให้จำลอง', showConfirmButton: false, timer: 2000 });
            }
        });
}

function setupPlaybackUI(logs, code) {
    // 1. แปลงพิกัดทั้งหมดให้พร้อมใช้
    playbackData = logs.map(log => {
        let lat = null, lng = null;
        if (log.location_type === 'OUTDOOR' && log.lat && log.lng) {
            lat = parseFloat(log.lat);
            lng = parseFloat(log.lng);
        } else if (log.location_type === 'INDOOR' && log.indoor_x !== null && log.indoor_y !== null) {
            const latDiff = FACTORY_BOUNDS[0][0] - FACTORY_BOUNDS[1][0]; 
            const lngDiff = FACTORY_BOUNDS[1][1] - FACTORY_BOUNDS[0][1]; 
            lat = FACTORY_BOUNDS[0][0] - ((log.indoor_y / 1000) * latDiff);
            lng = FACTORY_BOUNDS[0][1] + ((log.indoor_x / 1000) * lngDiff);
        }
        return { lat, lng, time: log.recorded_at, loc: log.last_location };
    }).filter(p => p.lat !== null && p.lng !== null);

    if (playbackData.length < 2) return;

    // 2. เปิดหน้าต่าง Controls
    document.getElementById('playback-controls').classList.remove('d-none');
    document.getElementById('playback-title').innerText = `Playback: ${code}`;
    
    // ตั้งค่า Slider
    const slider = document.getElementById('playback-slider');
    slider.max = playbackData.length - 1;
    slider.value = 0;
    playbackIndex = 0;

    // 3. วาดเส้นทางจางๆ ปูพื้นไว้ก่อน (เรียกฟังก์ชัน drawTrail เดิม)
    drawTrail(logs, code);

    // 4. สร้าง Ghost Marker สีม่วง (ไอคอนต่างจากปกติ จะได้ไม่สับสน)
    if (playbackMarker) map.removeLayer(playbackMarker);
    const ghostIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: `<div class="forklift-marker-wrapper" style="background-color: #6f42c1; box-shadow: 0 0 15px #6f42c1;"><i class="fas fa-ghost text-white"></i></div>`,
        iconSize: [32, 32], iconAnchor: [16, 16]
    });
    
    playbackMarker = L.marker([playbackData[0].lat, playbackData[0].lng], { icon: ghostIcon, zIndexOffset: 1000 }).addTo(map);
    updatePlaybackStatus();
}

function togglePlayback() {
    if (isPlaying) pausePlayback();
    else playPlayback();
}

function playPlayback() {
    if (playbackIndex >= playbackData.length - 1) playbackIndex = 0; // ถ้ารันจบแล้ว กด Play ใหม่ให้เริ่มใหม่
    
    isPlaying = true;
    document.getElementById('icon-play').className = 'fas fa-pause';
    
    playbackTimer = setInterval(() => {
        playbackIndex++;
        if (playbackIndex >= playbackData.length) {
            pausePlayback();
            return;
        }
        document.getElementById('playback-slider').value = playbackIndex;
        updatePlaybackStatus();
    }, 1000); // 1 วินาที ขยับ 1 จุด (ปรับให้เร็วขึ้นได้)
}

function pausePlayback() {
    isPlaying = false;
    document.getElementById('icon-play').className = 'fas fa-play';
    clearInterval(playbackTimer);
}

function seekPlayback() {
    playbackIndex = parseInt(document.getElementById('playback-slider').value);
    updatePlaybackStatus();
}

function updatePlaybackStatus() {
    const point = playbackData[playbackIndex];
    if (!point) return;
    
    playbackMarker.setLatLng([point.lat, point.lng]);
    map.panTo([point.lat, point.lng], { animate: true, duration: 0.5 }); // กล้องบินตามรถผี
    
    document.getElementById('playback-time').innerText = `🕒 ${point.time} | 📍 ${point.loc}`;
}

function closePlayback() {
    pausePlayback();
    document.getElementById('playback-controls').classList.add('d-none');
    if (playbackMarker) { map.removeLayer(playbackMarker); playbackMarker = null; }
    if (snailTrailLayer) map.removeLayer(snailTrailLayer); // ซ่อนเส้นทางด้วย
}

// ========================================================
// 🎯 ฟังก์ชันดึงกล้องกลับจุดกึ่งกลาง (Reset View)
// ========================================================
function resetMapView() {
    // พิกัดเริ่มต้น และซูมระดับ 16 (ปรับตามความเหมาะสมของโรงงานคุณได้เลย)
    map.flyTo([12.886349, 101.092567], 16, {
        animate: true,
        duration: 1.0 // ใช้เวลาบินกลับ 1 วินาที ให้ดูสมูทๆ
    });
}