# IIoT Map Builder & Dashboard - Roadmap & History

This document outlines the planned future enhancements for the IIoT Map Builder and Live IIoT Monitor within the PE Enterprise module. It also serves as a detailed historical record of completed phases so that future developers or AI agents can quickly understand the system architecture without having to reverse-engineer the codebase.

---

## 🚀 Project History & Completed Phases (ประวัติการพัฒนา)

### Phase 0: Core Foundation & Map Engine (Built by Original Developer) [DONE]
**Goal:** Establish the foundational PE module, Map Builder, and IIoT integration.
- **Interactive 2D Map Builder:** Developed a fully functional map editor using `fabric.js`. Features include background image uploading, drag-and-drop machine node placement, and saving X/Y coordinates to the database.
- **Pan & Zoom Capabilities:** Integrated `panzoom` to allow users to navigate large factory floorplans smoothly.
- **Real-Time IIoT Polling:** Built `iiotAPI.php` and `machineAPI.php` to fetch live telemetry data (OEE, Power, Status, Output) and render it directly onto the `.machine-node` elements on the canvas.
- **Maintenance & Work Orders:** Created robust CRUD modules for Work Orders (`workOrderModule.js`), Downtime tracking (`downtimeModule.js`), and Spare Parts (`sparePartsModule.js`), including calculating MTBF and MTTR.
- **Analytics & Reporting:** Built backend logic to aggregate historical telemetry into actionable insights (e.g. daily power consumption, machine utilization).

### Phase 1: UI/UX Modernization [DONE]
**Goal:** Upgrade the visual aesthetics and architecture of the PE Dashboard.
- **Glassmorphism UI:** Overhauled the legacy UI into a premium, responsive, and glassmorphic layout (`pe-enterprise.css`).
- **Decoupled Architecture:** Upgraded the tab navigation system and polished `peApp.js`. Separated the DOM rendering logic from the data fetching logic to ensure the application scales cleanly.

### Phase 2: Eliminating Dashboard Redundancy [DONE]
**Goal:** Reduce code bloat and centralize the monitoring experience.
- **Removed Redundant Tabs:** Completely deleted `Traditional Dashboard` and `Production Overview` as they offered overlapping functionality with the Live IIoT Map.
- **Unified KPI Integration:** Integrated the critical KPI cards directly into the `Live IIoT Map` and decoupled `machineModule.js` and `workOrderModule.js` from tight UI constraints, making them modular.

### Phase 3: Core Map Engine Implementation [DONE]
**Goal:** Build a robust 2D floorplan editor and live monitor.
- **Zone Analytics:** Fully implemented. Uses `fabric.js` polygons as "Zones". The system calculates and displays aggregated metrics (OEE, Power, Output) for all `.machine-node` elements physically located inside the drawn zone using intersection logic.
- **Production Flow / Conveyors:** Fully implemented. Users can draw arrows/conveyors linking machines to visualize material flow sequences.
- **Data Heatmap Overlay:** Fully implemented using `simpleheat.js`. It renders a thermal heatmap over the canvas (with `pointer-events: none`) using live machine telemetry as the weight/intensity.

### Phase 4: Backend SQL Optimization & Security [DONE]
**Goal:** Optimize the database to handle high-frequency IIoT polling (every 3 seconds) without crashing the SQL Server.
- **Targeted Direct Query:** Implemented `$pdo->setAttribute(PDO::SQLSRV_ATTR_DIRECT_QUERY, true)` specifically inside `iiotAPI.php` and `machineAPI.php`. This bypasses the overhead of `sp_prepexec` (which creates and caches a temporary stored procedure for every poll) drastically reducing SQL Server CPU usage and latency.
- **Security Audit:** Verified that using Direct Query with `$pdo->prepare()` remains 100% secure against SQL Injection. Restored global `db.php` back to default to protect other modules (like Store Management which relies on Output Parameters).
- **Index Migration:** Created `migrate_indexes.php` to apply missing Non-Clustered Indexes on heavy tables (`PE_IIOT_STATE_LOG`, `PE_IIOT_TELEMETRY_HISTORY`, `STOCK_TRANSACTIONS`, `PE_WORK_ORDERS`) to eliminate Full Table Scans.

### Phase 5: Map Builder Polish & Alerts [DONE]
**Goal:** Enhance the usability of the Map Builder and provide proactive visual cues.
- **Visual Map Alerts:** Implemented `animateAlerts()` in `iiotModule.js`. The system uses `requestAnimationFrame` to smoothly tween the opacity of zones and pulse machines (red for `stopped`, yellow for `warning`) based on real-time telemetry.
- **Alignment & Grouping Tools:** Implemented `alignSelected()` in `mapBuilderModule.js`. Allows administrators to multi-select machines and align them perfectly (Align Top, Align Left, Distribute), providing a CAD-like premium UX.

### Phase 6: Multi-Area Scalability [DONE]
**Goal:** Support massive factory layouts across multiple buildings.
- **Multi-Floor Support:** Fully implemented. The UI provides a dropdown (`iiotAreaSelect`) allowing operators to seamlessly switch between "Building A - Floor 1", "Building B", etc.
- **Database Partitioning:** The backend `mapAPI.php` correctly ties the `fabric.js` JSON payload to specific `area_id`s in the `PE_IIOT_MAP_DATA` table, completely separating the layouts.

---

## 🔮 Future Sandbox & Experimental Features (ฟีเจอร์แห่งอนาคต)

หากเทียบกับแพลตฟอร์ม IIoT และ SCADA ระดับโลก (เช่น Siemens MindSphere, PTC ThingWorx, หรือ Ignition) ระบบของเรายังมีพื้นที่ให้ก้าวไปสู่ระดับ **"Next-Gen Enterprise"** ได้อีกมาก เมื่อจำนวนเซนเซอร์และเครื่องจักรมีมากขึ้น นี่คือไอเดียสำหรับการพัฒนาในอนาคต:

### 1. Time-Machine / Historical Playback (ระบบเล่นย้อนหลัง)
**Goal:** Allow users to "rewind" time and watch a replay of the factory floor's state.
**Implementation Ideas:**
- Add a timeline slider at the bottom of the map.
- When the user selects a past time range (e.g., "Yesterday 14:00 - 15:00") and hits Play, the system fetches historical telemetry and smoothly animates the map's machine statuses, heatmaps, and zone alerts exactly as they happened. 
- **Business Value:** Extremely powerful for Root-Cause Analysis (RCA) to see a domino effect of machine failures.

### 2. Predictive Maintenance Overlays (ระบบแผนที่พยากรณ์ล่วงหน้า)
**Goal:** Highlight machines that are *predicted* to fail soon, rather than machines that have already failed.
**Implementation Ideas:**
- Integrate with an AI/ML backend (e.g., Python + scikit-learn) that analyzes vibration/temperature trends.
- Apply a special glowing effect (e.g., Purple Aura) to machines on the map that have a high probability of breakdown within the next 48 hours.

### 3. Remote Control & SCADA Integration (ระบบสั่งการระยะไกลบนแผนที่)
**Goal:** Evolve the map from a "Passive Monitor" to an "Active Control Center".
**Implementation Ideas:**
- When an authorized Admin clicks a machine, a command panel opens.
- Add buttons to send Write Commands (Start, Stop, Reset Alarm, Change Recipe) directly to the physical PLC via OPC-UA or MQTT.
- Requires extremely tight security and audit logging.

### 4. Logistics Pathfinding & Dynamic Bottlenecks (ระบบคำนวณเส้นทางโลจิสติกส์)
**Goal:** Visualize and optimize material movement on the factory floor.
**Implementation Ideas:**
- Track Forklifts or AGVs (Automated Guided Vehicles) in real-time as moving nodes on the map.
- If a machine breaks down or a zone is blocked, dynamically draw alternative routing paths on the map for the logistics team to bypass the incident.

### 5. AR (Augmented Reality) Maintenance Mode
**Goal:** Bring the map into the real world for maintenance technicians.
**Implementation Ideas:**
- Develop a tablet/mobile companion app.
- Technicians point their camera at the real factory floor, and the IIoT data (current temperature, OEE, active alarms) hovers over the physical machines in Augmented Reality using ARKit/ARCore.

### 6. 3D Digital Twin (การจำลองเครื่องจักร 3 มิติ)
**Goal:** Upgrade the 2D floorplan visualization into a full 3D interactive simulation where machine telemetry (temperature, speed, status) affects 3D meshes in real-time (similar to SolidWorks/Siemens NX digital twins).
**Implementation Ideas:**
- **Technology Stack:** Use WebGL libraries such as **Three.js** or **Babylon.js** (or React Three Fiber if moving to React). These allow rendering 3D assets directly in the browser.
- **3D Assets & Optimization (The Bottleneck):** Raw CAD files (SolidWorks, AutoCAD) are too heavy for browsers (High-poly). They must be optimized, decimated, and re-topologized into lightweight `.gltf` or `.glb` formats by a 3D Artist.
- **Data Binding:** Mesh components in the 3D model must have specific names (e.g., `mesh_motor_01`). The frontend will use these names to bind MQTT telemetry data to mesh properties (e.g., changing material color based on temperature, rotating the mesh based on RPM).
- **Hybrid Approach:** To save client-side resources, keep the factory floor as a 2D City-Builder. When a user double-clicks a machine node, open a WebGL popup showing the specific machine's 3D model with real-time sensor overlays (Low-poly models recommended for initial MVP).
