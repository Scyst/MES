# IIoT Map Builder & Dashboard - Future Roadmap

This document outlines the planned future enhancements for the IIoT Map Builder and Live IIoT Monitor within the PE Enterprise module. It is intended for future developers or AI agents to pick up and continue development smoothly.

## 1. Zone Analytics (ระบบรวมสถิติตามโซน)
**Goal:** Make polygon/box "Zones" interactive. When a user clicks or hovers over a zone, the system calculates and displays aggregated metrics (OEE, Power, Output) for all machines physically located inside that zone.
**Implementation Ideas:**
- **Geometry Check:** Use a "Point in Polygon" algorithm (ray-casting) or Fabric.js intersection features to determine which machine nodes (`.machine-node`) fall inside the coordinates of a drawn Zone (`fabric.Polygon` or `fabric.Rect`).
- **Data Aggregation:** Sum or average the telemetry data of the machines inside the zone.
- **UI:** Show a summary popover or a side panel with the aggregated data when the zone is selected.

## 2. Production Flow / Conveyors (การสร้างเส้นทางการผลิต)
**Goal:** Allow users to draw arrows or conveyor belts connecting machines to visualize the material flow sequence.
**Implementation Ideas:**
- **New Drawing Mode:** Add an 'arrow' or 'conveyor' mode in `mapBuilderModule.js`.
- **Connecting Nodes:** Instead of just drawing a static arrow, the arrows could logically link `machineId_A` to `machineId_B`.
- **Animation:** Use SVG animations or Canvas dashed line animations to simulate material moving along the conveyor when the factory is running.

## 3. Data Heatmap Overlay (แผนที่ความร้อน)
**Goal:** Overlay a thermal-like heatmap on the floorplan based on machine telemetry (e.g., red for high power consumption, green for normal).
**Implementation Ideas:**
- **Canvas Integration:** Use a library like `simpleheat` or `heatmap.js`. Add it as a top-level canvas overlay with low opacity (`pointer-events: none`).
- **Data Source:** Feed the X, Y coordinates of the machines and their target metric (e.g., Power Consumption) as the weight/intensity.
- **Dynamic Updates:** Update the heatmap array whenever the live telemetry WebSocket/API pushes new data.

## 4. Visual Map Alerts (ระบบแจ้งเตือนบนแผนที่)
**Goal:** Draw immediate visual attention to machines that are down, offline, or underperforming.
**Implementation Ideas:**
- **Node Animations:** Add CSS keyframes (e.g., `pulse-danger`) to the `.machine-node` elements when status is 'Down' or 'Offline'.
- **Zone Flashing:** If a machine is inside a Zone, make the corresponding Fabric.js zone polygon stroke flash red (using `fabric.util.animate` to tween the stroke color/opacity).

## 5. Alignment & Grouping Tools (จัดการเครื่องจักรแบบกลุ่ม)
**Goal:** Provide tools to easily align and distribute machine nodes cleanly.
**Implementation Ideas:**
- **Multi-select:** Allow dragging a selection box to select multiple `.machine-node` elements.
- **Alignment Functions:** Add toolbar buttons for "Align Top", "Align Left", "Distribute Horizontally", etc. Calculate the min/max X/Y of the selected nodes and adjust their `style.left` and `style.top` accordingly.
- **Save State:** Ensure that updating these positions triggers the `IIoTModule.saveMapPositions()` logic.

## 6. Multi-Floor / Multi-Area Support (รองรับโรงงานหลายชั้น)
**Goal:** Support switching between different floors or buildings, each with its own floorplan image and machine layout.
**Implementation Ideas:**
- **Area Selector:** Add a dropdown at the top of the IIoT Dashboard (e.g., "Building A - Floor 1", "Building B").
- **Database Schema:** Update the database to store `floor_id` or `area_id` alongside the saved objects and node positions.
- **Dynamic Loading:** When a new area is selected, clear the canvas, load the specific background image for that area, and fetch only the machine nodes and map builder objects associated with that area.
