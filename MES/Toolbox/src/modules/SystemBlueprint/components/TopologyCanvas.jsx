import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  Layers,
  Cpu,
  Globe,
  Database,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Info,
  Sparkles,
  Workflow,
  Eye,
  EyeOff,
  RotateCcw,
  Maximize2,
  ArrowRight,
  Filter,
  Activity
} from 'lucide-react';

const LAYER_CONFIGS = [
  {
    id: 'L1_HARDWARE_IOT',
    order: 1,
    title: '1. ฮาร์ดแวร์หน้างาน เครื่องจักร และ IoT',
    subtitle: 'Shopfloor, Electrical & IoT Sensors',
    color: '#f59e0b',
    borderClass: 'border-l-amber-500',
    badgeBg: 'bg-amber-500 text-slate-950',
    icon: Cpu
  },
  {
    id: 'L2_EXTERNAL_ERP',
    order: 2,
    title: '2. ระบบองค์กรภายนอก (SAP ERP / HR)',
    subtitle: 'External Enterprise Systems (SAP & HR)',
    color: '#8b5cf6',
    borderClass: 'border-l-purple-500',
    badgeBg: 'bg-purple-600 text-white',
    icon: Globe
  },
  {
    id: 'L3_DATABASE',
    order: 3,
    title: '3. ฐานข้อมูลกลาง SQL Server',
    subtitle: 'Central Database Cluster (10.1.1.31 : IIOT_TOOLBOX)',
    color: '#10b981',
    borderClass: 'border-l-emerald-500',
    badgeBg: 'bg-emerald-600 text-white',
    icon: Database
  },
  {
    id: 'L4_API_GATEWAY',
    order: 4,
    title: '4. เกตเวย์ความปลอดภัย & SSO',
    subtitle: 'PHP 8 API Gateway + Hybrid PBAC + Session Sync',
    color: '#3b82f6',
    borderClass: 'border-l-blue-500',
    badgeBg: 'bg-blue-600 text-white',
    icon: ShieldCheck
  },
  {
    id: 'L5_APPLICATIONS',
    order: 5,
    title: '5. แอปพลิเคชันและโมดูลระบบงาน',
    subtitle: 'Toolbox SPA & MES Core Modules (28 Modules)',
    color: '#6366f1',
    borderClass: 'border-l-indigo-500',
    badgeBg: 'bg-indigo-600 text-white',
    icon: Layers
  }
];

export default function TopologyCanvas({
  nodes = [],
  edges = [],
  onNodeClick,
  selectedDomain = 'ALL'
}) {
  const containerRef = useRef(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [showAllEdges, setShowAllEdges] = useState(false);
  const [nodePositions, setNodePositions] = useState({});

  // Active focused node (either hovered or locked by click)
  const activeFocusId = hoveredNodeId || selectedNodeId;

  // Filter nodes by domain if not ALL
  const activeDomainNodes = useMemo(() => {
    if (selectedDomain === 'ALL') return nodes;
    return nodes.filter(n => n.domain === selectedDomain);
  }, [nodes, selectedDomain]);

  const activeDomainNodeIds = useMemo(() => {
    return new Set(activeDomainNodes.map(n => n.id));
  }, [activeDomainNodes]);

  // Compute connected nodes and edges for the focused node
  const { connectedNodeIds, connectedEdgeIndices, relatedEdgesCount } = useMemo(() => {
    if (!activeFocusId) {
      return {
        connectedNodeIds: new Set(),
        connectedEdgeIndices: new Set(),
        relatedEdgesCount: 0
      };
    }

    const cNodes = new Set([activeFocusId]);
    const cEdges = new Set();

    edges.forEach((edge, idx) => {
      if (edge.from === activeFocusId) {
        cNodes.add(edge.to);
        cEdges.add(idx);
      }
      if (edge.to === activeFocusId) {
        cNodes.add(edge.from);
        cEdges.add(idx);
      }
    });

    return {
      connectedNodeIds: cNodes,
      connectedEdgeIndices: cEdges,
      relatedEdgesCount: cEdges.size
    };
  }, [activeFocusId, edges]);

  // Focused node object
  const focusedNode = useMemo(() => {
    if (!activeFocusId) return null;
    return nodes.find(n => n.id === activeFocusId) || null;
  }, [activeFocusId, nodes]);

  // Group nodes by Layer
  const nodesByLayer = useMemo(() => {
    const map = {};
    LAYER_CONFIGS.forEach(l => { map[l.id] = []; });
    nodes.forEach(node => {
      if (map[node.layer]) {
        map[node.layer].push(node);
      }
    });
    return map;
  }, [nodes]);

  // Measure card coordinates for SVG curved Bezier connectors
  const updatePositions = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newPositions = {};

    nodes.forEach(node => {
      const el = document.getElementById(`node-card-${node.id}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        newPositions[node.id] = {
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
          centerX: rect.left - containerRect.left + rect.width / 2,
          centerY: rect.top - containerRect.top + rect.height / 2,
          topAnchorX: rect.left - containerRect.left + rect.width / 2,
          topAnchorY: rect.top - containerRect.top,
          bottomAnchorX: rect.left - containerRect.left + rect.width / 2,
          bottomAnchorY: rect.top - containerRect.top + rect.height
        };
      }
    });

    setNodePositions(newPositions);
  }, [nodes]);

  // Recalculate on mount, window resize, domain change, or focus change
  useEffect(() => {
    const timer = setTimeout(updatePositions, 60);
    window.addEventListener('resize', updatePositions);

    let resizeObserver = null;
    if (containerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        updatePositions();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePositions);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [updatePositions, selectedDomain]);

  // Status badge styling helper
  const getStatusBadge = (node) => {
    if (node.status === 'PORTED_SPA' || node.status === 'PORTED_SELF_CONTAINED') {
      return {
        label: '⚡ PORTED SPA',
        cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      };
    }
    if (node.status === 'ACTIVE_LEGACY_PHP') {
      return {
        label: 'PHP LEGACY',
        cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      };
    }
    if (node.status?.includes('LIVE') || node.status === 'CORE_ONLINE') {
      return {
        label: 'LIVE STREAM',
        cls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
      };
    }
    return {
      label: node.status || 'ACTIVE',
      cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30'
    };
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ═══ 1. Interactive Control Toolbar ═══ */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
            <Workflow className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
              ผังบันไดสถาปัตยกรรม 5 เลเยอร์แนวตั้ง (Layered Graph & Path Tracing)
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Tracing
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              คลิกหรือชี้ที่การ์ดโหนดเพื่อส่องไฟติดตามเส้นทางไหลข้อมูล (Upstream & Downstream) แบบบันไดชั้นต่อชั้น
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAllEdges(prev => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              showAllEdges
                ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 border-sky-300 dark:border-sky-700 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
            title="เปิด/ปิดการแสดงเส้นเชื่อมข้อมูลพื้นหลังทั้งหมด"
          >
            {showAllEdges ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>เส้นเชื่อมข้อมูล: {showAllEdges ? 'แสดงทั้งหมด' : 'แสดงเมื่อเลือกโหนด'}</span>
          </button>

          {(selectedNodeId || hoveredNodeId) && (
            <button
              onClick={() => {
                setSelectedNodeId(null);
                setHoveredNodeId(null);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ล้างการโฟกัส</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══ 2. Active Focus Notification Banner ═══ */}
      {focusedNode && (
        <div className="px-4 py-2.5 rounded-xl bg-blue-50/90 dark:bg-sky-950/80 border border-blue-200 dark:border-sky-500/50 flex flex-wrap items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="px-2 py-0.5 rounded-md bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 font-bold text-[11px]">
              กำลังโฟกัสโหนด
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {focusedNode.title}
            </span>
            <span className="font-mono text-blue-600 dark:text-sky-300 text-[11px]">
              ({relatedEdgesCount} เส้นทางเชื่อมโยงตรง)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNodeClick && onNodeClick(focusedNode)}
              className="text-xs px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center gap-1"
            >
              <Info className="w-3.5 h-3.5" />
              ดูรายละเอียดเชิงลึก
            </button>
            <button
              onClick={() => {
                setSelectedNodeId(null);
                setHoveredNodeId(null);
              }}
              className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition"
            >
              แสดงทุกโหนด (Show All)
            </button>
          </div>
        </div>
      )}

      {/* ═══ 3. Main Vertical Layered Blueprint Container ═══ */}
      <div
        ref={containerRef}
        className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 sm:p-6 shadow-sm blueprint-grid-bg transition-all"
      >
        {/* ══════════ SVG Connector Layer ══════════ */}
        <svg
          id="blueprint-svg-overlay"
          className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" opacity="0.75" />
            </marker>
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#facc15" />
            </marker>
          </defs>

          {/* Render SVG Edges */}
          <g id="svg-edges-group">
            {edges.map((edge, idx) => {
              const src = nodePositions[edge.from];
              const tgt = nodePositions[edge.to];
              if (!src || !tgt) return null;

              const isHighlightedEdge =
                activeFocusId &&
                (edge.from === activeFocusId || edge.to === activeFocusId);

              // If a node is focused, ONLY draw edges directly connected to that node
              if (activeFocusId && !isHighlightedEdge) {
                return null;
              }

              // If no node is focused, draw all edges ONLY if showAllEdges is true
              if (!activeFocusId && !showAllEdges) {
                return null;
              }

              // Card anchor points: Source bottom/center -> Target top/center
              const x1 = src.centerX;
              const y1 = src.centerY;
              const x2 = tgt.centerX;
              const y2 = tgt.centerY;

              const dy = y2 - y1;
              const dx = x2 - x1;
              const ctrlOffset = Math.max(Math.abs(dy) * 0.45, 40);

              const c1x = x1 + dx * 0.15;
              const c1y = y1 + (dy >= 0 ? ctrlOffset : -ctrlOffset);
              const c2x = x2 - dx * 0.15;
              const c2y = y2 - (dy >= 0 ? ctrlOffset : -ctrlOffset);

              const pathData = `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;

              return (
                <g key={`edge-${idx}`}>
                  {/* Background glow path */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isHighlightedEdge ? '#facc15' : '#38bdf8'}
                    strokeWidth={isHighlightedEdge ? 3.5 : 1.5}
                    strokeOpacity={isHighlightedEdge ? 0.35 : 0.18}
                  />

                  {/* Foreground animated path */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isHighlightedEdge ? '#facc15' : '#38bdf8'}
                    strokeWidth={isHighlightedEdge ? 2.4 : 1.4}
                    strokeOpacity={isHighlightedEdge ? 0.95 : 0.45}
                    className={isHighlightedEdge ? 'edge-animated' : ''}
                    markerEnd={isHighlightedEdge ? 'url(#arrow-active)' : 'url(#arrow-default)'}
                  />

                  {/* Midpoint Pill Label for Highlighted Edge */}
                  {isHighlightedEdge && edge.label && (
                    <g>
                      {(() => {
                        const midX = (x1 + x2) / 2;
                        const midY = (y1 + y2) / 2;
                        const textLen = Math.min(edge.label.length * 6.5 + 24, 320);

                        return (
                          <g transform={`translate(${midX}, ${midY})`}>
                            <rect
                              x={-textLen / 2}
                              y={-12}
                              width={textLen}
                              height={24}
                              rx={7}
                              fill="#0f172a"
                              stroke="#facc15"
                              strokeWidth={1.2}
                              className="shadow-lg"
                            />
                            <text
                              x={0}
                              y={4}
                              textAnchor="middle"
                              fill="#fef08a"
                              fontSize={10.5}
                              fontWeight={600}
                              fontFamily="sans-serif"
                            >
                              {edge.label}
                            </text>
                          </g>
                        );
                      })()}
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* ══════════ Vertical 5-Layer Stack ══════════ */}
        <div className="relative z-10 flex flex-col gap-6">
          {LAYER_CONFIGS.map(layer => {
            const layerNodes = nodesByLayer[layer.id] || [];
            if (layerNodes.length === 0) return null;

            // Grid styling based on node count
            const gridCols =
              layerNodes.length === 1
                ? 'grid-cols-1 max-w-2xl mx-auto w-full'
                : layerNodes.length === 2
                  ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto w-full'
                  : layerNodes.length === 3
                    ? 'grid-cols-1 md:grid-cols-3 w-full'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full';

            const LayerIcon = layer.icon;

            return (
              <div
                key={layer.id}
                className={`rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50/60 dark:bg-slate-900/60 p-4 sm:p-5 relative border-l-4 ${layer.borderClass} shadow-2xs`}
              >
                {/* Layer Section Header */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4 pb-2.5 border-b border-slate-200/80 dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-bold ${layer.badgeBg} shadow-2xs`}
                    >
                      LAYER {layer.order} : {layer.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <LayerIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      {layer.title}
                    </h3>
                    <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
                      ({layer.subtitle})
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                    {layerNodes.length} โหนดในเลเยอร์นี้
                  </span>
                </div>

                {/* Nodes Grid */}
                <div className={`grid ${gridCols} gap-3.5`}>
                  {layerNodes.map(node => {
                    const isMatchedDomain =
                      selectedDomain === 'ALL' || node.domain === selectedDomain;
                    const isSelected = selectedNodeId === node.id;
                    const isHovered = hoveredNodeId === node.id;
                    const isConnected =
                      connectedNodeIds.size > 0
                        ? connectedNodeIds.has(node.id)
                        : true;
                    const isDimmed =
                      !isMatchedDomain || (activeFocusId && !isConnected);

                    const badge = getStatusBadge(node);
                    const primaryPath =
                      node.ui_path || node.path || node.api_path || '';
                    const tableCount =
                      (node.tables ? node.tables.length : 0) ||
                      (node.core_tables ? node.core_tables.length : 0);

                    return (
                      <div
                        key={node.id}
                        id={`node-card-${node.id}`}
                        onClick={() => {
                          if (selectedNodeId === node.id) {
                            setSelectedNodeId(null);
                          } else {
                            setSelectedNodeId(node.id);
                          }
                        }}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        className={`group relative rounded-xl border p-3.5 flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-sky-50/90 dark:bg-slate-900 ring-2 ring-blue-500 dark:ring-sky-400 border-transparent shadow-lg -translate-y-0.5 z-30'
                            : isHovered
                              ? 'bg-white dark:bg-slate-900 border-blue-400 dark:border-blue-500 shadow-md -translate-y-0.5 z-20'
                              : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 shadow-2xs'
                        } ${isDimmed ? 'opacity-25 grayscale-[60%]' : 'opacity-100'}`}
                      >
                        {/* Card Top: ID & Status */}
                        <div>
                          <div className="flex items-center justify-between gap-1.5 mb-2">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 truncate">
                              {node.id}
                            </span>
                            <span
                              className={`text-[9.5px] font-mono font-semibold px-2 py-0.5 rounded border ${badge.cls}`}
                            >
                              {badge.label}
                            </span>
                          </div>

                          {/* Node Title */}
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {node.title}
                          </h4>

                          {/* Domain Pill */}
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: layer.color }}
                            />
                            <span className="truncate">{node.domain}</span>
                          </div>

                          {/* Description if present */}
                          {node.desc && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2">
                              {node.desc}
                            </p>
                          )}
                        </div>

                        {/* Card Bottom: File Path & Tech Specs */}
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          {primaryPath && (
                            <div
                              className="font-mono text-[10px] text-blue-600 dark:text-sky-300/90 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 truncate"
                              title={primaryPath}
                            >
                              {primaryPath}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                            <div>
                              {node.protocol ? (
                                <span className="text-amber-600 dark:text-amber-300/90 font-mono text-[10.5px]">
                                  {node.protocol}
                                </span>
                              ) : (
                                <span>
                                  Tables:{' '}
                                  <strong className="text-slate-800 dark:text-slate-200 font-mono">
                                    {tableCount}
                                  </strong>
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onNodeClick) onNodeClick(node);
                              }}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title="ดูรายละเอียดเชิงลึก (Inspect)"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
