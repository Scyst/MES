import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Wifi, Navigation } from 'lucide-react';
import {
  FACTORY_BOUNDS,
  GRID_COLS,
  GRID_ROWS,
  NORMALIZED_SIZE,
  columnIndexToLetters,
  getGridCellMeta,
  getHeatmapRgba,
  getVehicleVisualMeta,
  resolveNormalizedPosition
} from '../utils/forkliftSpatialHelpers';

const CELL_W = NORMALIZED_SIZE / GRID_COLS;
const CELL_H = NORMALIZED_SIZE / GRID_ROWS;

export default function ForkliftMapCanvas({
  vehicles = [],
  zones = [],
  showGrid = true,
  showZones = true,
  showHeatmap = false,
  heatmapBuckets = [],
  heatmapMaxWeight = 0,
  trailPoints = [],
  playbackIndex = -1,
  selectedVehicleId = null,
  followSelected = false,
  simMode = false,
  simPositions = {},
  isAdmin = false,
  onSelectVehicle,
  onCellClick
}) {
  const heatmapCanvasRef = useRef(null);
  const svgContainerRef = useRef(null);

  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOriginRef = useRef({ clientX: 0, clientY: 0, panX: 0, panY: 0 });
  const [hoveredCell, setHoveredCell] = useState(null);

  // Follow selected vehicle automatically when Follow Mode is active
  useEffect(() => {
    if (!followSelected || !selectedVehicleId) return;
    const targetVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!targetVehicle) return;

    const simOverride = simPositions[targetVehicle.id];
    const pos = simOverride || resolveNormalizedPosition(targetVehicle);
    if (!pos) return;

    const targetZoom = Math.max(zoomRef.current, 1.8);
    setZoom(targetZoom);
    // Center view around target normalized position (500, 500 center offset)
    setPan({
      x: (500 - pos.x) * targetZoom * 0.45,
      y: (500 - pos.y) * targetZoom * 0.45
    });
  }, [followSelected, selectedVehicleId, vehicles, simPositions]);

  // Render HTML5 Canvas Heatmap radial gradients cleanly
  useEffect(() => {
    const canvas = heatmapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, NORMALIZED_SIZE, NORMALIZED_SIZE);
    if (!showHeatmap || !heatmapBuckets.length) return;

    const safeMax = Math.max(1, heatmapMaxWeight);
    for (let i = 0; i < heatmapBuckets.length; i++) {
      const bucket = heatmapBuckets[i];
      const cx = bucket.bucket_x + 5;
      const cy = bucket.bucket_y + 5;
      // Nonlinear curve prevents one parking hotspot from hiding secondary corridors
      const ratio = Math.pow(bucket.weight / safeMax, 0.45);
      const radius = 20 + ratio * 24;

      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
      grad.addColorStop(0, getHeatmapRgba(ratio));
      grad.addColorStop(0.55, getHeatmapRgba(ratio * 0.6));
      grad.addColorStop(1, 'rgba(37, 99, 235, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [showHeatmap, heatmapBuckets, heatmapMaxWeight]);

  // Pointer drag pan handlers
  const handlePointerDown = (e) => {
    if (e.target.dataset?.cell) return;
    setIsDragging(true);
    dragOriginRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: pan.x,
      panY: pan.y
    };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: dragOriginRef.current.panX + (e.clientX - dragOriginRef.current.clientX),
      y: dragOriginRef.current.panY + (e.clientY - dragOriginRef.current.clientY)
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleSvgMouseMove = (e) => {
    if (!showGrid || !svgContainerRef.current) {
      if (hoveredCell) setHoveredCell(null);
      return;
    }
    const rect = svgContainerRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * NORMALIZED_SIZE;
    const relY = ((e.clientY - rect.top) / rect.height) * NORMALIZED_SIZE;
    const col = Math.floor(relX / CELL_W);
    const row = Math.floor(relY / CELL_H);
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      if (!hoveredCell || hoveredCell.col !== col || hoveredCell.row !== row) {
        setHoveredCell(getGridCellMeta(col, row));
      }
    }
  };

  const handleSvgClick = (e) => {
    if (!showGrid || (!isAdmin && !simMode) || !svgContainerRef.current) return;
    const rect = svgContainerRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * NORMALIZED_SIZE;
    const relY = ((e.clientY - rect.top) / rect.height) * NORMALIZED_SIZE;
    const col = Math.floor(relX / CELL_W);
    const row = Math.floor(relY / CELL_H);
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      onCellClick?.(getGridCellMeta(col, row));
    }
  };

  // Pre-calculate zone lookup cells for highlighting
  const mappedZoneCells = zones.map((z) => ({
    ...z,
    col: Math.max(0, Math.min(GRID_COLS - 1, Math.floor((z.svg_x ?? 0) / CELL_W))),
    row: Math.max(0, Math.min(GRID_ROWS - 1, Math.floor((z.svg_y ?? 0) / CELL_H)))
  }));

  // Trail coordinates
  const resolvedTrail = trailPoints
    .map((pt) => {
      const pos = resolveNormalizedPosition(pt);
      return pos ? { ...pt, x: pos.x, y: pos.y } : null;
    })
    .filter(Boolean);

  const polylineStr = resolvedTrail.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
  const activePlaybackPoint =
    playbackIndex >= 0 && playbackIndex < resolvedTrail.length ? resolvedTrail[playbackIndex] : null;

  return (
    <div className="relative w-full h-[430px] sm:h-[540px] lg:h-[600px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden select-none shadow-inner">
      {/* Transform Viewport */}
      <div
        className={`w-full h-full flex items-center justify-center ${
          isDragging ? 'cursor-grabbing' : simMode || isAdmin ? 'cursor-crosshair' : 'cursor-grab'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          ref={svgContainerRef}
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={() => setHoveredCell(null)}
          onClick={handleSvgClick}
          className="relative w-full max-w-[820px] aspect-square transition-transform duration-150 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
          }}
        >
          {/* Base Architectural Vector Blueprint SVG */}
          <svg
            viewBox="0 0 1000 1000"
            className="w-full h-full block bg-slate-900 rounded-xl shadow-2xl border border-slate-700/80"
          >
            {/* Perimeter Grid Background Pattern */}
            <defs>
              <pattern id="minorGridPattern" width="25" height="33.3333" patternUnits="userSpaceOnUse">
                <path
                  d="M 25 0 L 0 0 0 33.3333"
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.14)"
                  strokeWidth="0.7"
                />
              </pattern>
            </defs>

            <rect x="0" y="0" width="1000" height="1000" fill="#0f172a" />
            <rect x="0" y="0" width="1000" height="1000" fill="url(#minorGridPattern)" />

            {/* Schematic Factory Buildings (B9 / B10 Floor Orientation) */}
            <g opacity="0.88">
              <rect x="70" y="95" width="380" height="270" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
              <text x="90" y="128" fill="#64748b" fontSize="16" fontWeight="700" fontFamily="monospace">
                BUILDING B9 · PRODUCTION & PRESS
              </text>

              <rect x="490" y="95" width="430" height="270" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
              <text x="510" y="128" fill="#64748b" fontSize="16" fontWeight="700" fontFamily="monospace">
                WAREHOUSE & FG DISPATCH BAY
              </text>

              <rect x="70" y="425" width="460" height="340" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
              <text x="90" y="458" fill="#64748b" fontSize="16" fontWeight="700" fontFamily="monospace">
                BUILDING B10 · ASSEMBLY & PAINT LINE
              </text>

              <rect x="570" y="425" width="350" height="210" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
              <text x="590" y="458" fill="#64748b" fontSize="16" fontWeight="700" fontFamily="monospace">
                INBOUND STORE & RECEIVING
              </text>

              {/* Forklift Charging Dock Zone */}
              <rect
                x="570"
                y="665"
                width="350"
                height="100"
                rx="8"
                fill="rgba(59, 130, 246, 0.12)"
                stroke="#3b82f6"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <text x="590" y="720" fill="#93c5fd" fontSize="15" fontWeight="700" fontFamily="monospace">
                ⚡ CHARGING BAY & FLEET PARK
              </text>

              {/* Internal Main Corridor Markings */}
              <line x1="35" y1="395" x2="965" y2="395" stroke="#475569" strokeWidth="3" strokeDasharray="14 8" />
              <line x1="470" y1="70" x2="470" y2="910" stroke="#475569" strokeWidth="3" strokeDasharray="14 8" />
            </g>

            {/* 40x30 Grid Axis Labels & Hovered Cell Highlight */}
            {showGrid && (
              <g pointerEvents="none">
                {Array.from({ length: GRID_COLS }, (_, colIdx) =>
                  colIdx % 4 === 0 ? (
                    <text
                      key={`col-lbl-${colIdx}`}
                      x={colIdx * CELL_W + CELL_W / 2}
                      y={16}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {columnIndexToLetters(colIdx)}
                    </text>
                  ) : null
                )}
                {Array.from({ length: GRID_ROWS }, (_, rowIdx) =>
                  rowIdx % 3 === 0 ? (
                    <text
                      key={`row-lbl-${rowIdx}`}
                      x={10}
                      y={rowIdx * CELL_H + CELL_H * 0.65}
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {rowIdx + 1}
                    </text>
                  ) : null
                )}
                {hoveredCell && (
                  <rect
                    x={hoveredCell.col * CELL_W}
                    y={hoveredCell.row * CELL_H}
                    width={CELL_W}
                    height={CELL_H}
                    fill="rgba(250, 204, 21, 0.25)"
                    stroke="#facc15"
                    strokeWidth="2"
                  />
                )}
              </g>
            )}

            {/* Mapped Wi-Fi AP Site Survey Zones */}
            {showZones &&
              mappedZoneCells.map((zone) => (
                <g key={zone.ap_id || zone.zone_name}>
                  {showGrid && (
                    <rect
                      x={zone.col * CELL_W}
                      y={zone.row * CELL_H}
                      width={CELL_W}
                      height={CELL_H}
                      fill="rgba(16, 185, 129, 0.28)"
                      stroke="#10b981"
                      strokeWidth="1.5"
                    />
                  )}
                  <circle
                    cx={zone.svg_x}
                    cy={zone.svg_y}
                    r="11"
                    fill="rgba(16, 185, 129, 0.2)"
                    stroke="#34d399"
                    strokeWidth="1.5"
                  />
                  <circle cx={zone.svg_x} cy={zone.svg_y} r="4" fill="#34d399" />
                  <text
                    x={zone.svg_x}
                    y={(zone.svg_y || 0) - 14}
                    textAnchor="middle"
                    fill="#6ee7b7"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="sans-serif"
                  >
                    {zone.zone_name}
                  </text>
                </g>
              ))}

            {/* Historical Snail Trail Polyline */}
            {resolvedTrail.length > 1 && (
              <g pointerEvents="none">
                <polyline
                  points={polylineStr}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="10 6"
                  opacity="0.9"
                />
                <circle cx={resolvedTrail[0].x} cy={resolvedTrail[0].y} r="7" fill="#22c55e" stroke="#ffffff" strokeWidth="2" />
                <circle
                  cx={resolvedTrail[resolvedTrail.length - 1].x}
                  cy={resolvedTrail[resolvedTrail.length - 1].y}
                  r="7"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Trail Playback Scrubber Cursor */}
            {activePlaybackPoint && (
              <g pointerEvents="none">
                <circle
                  cx={activePlaybackPoint.x}
                  cy={activePlaybackPoint.y}
                  r="14"
                  fill="rgba(56, 189, 248, 0.35)"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                />
                <circle cx={activePlaybackPoint.x} cy={activePlaybackPoint.y} r="6" fill="#0ea5e9" />
              </g>
            )}
          </svg>

          {/* Stacked HTML5 Heatmap Layer (pointer-events-none) */}
          <canvas
            ref={heatmapCanvasRef}
            width={NORMALIZED_SIZE}
            height={NORMALIZED_SIZE}
            className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300 ${
              showHeatmap ? 'opacity-95' : 'opacity-0'
            }`}
          />

          {/* Interactive Forklift Markers Overlay (Crisp SVG/HTML Badges) */}
          <svg
            viewBox="0 0 1000 1000"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {vehicles.map((fl) => {
              const simOverride = simPositions[fl.id];
              const pos = simOverride || resolveNormalizedPosition(fl);
              if (!pos) return null;

              const meta = getVehicleVisualMeta(fl);
              const isSelected = fl.id === selectedVehicleId;

              return (
                <g
                  key={fl.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectVehicle?.(fl);
                  }}
                >
                  {(isSelected || String(fl.status).toUpperCase() === 'IN_USE') && (
                    <circle
                      r={isSelected ? 26 : 19}
                      fill={meta.hex}
                      opacity={isSelected ? 0.32 : 0.22}
                    />
                  )}

                  <circle
                    r={isSelected ? 15 : 12}
                    fill={meta.hex}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 3.5 : 2.5}
                  />

                  <text
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="800"
                    fontFamily="sans-serif"
                  >
                    {simOverride ? 'S' : pos.mode === 'INDOOR' ? 'W' : 'G'}
                  </text>

                  {/* Code Label Pill */}
                  <g transform="translate(0, -24)">
                    <rect
                      x="-56"
                      y="-11"
                      width="112"
                      height="20"
                      rx="6"
                      fill={isSelected ? '#1e3a8a' : 'rgba(15, 23, 42, 0.9)'}
                      stroke={isSelected ? '#60a5fa' : '#475569'}
                      strokeWidth="1.2"
                    />
                    <text
                      y="2.5"
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="sans-serif"
                    >
                      {String(fl.code || '').slice(0, 16)} · {fl.current_battery ?? 100}%
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Top-Left Perimeter & Hover Readout */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-md text-slate-200 border border-slate-700/80 rounded-xl px-3 py-1.5 text-[11px] flex items-center gap-2 shadow-lg">
          <Navigation className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-mono">
            {FACTORY_BOUNDS.latBottom.toFixed(4)}°–{FACTORY_BOUNDS.latTop.toFixed(4)}°N,{' '}
            {FACTORY_BOUNDS.lngLeft.toFixed(4)}°–{FACTORY_BOUNDS.lngRight.toFixed(4)}°E
          </span>
        </div>

        {hoveredCell && showGrid && (
          <div className="bg-amber-950/90 text-amber-200 border border-amber-500/40 rounded-xl px-3 py-1 text-[11px] font-mono shadow-lg w-fit">
            {hoveredCell.zoneName} · X:{hoveredCell.centerX}, Y:{hoveredCell.centerY}
            {isAdmin && !simMode && ' (คลิกเพื่อบันทึก Wi-Fi AP)'}
            {simMode && ' (คลิกเพื่อจำลองพิกัด)'}
          </div>
        )}
      </div>

      {/* Top-Right Zoom & Reset Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))))}
          className="w-10 h-10 bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-slate-700 rounded-xl flex items-center justify-center shadow-lg transition-colors"
          title="ขยายแผนที่"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
          className="w-10 h-10 bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-slate-700 rounded-xl flex items-center justify-center shadow-lg transition-colors"
          title="ย่อแผนที่"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="w-10 h-10 bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-slate-700 rounded-xl flex items-center justify-center shadow-lg transition-colors"
          title="รีเซ็ตมุมมอง"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Legend Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-md text-slate-200 border border-slate-700/80 rounded-xl px-3 py-1.5 text-[11px] flex flex-wrap items-center gap-3 shadow-lg">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> พร้อมใช้
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> ใช้งานอยู่
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> ชาร์จไฟ
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> แบตต่ำ (&lt;20%)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" /> G=GPS · W=Wi-Fi AP
          </span>
        </div>
      </div>
    </div>
  );
}
