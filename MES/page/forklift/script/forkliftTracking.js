// ตั้งค่าความละเอียดของ Grid
const GRID_COLS = 40;
const GRID_ROWS = 30;
let mappedZones = [];
let currentFilter = 'ALL';
let followedForklift = null;
let snailTrailLayer = null;
let showingTrailFor = null;
let heatmapLayer = null;
let globalForkliftData = [];
let globalBookings = [];
let dashboardInterval = null;
let lastListHtml = '';
const safeUserName = typeof CURRENT_USER_NAME !== 'undefined' ? CURRENT_USER_NAME : '';



// 📌 [สำคัญ] พิกัดขอบเขตของรูปโรงงานคุณ (มุมซ้ายบน, มุมขวาล่าง)
// ไปหาพิกัดจริงจาก Google Maps แล้วมาเปลี่ยนตรงนี้นะครับ
const FACTORY_BOUNDS = [
    [12.889578, 101.088351], // Lat, Lng ซ้ายบนของอาคาร
    [12.883121, 101.096783]  // Lat, Lng ขวาล่างของอาคาร
];



let map;
let forkliftMarkers = {};
let gridLayerGroup; // สำหรับเก็บเส้น Grid และสีไฮไลต์
let isGridVisible = false; // ปิดเส้นตารางไว้ก่อนตอนเริ่มต้น

// สถานะสำหรับการตั้งค่าตึกจำลอง
let isIndoorSetupMode = false;
let indoorSimGrids = JSON.parse(localStorage.getItem('indoorSimGrids') || '[]');

// [FUTURE FEATURE] ตัวแปรสำหรับ X-Ray Mode
let xrayLayer;
let isXrayOn = false;

// Simulator Variables
let isSimulatorMode = false;
let simWaypoints = [];
let simRouteLayer = null;
let simMarkers = [];
let simInterval = null;
let isSimPlaying = false;
let simCurrentPosition = null;
let simTargetIndex = 0;
let simIndoorTicks = 0; // ตัวนับเวลาว่าอยู่ในตึกนานแค่ไหน

document.addEventListener('DOMContentLoaded', function () {
    startPolling();

    // Smart Polling
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopPolling();
        } else {
            fetchMapData();
            startPolling();
        }
    });

    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
        initMap();
        fetchMappedZones(); // โหลดข้อมูล Zone ทั้งหมดมาเก็บไว้ตอนเปิดหน้าเว็บ

        // ========================================================
        // 🛠️ DEV TOOL: คลิกบนแผนที่เพื่อ Map Wi-Fi Zone
        // ========================================================
        mapContainer.addEventListener('click', function (e) {
            // ให้ฟังก์ชันนี้ทำงานผ่าน Leaflet map.on('click') แทนจะดีกว่า เพื่อให้ตรงพิกัด
            // แต่ถ้าผูกไว้กับ Grid Rectangle แล้ว ส่วนนี้อาจจะไม่ค่อยได้ใช้ครับ
        });
    }

    // คำนวณเวลาคืนรถอัตโนมัติ (+1 ชม.) สำหรับหน้า Booking
    const bookStartInput = document.getElementById('book_start_time');
    if (bookStartInput) {
        bookStartInput.addEventListener('change', function () {
            if (this.value) {
                let d = new Date(this.value);
                d.setHours(d.getHours() + 1);
                let iso = d.toLocaleString('sv').replace(' ', 'T').slice(0, 16);
                document.getElementById('book_end_time').value = iso;
            }
        });
    }
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

    // สร้าง Layer Group ไว้ใส่ Grid (ยังไม่ต้อง Add ลง Map จนกว่าจะกดเปิด)
    gridLayerGroup = L.layerGroup();

    // Event Click บนแผนที่สำหรับ Simulator Mode
    map.on('click', function (e) {
        if (isSimulatorMode) {
            addSimWaypoint(e.latlng);
        }
    });
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
            if (data.success) {
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
            let isIndoorSim = indoorSimGrids.includes(gridName);

            let fillColor = 'transparent';
            let fillOpacity = 0.05;
            if (isIndoorSim) {
                fillColor = '#00aaff';
                fillOpacity = 0.4;
            }
            if (isMapped) {
                fillColor = '#198754';
                fillOpacity = 0.4;
            }

            // สร้างกรอบสี่เหลี่ยม Leaflet
            const rect = L.rectangle(bounds, {
                color: 'rgba(0,0,0,0.3)', // สีเส้นขอบ
                weight: 1,
                fillColor: fillColor,
                fillOpacity: fillOpacity
            });

            // ผูก Event Click
            rect.on('click', function (e) {
                if (isIndoorSetupMode) {
                    const index = indoorSimGrids.indexOf(gridName);
                    if (index > -1) {
                        indoorSimGrids.splice(index, 1);
                        this.setStyle({ fillColor: 'transparent', fillOpacity: 0.05 });
                    } else {
                        indoorSimGrids.push(gridName);
                        this.setStyle({ fillColor: '#00aaff', fillOpacity: 0.4 });
                    }
                    localStorage.setItem('indoorSimGrids', JSON.stringify(indoorSimGrids));

                    L.DomEvent.stopPropagation(e);
                    return;
                }

                if (isSimulatorMode && !isSimPlaying) {
                    addSimWaypoint(e.latlng);
                    L.DomEvent.stopPropagation(e);
                    return;
                }

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
            L.marker([centerLat, centerLng], { icon: labelIcon, interactive: false }).addTo(gridLayerGroup);
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
    if (typeof IS_ADMIN !== 'undefined' && !IS_ADMIN) return;

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
        document.getElementById('zone_rssi_1').value = existingZone.rssi_1 || '';
        document.getElementById('zone_bssid_2').value = existingZone.bssid_2 || '';
        document.getElementById('zone_rssi_2').value = existingZone.rssi_2 || '';
        document.getElementById('zone_bssid_3').value = existingZone.bssid_3 || '';
        document.getElementById('zone_rssi_3').value = existingZone.rssi_3 || '';
    } else {
        document.getElementById('zone_bssid_1').value = '';
        document.getElementById('zone_rssi_1').value = '';
        document.getElementById('zone_bssid_2').value = '';
        document.getElementById('zone_rssi_2').value = '';
        document.getElementById('zone_bssid_3').value = '';
        document.getElementById('zone_rssi_3').value = '';
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
function startPolling() {
    if (dashboardInterval) clearInterval(dashboardInterval);
    fetchMapData();
    dashboardInterval = setInterval(fetchMapData, 3000);
}

function stopPolling() {
    if (dashboardInterval) {
        clearInterval(dashboardInterval);
        dashboardInterval = null;
    }
}

async function fetchTimelineData() {
    try {
        const formData = new FormData();
        formData.append('action', 'get_timeline');
        const res = await fetch('api/forkliftManage.php', { method: 'POST', body: formData });
        const json = await res.json();
        if (json.status) {
            globalBookings = json.data;
        }
    } catch (e) {
        console.error("Fetch timeline error:", e);
    }
}

async function fetchMapData() {
    await fetchTimelineData();
    fetch('api/webTracking.php?action=get_realtime')
        .then(response => response.json())
        .then(res => {
            if (res.success) {
                globalForkliftData = res.data;
                if (typeof updateKPIs === 'function') updateKPIs(globalForkliftData);
                const container = document.getElementById('map-container');
                if (container) {
                    renderMapMarkers(res.data);
                    renderList(res.data);

                    const simSelect = document.getElementById('sim-forklift-select');
                    if (simSelect && simSelect.options.length <= 1) {
                        populateSimDropdown();
                    }
                }
                const timeEl = document.getElementById('last-update-time');
                if (timeEl) timeEl.innerText = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
        const markerStateHash = `${fl.status}_${fl.current_battery}_${fl.is_offline}`;

        // เช็คว่ารถคันนี้กำลังถูกเปิด Simulator จากเบราว์เซอร์นี้อยู่หรือไม่
        const isCurrentlySimulating = (isSimulatorMode && typeof isSimPlaying !== 'undefined' && isSimPlaying && fl.code === document.getElementById('sim-forklift-select').value);

        // วาดและขยับ Marker
        if (forkliftMarkers[fl.code]) {
            // ถ้ากำลังจำลองอยู่ ให้ข้ามการอัปเดตพิกัดจาก Server ไปก่อน เพื่อไม่ให้พิกัดตีกัน (Warping)
            if (!isCurrentlySimulating) {
                forkliftMarkers[fl.code].setLatLng([finalLat, finalLng]);
            }
            if (forkliftMarkers[fl.code].lastStateHash !== markerStateHash) {
                forkliftMarkers[fl.code].setIcon(customIcon);
                forkliftMarkers[fl.code].lastStateHash = markerStateHash;
            }
            if (forkliftMarkers[fl.code].getPopup().getContent() !== popupContent) {
                forkliftMarkers[fl.code].getPopup().setContent(popupContent);
            }
        } else {
            forkliftMarkers[fl.code] = L.marker([finalLat, finalLng], { icon: customIcon })
                .addTo(map)
                .bindPopup(popupContent);
            forkliftMarkers[fl.code].lastStateHash = markerStateHash;
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
    const list = document.getElementById('forklift-list');
    if (!list) return;
    let html = '';

    if (data.length === 0) {
        list.innerHTML = '<li class="list-group-item text-center text-muted">ไม่พบข้อมูล</li>';
        return;
    }

    data.forEach(fl => {
        const isOffline = fl.is_offline == 1 || (new Date() - new Date(fl.last_updated)) > 180000;
        const statusIcon = isOffline ? '<i class="fas fa-wifi text-secondary" title="Offline"></i>' : '<i class="fas fa-wifi text-success" title="Online"></i>';

        let stateText = 'ว่าง (Available)'; let stateClass = 'bg-success';
        if (fl.status === 'MAINTENANCE') { stateText = 'ซ่อมบำรุง'; stateClass = 'bg-secondary'; }
        else if (fl.status === 'IN_USE') { stateText = 'กำลังใช้งาน'; stateClass = 'bg-primary'; }
        else if (fl.status === 'CHARGING') { stateText = 'กำลังชาร์จ'; stateClass = 'bg-warning text-dark'; }

        let batIcon = 'fa-battery-full text-success';
        if (fl.current_battery < 20) batIcon = 'fa-battery-empty text-danger';
        else if (fl.current_battery < 50) batIcon = 'fa-battery-half text-warning';

        const isFollowing = (followedForklift === fl.code);
        const isShowingTrail = (showingTrailFor === fl.code);
        const followBtnClass = isFollowing ? 'btn-danger' : 'btn-light';
        const trailBtnClass = isShowingTrail ? 'btn-info text-white' : 'btn-light';

        const myPendingBooking = typeof globalBookings !== 'undefined' ? globalBookings.find(b => b.forklift_id == fl.id && b.user_name === safeUserName && b.status === 'BOOKED') : null;
        let actionBtn = '';

        if (fl.status === 'MAINTENANCE') {
            actionBtn = `<button class="btn btn-sm btn-light border text-muted w-100" disabled><i class="fas fa-ban me-1"></i> ปิดใช้งาน</button>`;
        } else if (fl.status === 'IN_USE') {
            if (fl.current_driver === safeUserName || (typeof IS_ADMIN !== 'undefined' && IS_ADMIN)) {
                let bClass = (fl.current_driver === safeUserName) ? 'btn-warning' : 'btn-danger';
                let bText = (fl.current_driver === safeUserName) ? 'คืนรถ' : 'บังคับคืน';
                actionBtn = `<button class="btn btn-sm ${bClass} w-100 fw-bold shadow-sm" onclick="event.stopPropagation(); checkAction(${fl.id})"><i class="fas fa-undo me-1"></i>${bText}</button>`;
            } else {
                actionBtn = `<button class="btn btn-sm btn-outline-primary w-100 fw-bold shadow-sm" onclick="event.stopPropagation(); openBookingModal(${fl.id}, '${fl.code}', '${fl.name}')"><i class="far fa-clock me-1"></i> จองคิว</button>`;
            }
        } else if (myPendingBooking) {
            actionBtn = `<button class="btn btn-sm btn-success w-100 fw-bold shadow-sm" onclick="event.stopPropagation(); checkAction(${fl.id})"><i class="fas fa-play me-1"></i> เริ่มงาน</button>`;
        } else {
            actionBtn = `<button class="btn btn-sm btn-primary w-100 fw-bold shadow-sm" onclick="event.stopPropagation(); checkAction(${fl.id})"><i class="fas fa-key me-1"></i> เบิกใช้</button>`;
        }

        let activeTaskHtml = '';
        if (fl.status === 'IN_USE' && fl.usage_details) {
            let estReturn = fl.end_time_est ? fl.end_time_est.substring(11, 16) : '-';
            activeTaskHtml = `
            <div class="mt-2 mb-2 p-2 rounded bg-primary bg-opacity-10 border border-primary border-opacity-25" style="font-size: 0.75rem;">
                <div class="d-flex justify-content-between mb-1">
                    <span class="text-primary fw-bold"><i class="fas fa-tasks me-1"></i> ${fl.usage_details}</span>
                </div>
                <div class="d-flex justify-content-between text-muted">
                    <span><i class="fas fa-hourglass-half me-1"></i> คืนรถ(Est): <strong class="text-danger">${estReturn}</strong></span>
                </div>
            </div>`;
        }

        html += `
            <li class="list-group-item p-3 fleet-list-item" onclick="flyToForklift('${fl.code}')">
            <div class="d-flex justify-content-between align-items-start mb-1">
                <div>
                    <h6 class="fw-bold mb-0 text-dark">${fl.code} <span class="text-muted fw-normal ms-1" style="font-size:0.75rem;">${fl.name}</span></h6>
                </div>
                <div>
                    ${statusIcon} <span class="badge ${stateClass} ms-1">${stateText}</span>
                </div>
            </div>
            
            <div class="fleet-info-grid">
                <div class="text-truncate" title="${fl.current_driver || '-'}"><i class="fas fa-user-circle"></i> ${fl.current_driver || '-'}</div>
                <div class="text-end"><i class="fas ${batIcon}"></i> ${fl.current_battery || 0}%</div>
                <div class="text-truncate" style="grid-column: span 2;" title="${fl.last_location || 'Unknown'}"><i class="fas fa-map-marker-alt"></i> ${fl.last_location || 'Unknown'}</div>
            </div>

            ${activeTaskHtml}

            <div class="d-flex justify-content-between align-items-center mt-2">
                <div class="btn-group shadow-sm" role="group">
                    <button class="btn btn-sm btn-light border" onclick="initPlayback('${fl.code}', event)" title="Playback"><i class="fas fa-play-circle text-secondary"></i></button>
                    <button class="btn btn-sm ${trailBtnClass} border" onclick="toggleSnailTrail('${fl.code}', event)" title="Trail"><i class="fas fa-route"></i></button>
                    <button class="btn btn-sm ${followBtnClass} border" onclick="toggleFollow('${fl.code}', event)" title="Follow"><i class="fas fa-crosshairs"></i></button>
                </div>
                <div style="min-width: 100px;">
                    ${actionBtn}
                </div>
            </div>
        </li>`;
    });

    if (lastListHtml !== html) {
        list.innerHTML = html;
        lastListHtml = html;
        if (typeof filterForkliftList === 'function') filterForkliftList();
    }
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
    for (let i = 0; i < buttons.length; i++) {
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

        if (isMatchText && isMatchStatus) {
            li.classList.remove('d-none');
            li.classList.add('d-block');
        } else {
            li.classList.remove('d-block');
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
        max: 30,          // เพิ่มจาก 5 เป็น 30 เพื่อให้แดงยากขึ้น (ต้องวิ่งซ้ำๆ หรือจุดเดิมบ่อยๆ ถึงจะแดง)
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

// ========================================================
// 🎮 ฟีเจอร์เสริม: Simulator Mode (จำลองการวิ่งบนแผนที่)
// ========================================================
function toggleSimulatorMode() {
    isSimulatorMode = !isSimulatorMode;
    const panel = document.getElementById('simulator-controls');

    if (isSimulatorMode) {
        panel.classList.remove('d-none');
        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'เปิด Simulator Mode (คลิกบนแผนที่เพื่อวาดเส้นทาง)', showConfirmButton: false, timer: 3000 });

        // Populate Forklift Dropdown
        const select = document.getElementById('sim-forklift-select');
        select.innerHTML = '<option value="">-- เลือกรถที่ต้องการจำลอง --</option>';
        if (window.lastData) {
            window.lastData.forEach(fl => {
                select.innerHTML += `<option value="${fl.code}">${fl.code} - ${fl.name || ''}</option>`;
            });
        }
        // นำเส้นทางและจุดจำลองกลับมาแสดงใหม่
        drawSimRoute();
        simMarkers.forEach(m => {
            if (!map.hasLayer(m)) m.addTo(map);
        });
    } else {
        panel.classList.add('d-none');
        if (isSimPlaying) toggleSimPlaying();
        clearSimRoute();
    }
}

function hideSimUI() {
    const panel = document.getElementById('simulator-controls');
    panel.classList.add('d-none');

    // ซ่อนเส้นทาง (Polyline และ Markers)
    if (simRouteLayer) map.removeLayer(simRouteLayer);
    simMarkers.forEach(m => map.removeLayer(m));

    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'ซ่อน UI แล้ว (กดจอยสติ๊ก 🎮 มุมล่างซ้ายเพื่อเปิดใหม่)', showConfirmButton: false, timer: 3000 });
}

function toggleIndoorSetupMode() {
    isIndoorSetupMode = !isIndoorSetupMode;
    const btn = document.getElementById('indoor-setup-btn');
    if (isIndoorSetupMode) {
        btn.classList.replace('btn-outline-info', 'btn-info');
        btn.classList.add('text-white');

        // บังคับเปิดตาราง Grid ถ้ายังไม่เปิด
        if (!isGridVisible) toggleGrid();

        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'โหมดตั้งค่าตึก: คลิกที่ช่อง Grid เพื่อกำหนดเป็นพื้นที่ในอาคาร', showConfirmButton: false, timer: 4000 });
    } else {
        btn.classList.replace('btn-info', 'btn-outline-info');
        btn.classList.remove('text-white');
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'ออกจากโหมดตั้งค่าตึกแล้ว', showConfirmButton: false, timer: 2000 });
    }
}

function addSimWaypoint(latlng) {
    simWaypoints.push(latlng);

    const marker = L.circleMarker(latlng, { radius: 5, color: 'red', fillColor: '#f03', fillOpacity: 1 }).addTo(map);
    simMarkers.push(marker);

    drawSimRoute();
}

function drawSimRoute() {
    if (simRouteLayer) map.removeLayer(simRouteLayer);
    if (simWaypoints.length > 1) {
        simRouteLayer = L.polyline(simWaypoints, { color: 'green', weight: 4, dashArray: '5, 10' }).addTo(map);
    }
}

function clearSimRoute() {
    if (isSimPlaying) toggleSimPlaying();

    simWaypoints = [];
    simMarkers.forEach(m => map.removeLayer(m));
    simMarkers = [];
    if (simRouteLayer) map.removeLayer(simRouteLayer);
    simRouteLayer = null;
    simCurrentPosition = null;
    simTargetIndex = 0;
    simIndoorTicks = 0;
}

function toggleSimPlaying() {
    // ถ้าสถานะเป็นกำลังเล่นอยู่ เราจะข้ามเงื่อนไขตรวจสอบไปที่การหยุด (Stop) เลย
    if (!isSimPlaying) {
        if (!isSimulatorMode) return;

        const code = document.getElementById('sim-forklift-select').value;
        if (!code) {
            Swal.fire('แจ้งเตือน', 'กรุณาเลือกรถที่ต้องการจำลองก่อน', 'warning');
            return;
        }

        if (simWaypoints.length < 2) {
            Swal.fire('แจ้งเตือน', 'กรุณาคลิกสร้างเส้นทางบนแผนที่อย่างน้อย 2 จุด', 'warning');
            return;
        }

        isSimPlaying = true;
        const btnIcon = document.getElementById('sim-play-icon');
        const btn = document.getElementById('sim-start-btn');

        if (btnIcon && btn) {
            btnIcon.className = 'fas fa-pause';
            btn.classList.replace('btn-success', 'btn-warning');
            btn.innerHTML = '<i class="fas fa-pause" id="sim-play-icon"></i> หยุดจำลอง';
        }

        if (!simCurrentPosition) {
            simCurrentPosition = { ...simWaypoints[0] };
            simTargetIndex = 1;
            simIndoorTicks = 0;
        }

        // Start Interval loop
        const speedMultiplier = parseInt(document.getElementById('sim-speed').value);
        let simApiTick = 0;
        simInterval = setInterval(() => {
            processSimStep(code, speedMultiplier, simApiTick);
            simApiTick++;
        }, 100); // รันทุกๆ 100ms เพื่อให้ภาพดูลื่นไหล (Smooth)

        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'เริ่มจำลองการวิ่ง...', showConfirmButton: false, timer: 1500 });
    } else {
        isSimPlaying = false;
        clearInterval(simInterval);

        const btnIcon = document.getElementById('sim-play-icon');
        const btn = document.getElementById('sim-start-btn');
        if (btnIcon && btn) {
            btnIcon.className = 'fas fa-play';
            btn.classList.replace('btn-warning', 'btn-success');
            btn.innerHTML = '<i class="fas fa-play" id="sim-play-icon"></i> เริ่มจำลอง';
        }
    }
}

function processSimStep(code, speed, tick) {
    if (simTargetIndex >= simWaypoints.length) {
        // วิ่งสุดเส้นทางแล้ว ให้วนกลับไปจุดเริ่มต้นใหม่
        simCurrentPosition = { ...simWaypoints[0] };
        simTargetIndex = 1;
    }

    const target = simWaypoints[simTargetIndex];

    // คำนวณระยะทางและทิศทาง
    const dLat = target.lat - simCurrentPosition.lat;
    const dLng = target.lng - simCurrentPosition.lng;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);

    // สมมติว่าความเร็ว 1 สเกล = 0.00005 องศาต่อวินาที
    // เนื่องจากเรารันทุก 100ms (10 ครั้ง/วิ) จึงต้องหารระยะทางด้วย 10
    const stepSize = (0.00005 * speed) / 10;

    if (dist <= stepSize) {
        // ถึงเป้าหมายแล้ว
        simCurrentPosition = { ...target };
        simTargetIndex++;
    } else {
        // ค่อยๆ เขยิบไปตามเส้นทาง
        simCurrentPosition.lat += (dLat / dist) * stepSize;
        simCurrentPosition.lng += (dLng / dist) * stepSize;
    }

    // [FEATURE] INDOOR WI-FI SIMULATION
    let displayLat = simCurrentPosition.lat;
    let displayLng = simCurrentPosition.lng;

    const latTop = FACTORY_BOUNDS[0][0];
    const lngLeft = FACTORY_BOUNDS[0][1];
    const latBottom = FACTORY_BOUNDS[1][0];
    const lngRight = FACTORY_BOUNDS[1][1];

    const latStep = (latTop - latBottom) / GRID_ROWS;
    const lngStep = (lngRight - lngLeft) / GRID_COLS;

    // หาช่องตารางที่รถอยู่ปัจจุบัน
    let rIndex = Math.floor((latTop - displayLat) / latStep);
    let cIndex = Math.floor((displayLng - lngLeft) / lngStep);

    // Safety
    if (rIndex < 0) rIndex = 0; if (rIndex >= GRID_ROWS) rIndex = GRID_ROWS - 1;
    if (cIndex < 0) cIndex = 0; if (cIndex >= GRID_COLS) cIndex = GRID_COLS - 1;

    // แปลงกลับเป็นชื่อ Grid (เช่น C4)
    const rowNum = rIndex + 1;
    const colName = String.fromCharCode(65 + cIndex);
    const cellId = colName + rowNum;

    // ถ้ารถอยู่ในขอบเขตตึกที่ตั้งค่าไว้ (หรือมีเสา Wi-Fi แล้ว ก็ให้เป็น Wi-Fi Snap เลย)
    const isMapped = window.mappedZones && window.mappedZones.some(z => z.grid_col === colName && z.grid_row === rowNum.toString());
    if (indoorSimGrids.includes(cellId) || isMapped) {
        simIndoorTicks++;
        // จำลองสถานการณ์: รอให้เข้ามาในอาคารนานกว่า 20 Ticks (2 วินาที) ก่อนถึงจะจับสัญญาณ Wi-Fi ได้
        // เพื่อป้องกันอาการกระตุกเวลาเฉียดขอบตึก
        if (simIndoorTicks > 20) {
            // คืนค่ากลับไปเป็นพิกัด "กึ่งกลาง" ของช่อง Grid นั้นๆ
            displayLat = latTop - (rIndex * latStep) - (latStep / 2);
            displayLng = lngLeft + (cIndex * lngStep) + (lngStep / 2);
        }
    } else {
        // ถ้ารถออกมานอกขอบเขตตึก ให้รีเซ็ตเวลาใหม่
        simIndoorTicks = 0;
    }

    // อัปเดตพิกัด Marker บนหน้าจอทันที เพื่อไม่ให้เกิดภาพกระตุก (Warping)
    if (forkliftMarkers[code]) {
        forkliftMarkers[code].setLatLng([displayLat, displayLng]);

        // ถ้าคันนี้ถูก Follow อยู่ ก็ให้กล้องบินตามแบบนุ่มๆ
        if (followedForklift === code) {
            map.panTo([displayLat, displayLng], { animate: false });
        }
    }

    // ยิง API ไปที่ Server แค่ 1 ครั้งต่อวินาที (ทุกๆ 10 tick) เพื่อไม่ให้ Server ทำงานหนัก
    if (tick % 10 === 0) {
        // จำลองแบตเตอรี่แบบลดลงเรื่อยๆ
        let simBat = Math.floor(Math.random() * 10) + 70; // สุ่ม 70-80 หรือใช้ของเดิม
        // ดึงแบตเตอรี่ปัจจุบันจากหน้าจอ
        if (window.lastData) {
            const fl = window.lastData.find(f => f.code === code);
            if (fl && fl.current_battery) {
                simBat = fl.current_battery;
                // จำลองแบตลด 1% ทุกๆ ความน่าจะเป็น 5%
                if (Math.random() < 0.05 && simBat > 5) simBat--;
            }
        }

        // ยิง API ไปที่ hardwareTracking.php
        const payload = {
            forklift_code: code,
            lat: parseFloat(displayLat.toFixed(6)),
            lng: parseFloat(displayLng.toFixed(6)),
            battery: simBat
        };

        fetch('api/hardwareTracking.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
            .catch(err => console.error("Sim Error:", err));
    }
}

// ========================================================
// 📝 ฟีเจอร์เสริม: การจองรถ (Booking)
// ========================================================
function openBookingModal(id, code, name, event) {
    if (event) event.stopPropagation();
    document.getElementById('bookingForm').reset();
    document.getElementById('book_forklift_id').value = id;
    document.getElementById('book_forklift_name').innerText = code + " : " + (name || 'Forklift');

    const now = new Date();
    const isoNow = now.toLocaleString('sv').replace(' ', 'T').slice(0, 16);
    const startTimeInput = document.getElementById('book_start_time');
    if (startTimeInput) {
        startTimeInput.value = isoNow;
        startTimeInput.dispatchEvent(new Event('change'));
    }

    bootstrap.Modal.getOrCreateInstance(document.getElementById('bookingModal')).show();
}

async function submitBooking() {
    const form = document.getElementById('bookingForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const formData = new FormData(form);
    formData.append('action', 'book_forklift');

    const modalEl = document.querySelector('#bookingModal');
    const submitBtn = modalEl.querySelector('.modal-footer .btn-primary');
    const originalText = submitBtn ? submitBtn.innerHTML : '';

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...';
    }

    try {
        const res = await fetch('api/forkliftManage.php', { method: 'POST', body: formData });
        const json = await res.json();

        if (json.status || json.success) {
            bootstrap.Modal.getInstance(modalEl).hide();
            Swal.fire({ icon: 'success', title: 'จองสำเร็จ!', timer: 1500, showConfirmButton: false });
            fetchMapData(); // โหลดข้อมูลใหม่
            fetchTimelineData();
        } else {
            Swal.fire('แจ้งเตือน', json.message, 'warning');
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'System Error: เชื่อมต่อ Server ไม่ได้', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}

// ========================================================
// 📊 Dashboard KPIs & Modals
// ========================================================
function populateSimDropdown() {
    const simSelect = document.getElementById('sim-forklift-select');
    if (!simSelect) return;
    simSelect.innerHTML = '<option value="">-- เลือกรถที่ต้องการจำลอง --</option>';
    globalForkliftData.forEach(fl => {
        simSelect.innerHTML += `<option value="${fl.code}">${fl.code} - ${fl.name}</option>`;
    });
    simSelect.disabled = false;
}

function updateKPIs(data) {
    let total = data.length;
    let avail = 0, inUse = 0, maint = 0;

    data.forEach(fl => {
        if (fl.status === 'MAINTENANCE') maint++;
        else if (fl.status === 'IN_USE') inUse++;
        else avail++;
    });

    if (document.getElementById('kpi-total')) document.getElementById('kpi-total').innerText = total;
    if (document.getElementById('kpi-avail')) document.getElementById('kpi-avail').innerText = avail;
    if (document.getElementById('kpi-use')) document.getElementById('kpi-use').innerText = inUse;
    if (document.getElementById('kpi-maint')) document.getElementById('kpi-maint').innerText = maint;
}

async function openHistoryModal() {
    try {
        const fd = new FormData(); fd.append('action', 'get_history');
        const res = await fetch('api/forkliftManage.php', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.success || json.status) {
            let tbody = '';
            json.data.forEach(h => {
                const st = h.start_time ? h.start_time.substring(0, 16) : '-';
                const et = (h.status === 'COMPLETED' && h.end_time_actual) ? h.end_time_actual.substring(11, 16) : (h.end_time_est ? h.end_time_est.substring(11, 16) + ' (Est)' : '-');

                let statusBadge = '';
                if (h.status === 'ACTIVE') statusBadge = '<span class="badge bg-primary">ใช้งานอยู่</span>';
                else if (h.status === 'BOOKED') statusBadge = '<span class="badge bg-warning text-dark">จองล่วงหน้า</span>';
                else statusBadge = '<span class="badge bg-secondary">คืนแล้ว</span>';

                tbody += `<tr>
                    <td class="ps-3">${st}</td>
                    <td class="fw-bold">${h.forklift_code}</td>
                    <td>${h.user_name}</td>
                    <td>
                        <div class="text-truncate" style="max-width: 150px;" title="${h.usage_details || '-'}">${h.usage_details || '-'}</div>
                    </td>
                    <td>${st.substring(11, 16)} - ${et}</td>
                    <td class="text-center">${statusBadge}</td>
                    <td class="text-center text-muted">${h.start_battery || '-'}%</td>
                    <td class="text-center fw-bold">${h.end_battery || '-'}%</td>
                </tr>`;
            });

            document.querySelector('#historyTableBody').innerHTML = tbody;
            bootstrap.Modal.getOrCreateInstance(document.getElementById('historyModal')).show();
        }
    } catch (e) { console.error(e); }
}

function openManageModal() {
    let tbody = '';
    globalForkliftData.forEach(fl => {
        let stClass = fl.status === 'AVAILABLE' ? 'text-success' : (fl.status === 'MAINTENANCE' ? 'text-secondary' : 'text-primary');

        tbody += `<tr>
            <td class="ps-4 fw-bold">${fl.code}</td>
            <td>${fl.name}</td>
            <td class="${stClass} fw-bold">${fl.status}</td>
            <td>${fl.last_location || '-'}</td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-outline-dark me-1" onclick="generateQRCode('${fl.code}')" title="สร้าง QR Code">
                    <i class="fas fa-qrcode"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary" onclick="editForklift(${fl.id}, '${fl.code}', '${fl.name}', '${fl.status}', '${fl.last_location || ''}')" title="แก้ไข">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>`;
    });

    document.getElementById('manageTableBody').innerHTML = tbody;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('manageModal')).show();
}

function generateQRCode(code) {
    const host = window.location.origin;
    const mobileUrl = `${host}/MES/page/forklift/scan.php?code=${encodeURIComponent(code)}`;

    Swal.fire({
        title: `<h5 class="fw-bold mb-0">QR Code ประจำรถ: <span class="text-primary">${code}</span></h5>`,
        html: `
            <div class="text-center mt-3">
                <div id="qrcode-container" class="d-inline-block p-2 bg-white border rounded-3 shadow-sm mb-3"></div>
                <div class="bg-light p-2 rounded border small text-break user-select-all" style="font-family: monospace;">
                    ${mobileUrl}
                </div>
                <button class="btn btn-sm btn-dark mt-3 w-100 fw-bold" onclick="copyToClipboard('${mobileUrl}')">
                    <i class="fas fa-copy me-2"></i> คัดลอก URL
                </button>
            </div>
        `,
        didOpen: () => {
            const qrContainer = document.getElementById("qrcode-container");
            if (qrContainer) {
                qrContainer.innerHTML = "";
                new QRCode(qrContainer, {
                    text: mobileUrl,
                    width: 250,
                    height: 250,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            }
        },
        showConfirmButton: true,
        confirmButtonText: 'ปิด (Close)',
        confirmButtonColor: '#6c757d'
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        Swal.fire({
            toast: true, position: 'top-end', icon: 'success',
            title: 'คัดลอก URL แล้ว!', showConfirmButton: false, timer: 1500
        });
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}

// ========================================================
// 🔄 Action Checks (Start, Return, Force Return)
// ========================================================

async function checkAction(forkliftId, code, name) {
    const flData = globalForkliftData.find(f => f.id == forkliftId);
    if (flData && flData.status === 'MAINTENANCE') {
        Swal.fire('แจ้งเตือน', 'รถคันนี้งดให้บริการ (Maintenance)', 'warning');
        return;
    }

    const safeName = flData ? flData.name : (name || 'Forklift');
    const safeCode = flData ? flData.code : (code || '-');
    const currentBatt = flData ? flData.current_battery : 100;

    // 1. คืนรถ (เราขับเอง)
    if (flData.status === 'IN_USE' && flData.current_driver === safeUserName) {
        openReturnModal(flData.active_booking_id, flData.id, safeCode, currentBatt);
        return;
    }

    // 2. คนอื่นใช้
    if (flData.status === 'IN_USE') {
        if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN) {
            if (confirm(`⚠️ Admin Action: รถคันนี้ใช้งานโดย "${flData.current_driver}"\nคุณต้องการบังคับคืนรถ (Force Return) ใช่หรือไม่?`)) {
                openReturnModal(flData.active_booking_id, flData.id, safeCode, currentBatt);
            }
            return;
        }
        Swal.fire('ไม่สามารถใช้งานได้', `รถคันนี้กำลังถูกใช้งานโดย: ${flData.current_driver}`, 'warning');
        return;
    }

    // 3. เริ่มงานที่จองไว้
    const myBooking = typeof globalBookings !== 'undefined' ? globalBookings.find(b =>
        b.forklift_id == forkliftId &&
        b.user_name === safeUserName &&
        b.status === 'BOOKED'
    ) : null;

    if (myBooking) {
        openStartJobModal(myBooking.booking_id, forkliftId, safeName, myBooking.usage_details, currentBatt);
    } else {
        openStartJobModal(null, forkliftId, safeName, '', currentBatt);
    }
}

function syncBatteryInput(prefix, val) {
    const range = document.getElementById(prefix + '_battery_range');
    const input = document.getElementById(prefix + '_battery_input');
    if (range) range.value = val;
    if (input) input.value = val;
}

function openStartJobModal(bookingId, forkliftId, name, details, currentBatt) {
    document.getElementById('startJobForm').reset();
    document.getElementById('start_booking_id').value = bookingId || '';
    document.getElementById('start_forklift_id').value = forkliftId;
    document.getElementById('start_usage_details').value = details || '';
    if (document.getElementById('start_forklift_name')) document.getElementById('start_forklift_name').innerText = name;

    const batt = currentBatt || 100;
    syncBatteryInput('start', batt);

    bootstrap.Modal.getOrCreateInstance(document.getElementById('startJobModal')).show();
}

async function submitStartJob() {
    const form = document.getElementById('startJobForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const formData = new FormData(form);
    const bookingId = document.getElementById('start_booking_id').value;

    if (bookingId) {
        formData.append('action', 'start_job');
    } else {
        formData.append('action', 'book_forklift');
        formData.append('booking_type', 'INSTANT');
        const now = new Date();
        const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
        const toLocalISO = (date) => {
            const offset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() - offset).toISOString().slice(0, 16);
        };
        formData.append('start_time', toLocalISO(now));
        formData.append('end_time_est', toLocalISO(nextHour));
    }

    const modalEl = document.querySelector('#startJobModal');
    const submitBtn = modalEl.querySelector('.modal-footer .btn-primary');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...'; }

    try {
        const res = await fetch('api/forkliftManage.php', { method: 'POST', body: formData });
        const json = await res.json();
        if (json.status || json.success) {
            bootstrap.Modal.getInstance(modalEl).hide();
            Swal.fire({ icon: 'success', title: 'เริ่มงานแล้ว!', timer: 1500, showConfirmButton: false });
            fetchMapData();
        } else {
            Swal.fire('แจ้งเตือน', json.message, 'warning');
        }
    } catch (e) { console.error(e); Swal.fire('Error', 'System Error', 'error'); }
    finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; } }
}

function openReturnModal(bookingId, forkliftId, code, currentBatt) {
    document.getElementById('returnForm').reset();
    document.getElementById('return_booking_id').value = bookingId;
    document.getElementById('return_forklift_id').value = forkliftId;
    if (document.getElementById('return_forklift_name')) document.getElementById('return_forklift_name').innerText = code;

    const batt = currentBatt || 100;
    syncBatteryInput('return', batt);

    bootstrap.Modal.getOrCreateInstance(document.getElementById('returnModal')).show();
}

async function submitReturn() {
    const form = document.getElementById('returnForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const formData = new FormData(form);
    formData.append('action', 'return_forklift');

    const modalEl = document.querySelector('#returnModal');
    const submitBtn = modalEl.querySelector('.modal-footer .btn-danger');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...'; }

    try {
        const res = await fetch('api/forkliftManage.php', { method: 'POST', body: formData });
        const json = await res.json();
        if (json.status || json.success) {
            bootstrap.Modal.getInstance(modalEl).hide();
            Swal.fire({ icon: 'success', title: 'คืนรถเรียบร้อย!', timer: 1500, showConfirmButton: false });
            fetchMapData();
        } else {
            Swal.fire('แจ้งเตือน', json.message, 'warning');
        }
    } catch (e) { console.error(e); Swal.fire('Error', 'System Error', 'error'); }
    finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; } }
}


function editForklift(id, code, name, status, loc) {
    document.getElementById('manage_action').value = 'update_forklift';
    document.getElementById('manage_id').value = id;
    document.getElementById('manage_code').value = code;
    document.getElementById('manage_name').value = name;
    document.getElementById('manage_status').value = status;
    document.getElementById('manage_location').value = loc;
    document.getElementById('btn-cancel-edit').style.display = 'inline-block';
}

function resetManageForm() {
    document.getElementById('manageForkliftForm').reset();
    document.getElementById('manage_action').value = 'add_forklift';
    document.getElementById('manage_id').value = '';
    document.getElementById('btn-cancel-edit').style.display = 'none';
}

async function saveForklift() {
    const form = document.getElementById('manageForkliftForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const formData = new FormData(form);
    try {
        const res = await fetch('api/forkliftManage.php', { method: 'POST', body: formData });
        const json = await res.json();
        if (json.status || json.success) {
            resetManageForm();
            openManageModal();
            fetchMapData();
        } else {
            alert(json.message);
        }
    } catch (e) { console.error(e); }
}