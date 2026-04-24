let map;
let gridLayerGroup;
let heatmapLayer = null;
let forkliftMarkers = {};
let mappedZones = [];

let globalForkliftData = [];
let globalBookings = [];
let dashboardInterval;
let isFirstLoad = true;
let isGridVisible = true;

const GRID_COLS = 40; 
const GRID_ROWS = 30; 
let currentFilter = 'ALL';
let followedForklift = null;
let snailTrailLayer = null;
let showingTrailFor = null;
let utilizationChartObj = null;

const FACTORY_BOUNDS = [
    [12.889578, 101.088351], 
    [12.883121, 101.096783]  
];

let playbackData = [];
let playbackIndex = 0;
let playbackTimer = null;
let isPlaying = false;
let playbackMarker = null;

window.addEventListener('pageshow', (event) => {
    if (event.persisted) { loadAllData(); startPolling(); }
});

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    fetchMappedZones();
    loadAllData();
    startPolling();

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopPolling();
        else { loadAllData(); startPolling(); }
    });
});

function startPolling() {
    if (dashboardInterval) clearInterval(dashboardInterval);
    dashboardInterval = setInterval(loadAllData, 5000); 
}
function stopPolling() {
    if (dashboardInterval) { clearInterval(dashboardInterval); dashboardInterval = null; }
}

async function loadAllData() {
    try {
        const formData = new FormData();
        formData.append('action', 'get_dashboard');
        
        const res = await fetch('api/forkliftManage.php', { method: 'POST', body: formData });
        const json = await res.json();

        if (json.success) {
            globalForkliftData = json.data;
            updateKPIs(globalForkliftData);
            
            const fdTime = new FormData();
            fdTime.append('action', 'get_timeline');
            const resTime = await fetch('api/forkliftManage.php', { method: 'POST', body: fdTime });
            const jsonTime = await resTime.json();
            
            if(jsonTime.success) {
                globalBookings = jsonTime.data;
                renderTimelineChart(globalForkliftData, globalBookings);
            }

            renderList(globalForkliftData); 
            renderMapMarkers(globalForkliftData);
            loadAlerts();
            
            const timeEl = document.getElementById('last-update-time');
            if(timeEl) timeEl.innerText = new Date().toLocaleTimeString('th-TH');

            isFirstLoad = false;
        } else if (isFirstLoad) {
            const grid = document.getElementById('forklift-list');
            if(grid) grid.innerHTML = `<li class="list-group-item text-center text-danger py-4"><i class="fas fa-exclamation-triangle fa-2x mb-2"></i><br>${json.message}</li>`;
        }
    } catch (e) { 
        console.error('Data Fetch Error:', e);
    }
}

function updateKPIs(data) {
    let total = data.length;
    let avail = 0, inUse = 0, maint = 0;
    
    data.forEach(fl => {
        if (fl.status === 'MAINTENANCE') maint++;
        else if (fl.status === 'IN_USE') inUse++;
        else avail++; 
    });

    if(document.getElementById('kpi-total')) document.getElementById('kpi-total').innerText = total;
    if(document.getElementById('kpi-avail')) document.getElementById('kpi-avail').innerText = avail;
    if(document.getElementById('kpi-use')) document.getElementById('kpi-use').innerText = inUse;
    if(document.getElementById('kpi-maint')) document.getElementById('kpi-maint').innerText = maint;
}

async function callApi(formData, modalId, successMsg, btnElement) {
    let originalText = '';
    if(btnElement) {
        originalText = btnElement.innerHTML;
        btnElement.disabled = true;
        btnElement.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    }

    try {
        const res = await fetch('api/forkliftManage.php', { method: 'POST', body: formData });
        const json = await res.json();
        
        if (json.success) {
            if(modalId) {
                const modalInstance = bootstrap.Modal.getInstance(document.querySelector(modalId));
                if(modalInstance) modalInstance.hide();
            }
            loadAllData();
            if(successMsg) Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: successMsg, showConfirmButton: false, timer: 2000 });
        } else {
            Swal.fire({ icon: 'warning', title: 'แจ้งเตือน', text: json.message });
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'System Error', text: 'ไม่สามารถเชื่อมต่อ Server ได้' });
    } finally {
        if(btnElement) {
            btnElement.disabled = false;
            btnElement.innerHTML = originalText;
        }
    }
}

function initMap() {
    const container = document.getElementById('map-container');
    if(!container) return;
    
    map = L.map('map-container', { zoomControl: false }).fitBounds(FACTORY_BOUNDS);
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { 
        maxZoom: 22, 
        attribution: '© Google' 
    }).addTo(map);
    
    gridLayerGroup = L.layerGroup().addTo(map);

    setTimeout(() => {
        map.invalidateSize();
        map.fitBounds(FACTORY_BOUNDS); 
    }, 300);
}

function fetchMappedZones() {
    fetch('api/webTracking.php?action=get_zones')
        .then(res => res.json())
        .then(data => { 
            if(data.success) {
                mappedZones = data.data; 
                if(isGridVisible) drawLeafletGrid();
            }
        })
        .catch(err => console.error("Error fetching mapped zones:", err));
}

function drawLeafletGrid() {
    gridLayerGroup.clearLayers();
    const latTop = FACTORY_BOUNDS[0][0]; const lngLeft = FACTORY_BOUNDS[0][1];
    const latBottom = FACTORY_BOUNDS[1][0]; const lngRight = FACTORY_BOUNDS[1][1];
    const latStep = (latTop - latBottom) / GRID_ROWS; const lngStep = (lngRight - lngLeft) / GRID_COLS;

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const cellTop = latTop - (r * latStep); const cellBottom = latTop - ((r + 1) * latStep);
            const cellLeft = lngLeft + (c * lngStep); const cellRight = lngLeft + ((c + 1) * lngStep);
            const bounds = [[cellTop, cellLeft], [cellBottom, cellRight]];
            const gridName = `${getColumnLetter(c)}${r + 1}`;
            const fullZoneName = `Zone ${gridName}`;

            const isMapped = mappedZones.some(z => z.zone_name === fullZoneName);
            const rect = L.rectangle(bounds, { color: 'rgba(0,0,0,0.3)', weight: 1, fillColor: isMapped?'#198754':'transparent', fillOpacity: isMapped?0.4:0 });
            rect.on('click', function() { openZoneModal(c, r, fullZoneName); });
            rect.addTo(gridLayerGroup);

            const labelIcon = L.divIcon({ className: 'custom-grid-label', html: `<div style="color: rgba(0,0,0,0.4); font-size: 10px; font-weight: bold; text-align: center;">${gridName}</div>`, iconSize: [30, 15], iconAnchor: [15, 7] });
            L.marker([cellTop - (latStep / 2), cellLeft + (lngStep / 2)], {icon: labelIcon, interactive: false}).addTo(gridLayerGroup);
        }
    }
}

function toggleGrid() {
    isGridVisible = !isGridVisible;
    if (isGridVisible) { map.addLayer(gridLayerGroup); drawLeafletGrid(); } else { map.removeLayer(gridLayerGroup); }
}

function getColumnLetter(colIndex) {
    let letter = '';
    while (colIndex >= 0) { letter = String.fromCharCode((colIndex % 26) + 65) + letter; colIndex = Math.floor(colIndex / 26) - 1; }
    return letter;
}

function renderMapMarkers(data) {
    if(!map) return;
    data.forEach(fl => {
        let lat = null, lng = null;
        if (fl.location_type === 'OUTDOOR' && fl.lat && fl.lng && fl.lat != 0) { lat = parseFloat(fl.lat); lng = parseFloat(fl.lng); } 
        else if (fl.location_type === 'INDOOR' && fl.indoor_x !== null && fl.indoor_y !== null) {
            const latDiff = FACTORY_BOUNDS[0][0] - FACTORY_BOUNDS[1][0]; const lngDiff = FACTORY_BOUNDS[1][1] - FACTORY_BOUNDS[0][1]; 
            lat = FACTORY_BOUNDS[0][0] - ((fl.indoor_y / 1000) * latDiff); lng = FACTORY_BOUNDS[0][1] + ((fl.indoor_x / 1000) * lngDiff);
        }
        if (lat === null || lng === null) return;

        let bgColor = '#fd7e14'; 
        if ((new Date() - new Date(fl.last_updated)) > 180000) bgColor = '#6c757d'; 
        else if (fl.current_battery <= 20) bgColor = '#dc3545'; 

        const customIcon = L.divIcon({
            className: 'custom-leaflet-icon',
            html: `<div class="forklift-marker-wrapper" style="background-color: ${bgColor};"><i class="fas fa-truck-loading text-white"></i></div><div class="marker-label-floating">${fl.code}</div>`,
            iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
        });

        const popupContent = `<div class="text-center"><b>${fl.code}</b><br><small class="text-muted">${fl.name}</small><br><span class="badge bg-dark mt-1">Bat: ${fl.current_battery||0}%</span></div>`;

        if (forkliftMarkers[fl.code]) {
            forkliftMarkers[fl.code].setLatLng([lat, lng]);
            forkliftMarkers[fl.code].setIcon(customIcon);
            forkliftMarkers[fl.code].getPopup().setContent(popupContent);
        } else {
            forkliftMarkers[fl.code] = L.marker([lat, lng], { icon: customIcon }).addTo(map).bindPopup(popupContent);
        }

        if (followedForklift === fl.code) map.panTo([lat, lng], { animate: true, duration: 1.0 });
    });
}

function flyToForklift(code) {
    if (forkliftMarkers[code]) {
        map.flyTo(forkliftMarkers[code].getLatLng(), 20, { animate: true, duration: 1.5 });
        setTimeout(() => { forkliftMarkers[code].openPopup(); }, 1500); 
    } else {
        Swal.fire({ icon: 'warning', title: 'พิกัดไม่พร้อม', text: 'ระบบยังไม่ได้รับพิกัดล่าสุดของรถคันนี้', timer: 2000, showConfirmButton: false });
    }
}

function renderList(data) {
    const list = document.getElementById('forklift-list');
    if(!list) return;
    let html = '';

    data.forEach(fl => {
        const isOffline = (new Date() - new Date(fl.last_updated)) > 180000;
        const statusIcon = isOffline ? '<i class="fas fa-wifi text-secondary" title="Offline"></i>' : '<i class="fas fa-wifi text-success" title="Online"></i>';
        
        let stateText = 'ว่าง (Available)'; let stateClass = 'bg-success';
        if (fl.status === 'MAINTENANCE') { stateText = 'ซ่อมบำรุง'; stateClass = 'bg-secondary'; }
        else if (fl.status === 'IN_USE') { stateText = 'กำลังใช้งาน'; stateClass = 'bg-primary'; }
        else if (fl.status === 'CHARGING') { stateText = 'กำลังชาร์จ'; stateClass = 'bg-warning text-dark'; }

        let batIcon = 'fa-battery-full text-success';
        if(fl.current_battery < 20) batIcon = 'fa-battery-empty text-danger';
        else if(fl.current_battery < 50) batIcon = 'fa-battery-half text-warning';

        const isFollowing = (followedForklift === fl.code);
        const isShowingTrail = (showingTrailFor === fl.code); 
        const followBtnClass = isFollowing ? 'btn-danger' : 'btn-light';
        const trailBtnClass = isShowingTrail ? 'btn-info text-white' : 'btn-light';

        const myPendingBooking = globalBookings.find(b => b.forklift_id == fl.id && b.user_name === CURRENT_USER_NAME && b.status === 'BOOKED');
        let actionBtn = '';
        
        if (fl.status === 'MAINTENANCE') {
            actionBtn = `<button class="btn btn-sm btn-light border text-muted w-100" disabled><i class="fas fa-ban me-1"></i> ปิดใช้งาน</button>`;
        } else if (fl.status === 'IN_USE') {
            if (fl.current_driver === CURRENT_USER_NAME || IS_ADMIN) {
                let bClass = (fl.current_driver === CURRENT_USER_NAME) ? 'btn-warning' : 'btn-danger';
                let bText = (fl.current_driver === CURRENT_USER_NAME) ? 'คืนรถ' : 'บังคับคืน';
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
                <div class="text-truncate" title="${fl.current_driver||'-'}"><i class="fas fa-user-circle"></i> ${fl.current_driver||'-'}</div>
                <div class="text-end"><i class="fas ${batIcon}"></i> ${fl.current_battery||0}%</div>
                <div class="text-truncate" style="grid-column: span 2;" title="${fl.last_location||'Unknown'}"><i class="fas fa-map-marker-alt"></i> ${fl.last_location||'Unknown'}</div>
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
    
    list.innerHTML = html;
    filterForkliftList();
}

function filterByStatus(status, btnElement) {
    currentFilter = status;
    let buttons = btnElement.parentElement.children;
    for(let i=0; i<buttons.length; i++) buttons[i].classList.remove('active');
    btnElement.classList.add('active');
    filterForkliftList();
}

function filterForkliftList() {
    let searchInput = document.getElementById('search-forklift');
    if (!searchInput) return; 

    let input = searchInput.value.toLowerCase();
    let listItems = document.querySelectorAll('#forklift-list li');
    
    listItems.forEach(li => {
        if (li.innerText.includes("กำลังโหลดข้อมูล")) return;

        let text = li.innerText.toLowerCase(); 
        let isMatchText = text.includes(input);
        
        let isMatchStatus = true;
        if (currentFilter === 'ONLINE') {
            isMatchStatus = !li.innerHTML.includes('fa-wifi text-secondary'); 
        } else if (currentFilter === 'LOW_BAT') {
            isMatchStatus = li.innerHTML.includes('text-danger'); 
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

function toggleHeatmap() {
    if(heatmapLayer) { map.removeLayer(heatmapLayer); heatmapLayer = null; return; }
    fetch('api/webTracking.php?action=get_heatmap&hours=24')
        .then(res => res.json())
        .then(res => {
            if(res.success && res.data.length > 0) {
                let pts = res.data.map(d => {
                    if(d.lat && d.lng) return [parseFloat(d.lat), parseFloat(d.lng), 1];
                    const latDiff = FACTORY_BOUNDS[0][0] - FACTORY_BOUNDS[1][0]; 
                    const lngDiff = FACTORY_BOUNDS[1][1] - FACTORY_BOUNDS[0][1]; 
                    return [FACTORY_BOUNDS[0][0] - ((d.indoor_y/1000)*latDiff), FACTORY_BOUNDS[0][1] + ((d.indoor_x/1000)*lngDiff), 1];
                });
                heatmapLayer = L.heatLayer(pts, { radius:35, blur:20, maxZoom:18, gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red'} }).addTo(map);
            }
        });
}

function toggleFollow(code, event) {
    if (event) event.stopPropagation(); 
    if (followedForklift === code) { followedForklift = null; } 
    else { followedForklift = code; flyToForklift(code); }
    renderList(globalForkliftData);
}

function toggleSnailTrail(code, event) {
    if (event) event.stopPropagation(); 
    if (showingTrailFor === code) {
        if (snailTrailLayer) map.removeLayer(snailTrailLayer);
        showingTrailFor = null; renderList(globalForkliftData); return;
    }
    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Loading...', showConfirmButton: false, timer: 1000 });
    fetch(`api/webTracking.php?action=get_history&code=${code}&mins=60`)
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data.length > 0) drawTrail(res.data, code);
            else Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'ไม่พบประวัติ', showConfirmButton: false, timer: 2000 });
        });
}

function drawTrail(logs, code) {
    if (snailTrailLayer) map.removeLayer(snailTrailLayer);
    let pathCoordinates = [];
    logs.forEach(log => {
        let lat = null, lng = null;
        if (log.location_type === 'OUTDOOR' && log.lat && log.lng) { lat = parseFloat(log.lat); lng = parseFloat(log.lng); } 
        else if (log.location_type === 'INDOOR' && log.indoor_x !== null && log.indoor_y !== null) {
            const latDiff = FACTORY_BOUNDS[0][0] - FACTORY_BOUNDS[1][0]; const lngDiff = FACTORY_BOUNDS[1][1] - FACTORY_BOUNDS[0][1]; 
            lat = FACTORY_BOUNDS[0][0] - ((log.indoor_y / 1000) * latDiff); lng = FACTORY_BOUNDS[0][1] + ((log.indoor_x / 1000) * lngDiff);
        }
        if (lat !== null && lng !== null) pathCoordinates.push([lat, lng]);
    });
    if (pathCoordinates.length < 2) return;
    snailTrailLayer = L.polyline(pathCoordinates, { color: '#0d6efd', weight: 4, opacity: 0.7, dashArray: '10, 10', lineJoin: 'round' }).addTo(map);
    showingTrailFor = code;
    map.fitBounds(snailTrailLayer.getBounds(), { padding: [50, 50], animate: true });
    renderList(globalForkliftData);
}

function initPlayback(code, event) {
    if (event) event.stopPropagation();
    fetch(`api/webTracking.php?action=get_history&code=${code}&mins=60`)
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data.length > 0) setupPlaybackUI(res.data, code);
            else Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'ไม่พอจำลอง', showConfirmButton: false, timer: 2000 });
        });
}

function setupPlaybackUI(logs, code) {
    playbackData = logs.map(log => {
        let lat = null, lng = null;
        if (log.location_type === 'OUTDOOR' && log.lat && log.lng) { lat = parseFloat(log.lat); lng = parseFloat(log.lng); } 
        else if (log.location_type === 'INDOOR' && log.indoor_x !== null && log.indoor_y !== null) {
            const latDiff = FACTORY_BOUNDS[0][0] - FACTORY_BOUNDS[1][0]; const lngDiff = FACTORY_BOUNDS[1][1] - FACTORY_BOUNDS[0][1]; 
            lat = FACTORY_BOUNDS[0][0] - ((log.indoor_y / 1000) * latDiff); lng = FACTORY_BOUNDS[0][1] + ((log.indoor_x / 1000) * lngDiff);
        }
        return { lat, lng, time: log.recorded_at, loc: log.last_location };
    }).filter(p => p.lat !== null && p.lng !== null);

    if (playbackData.length < 2) return;

    let controls = document.getElementById('playback-controls');
    controls.classList.remove('d-none');
    controls.innerHTML = `
        <div class="card-body p-2">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-bold text-primary" id="playback-title">Playback: ${code}</span>
                <button class="btn-close" onclick="closePlayback()"></button>
            </div>
            <div class="d-flex align-items-center gap-2 mb-2">
                <button class="btn btn-primary btn-sm rounded-circle" style="width: 32px; height: 32px;" onclick="togglePlayback()"><i id="icon-play" class="fas fa-play"></i></button>
                <input type="range" class="form-range flex-grow-1" id="playback-slider" min="0" max="${playbackData.length - 1}" value="0" oninput="seekPlayback()">
            </div>
            <div class="text-center small text-muted fw-bold" id="playback-time">-</div>
        </div>
    `;
    playbackIndex = 0;
    drawTrail(logs, code);

    if (playbackMarker) map.removeLayer(playbackMarker);
    const ghostIcon = L.divIcon({ className: 'custom-leaflet-icon', html: `<div class="forklift-marker-wrapper" style="background-color: #6f42c1; box-shadow: 0 0 15px #6f42c1;"><i class="fas fa-ghost text-white"></i></div>`, iconSize: [32, 32], iconAnchor: [16, 16] });
    playbackMarker = L.marker([playbackData[0].lat, playbackData[0].lng], { icon: ghostIcon, zIndexOffset: 1000 }).addTo(map);
    updatePlaybackStatus();
}

function togglePlayback() {
    if (isPlaying) pausePlayback(); else playPlayback();
}
function playPlayback() {
    if (playbackIndex >= playbackData.length - 1) playbackIndex = 0; 
    isPlaying = true; document.getElementById('icon-play').className = 'fas fa-pause';
    playbackTimer = setInterval(() => {
        playbackIndex++;
        if (playbackIndex >= playbackData.length) { pausePlayback(); return; }
        document.getElementById('playback-slider').value = playbackIndex;
        updatePlaybackStatus();
    }, 1000); 
}
function pausePlayback() {
    isPlaying = false; if(document.getElementById('icon-play')) document.getElementById('icon-play').className = 'fas fa-play'; clearInterval(playbackTimer);
}
function seekPlayback() { playbackIndex = parseInt(document.getElementById('playback-slider').value); updatePlaybackStatus(); }
function updatePlaybackStatus() {
    const point = playbackData[playbackIndex];
    if (!point) return;
    playbackMarker.setLatLng([point.lat, point.lng]);
    map.panTo([point.lat, point.lng], { animate: true, duration: 0.5 }); 
    document.getElementById('playback-time').innerText = `🕒 ${point.time.substring(11,19)} | 📍 ${point.loc || '-'}`;
}
function closePlayback() {
    pausePlayback(); document.getElementById('playback-controls').classList.add('d-none');
    if (playbackMarker) { map.removeLayer(playbackMarker); playbackMarker = null; }
    if (snailTrailLayer) map.removeLayer(snailTrailLayer); 
}

function resetMapView() { map.flyTo([12.886349, 101.092567], 16, { animate: true, duration: 1.0 }); }

async function checkAction(id) {
    const fl = globalForkliftData.find(f => f.id == id);
    if (!fl || fl.status === 'MAINTENANCE') return;

    if (fl.status === 'IN_USE') {
        if (fl.current_driver === CURRENT_USER_NAME) openReturnModal(fl.active_booking_id, fl.id, fl.code, fl.current_battery);
        else if (IS_ADMIN && confirm(`Admin Force Return? (ผู้ใช้: ${fl.current_driver})`)) openReturnModal(fl.active_booking_id, fl.id, fl.code, fl.current_battery);
        else Swal.fire('ไม่สามารถใช้งานได้', `รถกำลังถูกขับโดย: ${fl.current_driver}`, 'warning');
        return; 
    }
    const myBk = globalBookings.find(b => b.forklift_id == id && b.user_name === CURRENT_USER_NAME && b.status === 'BOOKED');
    openStartJobModal(myBk ? myBk.booking_id : null, fl.id, fl.name, myBk ? myBk.usage_details : '', fl.current_battery);
}

function openBookingModal(id, code, name) {
    document.getElementById('bookingForm').reset();
    document.getElementById('book_forklift_id').value = id;
    document.getElementById('book_forklift_name').innerText = `${code} - ${name}`;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('bookingModal')).show();
}

function openStartJobModal(bkId, flId, name, details, bat) {
    document.getElementById('startJobForm').reset();
    document.getElementById('start_booking_id').value = bkId || '';
    document.getElementById('start_forklift_id').value = flId;
    document.getElementById('start_forklift_name').innerText = name;
    document.getElementById('start_usage_details').value = details || '';
    if(document.getElementById('start_battery_range')) document.getElementById('start_battery_range').value = bat||100;
    if(document.getElementById('start_battery_input')) document.getElementById('start_battery_input').value = bat||100;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('startJobModal')).show();
}

function openReturnModal(bkId, flId, code, bat) {
    document.getElementById('returnForm').reset();
    document.getElementById('return_booking_id').value = bkId;
    document.getElementById('return_forklift_id').value = flId;
    document.getElementById('return_forklift_name').innerText = code;
    if(document.getElementById('return_battery_range')) document.getElementById('return_battery_range').value = bat||100;
    if(document.getElementById('return_battery_input')) document.getElementById('return_battery_input').value = bat||100;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('returnModal')).show();
}

function openZoneModal(colIndex, rowIndex, fullZoneName) {
    if(typeof IS_ADMIN !== 'undefined' && !IS_ADMIN) return;
    const dbX = Math.round(((colIndex + 0.5) / GRID_COLS) * 1000); const dbY = Math.round(((rowIndex + 0.5) / GRID_ROWS) * 1000);
    document.getElementById('zone_svg_x').value = dbX; document.getElementById('zone_svg_y').value = dbY; document.getElementById('zone_name').value = fullZoneName;
    let existingZone = mappedZones.find(z => z.zone_name === fullZoneName);
    if (existingZone) {
        document.getElementById('zone_bssid_1').value = existingZone.bssid_1 || ''; document.getElementById('zone_rssi_1').value  = existingZone.rssi_1 || '';
        document.getElementById('zone_bssid_2').value = existingZone.bssid_2 || ''; document.getElementById('zone_rssi_2').value  = existingZone.rssi_2 || '';
        document.getElementById('zone_bssid_3').value = existingZone.bssid_3 || ''; document.getElementById('zone_rssi_3').value  = existingZone.rssi_3 || '';
    } else {
        document.getElementById('zone_bssid_1').value = ''; document.getElementById('zone_rssi_1').value  = '';
        document.getElementById('zone_bssid_2').value = ''; document.getElementById('zone_rssi_2').value  = '';
        document.getElementById('zone_bssid_3').value = ''; document.getElementById('zone_rssi_3').value  = '';
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('apZoneModal')).show();
}

async function openHistoryModal() {
    try {
        const fd = new FormData(); fd.append('action', 'get_history');
        const res = await fetch('api/forkliftManage.php', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.success) {
            let tbody = '';
            json.data.forEach(h => {
                const st = h.start_time ? h.start_time.substring(0, 16) : '-';
                const et = (h.status === 'COMPLETED' && h.end_time_actual) ? h.end_time_actual.substring(11, 16) : h.end_time_est.substring(11, 16) + ' (Est)';
                
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
                    <td>${st.substring(11,16)} - ${et}</td>
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
        tbody += `<tr><td class="ps-3 fw-bold">${fl.code}</td><td>${fl.name}</td><td class="${stClass} fw-bold">${fl.status}</td><td>${fl.last_location || '-'}</td><td class="text-end pe-3"><button class="btn btn-sm btn-outline-primary" onclick="editForklift(${fl.id}, '${fl.code}', '${fl.name}', '${fl.status}', '${fl.last_location||''}')"><i class="fas fa-edit"></i> Edit</button></td></tr>`;
    });
    document.getElementById('manageTableBody').innerHTML = tbody;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('manageModal')).show();
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

function syncBatteryInput(prefix, val) {
    if(document.getElementById(prefix + '_battery_range')) document.getElementById(prefix + '_battery_range').value = val;
    if(document.getElementById(prefix + '_battery_input')) document.getElementById(prefix + '_battery_input').value = val;
}

function submitBooking(btn) {
    const form = document.getElementById('bookingForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form); fd.append('action', 'book_forklift');
    callApi(fd, '#bookingModal', 'จองรถสำเร็จ', btn);
}

function submitStartJob(btn) {
    const form = document.getElementById('startJobForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form);
    if (fd.get('booking_id')) { fd.append('action', 'start_job'); }
    else {
        fd.append('action', 'book_forklift'); fd.append('booking_type', 'INSTANT');
        const now = new Date(); const toLocalISO = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        fd.append('start_time', toLocalISO(now)); fd.append('end_time_est', toLocalISO(new Date(now.getTime() + 3600000)));
    }
    callApi(fd, '#startJobModal', 'เริ่มงานเรียบร้อย!', btn);
}

function submitReturn(btn) {
    const form = document.getElementById('returnForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form); fd.append('action', 'return_forklift');
    callApi(fd, '#returnModal', 'คืนรถเรียบร้อย!', btn);
}

function saveForklift(btn) {
    const form = document.getElementById('manageForkliftForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form);
    callApi(fd, null, 'บันทึกข้อมูลรถเรียบร้อย', btn).then(() => { resetManageForm(); openManageModal(); });
}

function saveApZone(btn) {
    const form = document.getElementById('apZoneForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form); fd.append('action', 'save_zone');
    callApi(fd, '#apZoneModal', 'Saved!', btn).then(() => { fetchMappedZones(); });
}

function filterHistoryTable() {
    let input = document.getElementById("searchHistory").value.toLowerCase();
    let rows = document.querySelectorAll("#historyTableBody tr");

    rows.forEach(row => {
        let text = row.innerText.toLowerCase();
        row.style.display = text.includes(input) ? "" : "none";
    });
}

async function loadAlerts() {
    try {
        const fd = new FormData();
        fd.append('action', 'get_alerts');
        const res = await fetch('api/forkliftManage.php', { method: 'POST', body: fd });
        const json = await res.json();
        
        if (json.success) {
            const alerts = json.data;
            const fab = document.getElementById('fab-alert');
            const countBadge = document.getElementById('fab-alert-count');
            const listBody = document.getElementById('alertsListBody');

            if (!fab || !countBadge || !listBody) return; 

            if (alerts.length > 0) {
                fab.classList.remove('d-none');
                countBadge.innerText = alerts.length;
                
                const hasCritical = alerts.some(a => a.alert_level === 'CRITICAL');
                if (hasCritical) fab.classList.add('animate__animated', 'animate__headShake', 'animate__infinite');
                else fab.classList.remove('animate__animated', 'animate__headShake', 'animate__infinite');

                let html = '';
                alerts.forEach(a => {
                    const icon = a.alert_type === 'LOW_BATTERY' ? '<i class="fas fa-battery-quarter text-danger fa-2x"></i>' : '<i class="fas fa-parking text-warning fa-2x"></i>';
                    const timeStr = a.created_at.substring(11, 16);
                    html += `
                    <li class="list-group-item d-flex align-items-center p-3 hover-bg">
                        <div class="me-3">${icon}</div>
                        <div class="flex-grow-1">
                            <h6 class="mb-1 fw-bold">${a.forklift_code} <span class="badge bg-${a.alert_level === 'CRITICAL' ? 'danger' : 'warning text-dark'} ms-2">${a.alert_level}</span></h6>
                            <p class="mb-0 text-muted small">${a.message}</p>
                            <small class="text-secondary"><i class="far fa-clock"></i> ตรวจพบเมื่อ: ${timeStr}</small>
                        </div>
                    </li>`;
                });
                listBody.innerHTML = html;
            } else {
                fab.classList.add('d-none');
                listBody.innerHTML = `<li class="list-group-item text-center text-success py-5"><i class="fas fa-check-circle fa-3x mb-3"></i><br><b>ไม่มีการแจ้งเตือนผิดปกติ</b><br><small>ระบบทำงานได้อย่างราบรื่น</small></li>`;
            }
        }
    } catch (e) {
        console.error('Failed to load alerts', e);
    }
}

async function openAnalyticsModal() {
    const range = document.getElementById('analytics-time-range')?.value || 1;
    
    try {
        const fd = new FormData();
        fd.append('action', 'get_utilization');
        fd.append('days', range);
        
        const res = await fetch('api/forkliftManage.php', { method: 'POST', body: fd });
        const json = await res.json();
        
        if (json.success) {
            renderUtilizationData(json.data, range);
            renderTimelineChart(globalForkliftData, globalBookings);
            bootstrap.Modal.getOrCreateInstance(document.getElementById('analyticsModal')).show();
        }
    } catch (e) { console.error(e); }
}

function renderUtilizationData(data, days) {
    let tbody = '';
    let runTotal = 0, idleTotal = 0, downTotal = 0;
    const maxMins = days * 1440;

    data.forEach(d => {
        let runMins = parseFloat(d.run_time_minutes);
        let idleMins = maxMins - runMins;
        let util = d.utilization_percent;

        if (d.machine_state === 'DOWN') { downTotal += maxMins; } 
        else { runTotal += runMins; idleTotal += idleMins; }

        tbody += `<tr>
            <td class="text-start ps-3 fw-bold">${d.code}</td>
            <td><span class="badge ${d.machine_state==='READY'?'bg-success':'bg-secondary'}">${d.machine_state}</span></td>
            <td>${(runMins/60).toFixed(1)}</td>
            <td>${(d.machine_state==='DOWN'?'-':(idleMins/60).toFixed(1))}</td>
            <td class="fw-bold text-primary">${util}%</td>
        </tr>`;
    });
    document.getElementById('utilizationTableBody').innerHTML = tbody;

    const avg = ((runTotal / (runTotal + idleTotal)) * 100) || 0;
    document.getElementById('utilization-insight').innerHTML = 
        avg < 40 ? '<span class="text-danger">Low Efficiency</span>' : '<span class="text-success">Good Performance</span>';

    const ctx = document.getElementById('utilizationChart').getContext('2d');
    if (utilizationChartObj) utilizationChartObj.destroy();
    utilizationChartObj = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Run', 'Idle', 'Down'],
            datasets: [{ data: [runTotal, idleTotal, downTotal], backgroundColor: ['#0d6efd', '#e9ecef', '#6c757d'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false } } }
    });
}

function renderTimelineChart(forklifts, bookings) {
    const container = document.getElementById('timeline-chart');
    if(!container) return;
    
    const now = new Date();
    
    // 1. ปรับเวลาตั้งต้นให้เป็น "ต้นชั่วโมง" เสมอ 
    const currentHourStart = new Date(now);
    currentHourStart.setMinutes(0, 0, 0);

    // 2. แกนเวลา: อดีต 21 ชั่วโมง -> อนาคต 3 ชั่วโมง
    const startOfTimeline = new Date(currentHourStart.getTime() - (21 * 60 * 60 * 1000)); 
    const endOfTimeline = new Date(currentHourStart.getTime() + (3 * 60 * 60 * 1000));   
    const totalMs = endOfTimeline.getTime() - startOfTimeline.getTime(); 
    
    // 3. โครงสร้างหลัก บังคับ min-width เพื่อไม่ให้สเกลเพี้ยนเวลาจอเล็ก
    let html = '<div style="min-width: 1000px; position: relative;">';
    
    // --- HEADER (ตัวเลขเวลา) ---
    html += '<div class="d-flex" style="position: sticky; top: 0; background: #f8f9fa; border-bottom: 1px solid #ccc; z-index: 15;">';
    html += '<div style="width: 120px; min-width: 120px; padding: 8px; font-weight: bold; border-right: 1px solid #ccc; position: sticky; left: 0; background: #f8f9fa; z-index: 16;">Forklift</div>';
    
    html += '<div style="flex: 1; position: relative; height: 35px;">';
    for (let i = 0; i <= 24; i++) {
        let slot = new Date(startOfTimeline.getTime() + (i * 60 * 60 * 1000));
        let h = slot.getHours().toString().padStart(2, '0');
        let isNow = (h == now.getHours().toString().padStart(2, '0'));
        let pct = (i / 24) * 100;
        
        let transform = 'translateX(-50%)';
        if (i === 0) transform = 'translateX(0%)';
        if (i === 24) transform = 'translateX(-100%)';

        html += `<div style="position: absolute; left: ${pct}%; bottom: 6px; transform: ${transform}; font-size: 0.75rem; white-space: nowrap;" class="${isNow ? 'text-danger fw-bold' : 'text-muted fw-bold'}">${h}:00</div>`;
        html += `<div style="position: absolute; left: ${pct}%; bottom: 0; height: 5px; width: 1px; background-color: #ccc;"></div>`;
    }
    html += '</div></div>';

    // --- BODY (ส่วนเนื้อหาตาราง) ---
    html += '<div style="position: relative;">';
    
    // วาดเส้น Grid แนวตั้ง (ชั่วโมง)
    html += '<div style="position: absolute; top: 0; bottom: 0; left: 120px; right: 0; pointer-events: none; z-index: 1;">';
    for (let i = 1; i < 24; i++) {
        let pct = (i / 24) * 100;
        html += `<div style="position: absolute; left: ${pct}%; top: 0; bottom: 0; width: 1px; background-color: #f0f0f0;"></div>`;
    }
    html += '</div>';
    
    // เส้นเวลาปัจจุบัน (Red Line)
    let nowPct = ((now.getTime() - startOfTimeline.getTime()) / totalMs) * 100;
    if (nowPct < 0) nowPct = 0; if (nowPct > 100) nowPct = 100; 

    html += `
    <div style="position: absolute; top: 0; bottom: 0; left: calc(120px + (100% - 120px) * ${nowPct} / 100); width: 2px; background-color: #dc3545; z-index: 10; pointer-events: none;" title="เวลาปัจจุบัน: ${now.toLocaleTimeString('th-TH')}">
        <div style="position: absolute; top: 0; left: -4px; width: 10px; height: 10px; background-color: #dc3545; border-radius: 50%; border: 2px solid #fff;"></div>
    </div>`;

    // วาดแถวของรถแต่ละคัน
    forklifts.forEach(fl => {
        html += `
        <div class="d-flex" style="border-bottom: 1px solid #eee; min-height: 45px; position: relative;">
            <div class="text-primary fw-bold" style="width: 120px; min-width: 120px; padding: 10px 8px; font-size: 0.85rem; border-right: 1px solid #ccc; position: sticky; left: 0; background: #fff; z-index: 5; display: flex; align-items: center;" title="${fl.name}">${fl.code}</div>
            <div style="flex: 1; position: relative; z-index: 2;" id="track-${fl.id}"></div>
        </div>`;
    });
    html += '</div></div>'; 
    
    container.innerHTML = html;

    // Helper แปลง Date ให้ปลอดภัย
    const parseDateSafe = (dateStr) => {
        if (!dateStr) return new Date();
        if (dateStr.includes('T')) return new Date(dateStr);
        let p = dateStr.split(/[- :]/);
        if(p.length >= 6) return new Date(p[0], p[1]-1, p[2], p[3], p[4], p[5]);
        return new Date(dateStr);
    };

    // วาดแถบงาน
    bookings.forEach(bk => {
        const track = document.getElementById(`track-${bk.forklift_id}`);
        if (!track) return;
        
        let s = parseDateSafe(bk.start_time).getTime();
        let e;
        let eDateStr = (bk.status === 'COMPLETED' && bk.end_time_actual) ? bk.end_time_actual : bk.end_time_est;
        
        if (bk.status === 'ACTIVE') {
            e = now.getTime(); // ⭐️ รถที่ใช้ปัจจุบันให้หยุดที่เส้นแดง
        } else {
            e = parseDateSafe(eDateStr).getTime();
        }
        
        if (e < startOfTimeline.getTime() || s > endOfTimeline.getTime()) return;
        
        let drawStart = Math.max(s, startOfTimeline.getTime());
        let drawEnd = Math.min(e, endOfTimeline.getTime());
        
        let left = ((drawStart - startOfTimeline.getTime()) / totalMs) * 100;
        let width = ((drawEnd - drawStart) / totalMs) * 100;

        let bgColor = bk.status === 'ACTIVE' ? '#0d6efd' : (bk.status === 'COMPLETED' ? '#6c757d' : '#8b0faa');
        let borderLeft = bk.status === 'ACTIVE' ? '#0a58ca' : (bk.status === 'COMPLETED' ? '#495057' : '#6f0c88');
        let opacity = bk.status === 'ACTIVE' ? '1' : '0.8';

        let title = `[${bk.status}] ${bk.user_name}\n${bk.usage_details || ''}\nเวลา: ${parseDateSafe(bk.start_time).toLocaleTimeString('th-TH')} - ${parseDateSafe(eDateStr).toLocaleTimeString('th-TH')}`;
        
        let barHtml = `
        <div style="position: absolute; top: 6px; height: 32px; left: ${left}%; width: ${width}%; background-color: ${bgColor}; border-left: 3px solid ${borderLeft}; border-radius: 4px; color: #fff; font-size: 0.7rem; font-weight: bold; padding: 0 6px; display: flex; align-items: center; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; opacity: ${opacity}; box-shadow: 0 2px 4px rgba(0,0,0,0.15); cursor: pointer;" title="${title}">
            ${bk.user_name}
        </div>`;
        
        track.insertAdjacentHTML('beforeend', barHtml);
    });
}