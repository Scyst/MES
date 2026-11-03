import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Filter,
  Cpu,
  Globe,
  Database,
  ShieldCheck,
  Workflow,
  ArrowRight,
  Table,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Info,
  Network,
  Activity,
  Server
} from 'lucide-react';
import { BLUEPRINT_DATA } from '../data/blueprintData';
import NodeCard from '../components/NodeCard';
import NodeDetailDrawer from '../components/NodeDetailDrawer';

export default function SystemBlueprintPage() {
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('layers'); // 'layers' | 'pipelines' | 'catalog'
  const [selectedNode, setSelectedNode] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    setDrawerOpen(true);
  };

  // Filtered Nodes
  const filteredNodes = useMemo(() => {
    let result = BLUEPRINT_DATA.nodes;
    if (selectedDomain !== 'ALL') {
      result = result.filter(n => n.domain === selectedDomain);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(q) ||
        (n.desc && n.desc.toLowerCase().includes(q)) ||
        (n.protocol && n.protocol.toLowerCase().includes(q)) ||
        (n.tables && n.tables.some(t => t.toLowerCase().includes(q))) ||
        (n.core_tables && n.core_tables.some(t => t.toLowerCase().includes(q)))
      );
    }
    return result;
  }, [selectedDomain, searchQuery]);

  // Group nodes by Layer
  const nodesByLayer = useMemo(() => {
    const map = {};
    BLUEPRINT_DATA.layers.forEach(l => {
      map[l.id] = [];
    });
    filteredNodes.forEach(node => {
      if (map[node.layer]) {
        map[node.layer].push(node);
      }
    });
    return map;
  }, [filteredNodes]);

  // Filtered Pipelines / Edges
  const filteredEdges = useMemo(() => {
    if (!searchQuery.trim()) return BLUEPRINT_DATA.edges;
    const q = searchQuery.toLowerCase();
    return BLUEPRINT_DATA.edges.filter(e => {
      const fromNode = BLUEPRINT_DATA.nodes.find(n => n.id === e.from);
      const toNode = BLUEPRINT_DATA.nodes.find(n => n.id === e.to);
      return (
        e.label.toLowerCase().includes(q) ||
        (fromNode && fromNode.title.toLowerCase().includes(q)) ||
        (toNode && toNode.title.toLowerCase().includes(q))
      );
    });
  }, [searchQuery]);

  const getNodeTitle = (nodeId) => {
    const found = BLUEPRINT_DATA.nodes.find(n => n.id === nodeId);
    return found ? found.title : nodeId;
  };

  const dbNode = BLUEPRINT_DATA.nodes.find(n => n.id === 'db_sql_server');

  return (
    <div className="w-full space-y-4">
      {/* 1. Header (Standard Industrial Protocol: exact 16px mb-4 margin) */}
      <div className="mes-page-header mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-2xs">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h1 className="mes-page-title text-base sm:text-lg">
              พิมพ์เขียวสถาปัตยกรรมดิจิทัลโรงงาน (MES Master Blueprint)
            </h1>
            <p className="mes-page-subtitle text-xs">
              แผนผังแม่บท 5 เลเยอร์: ฮาร์ดแวร์หน้างาน/IoT, SAP ERP, SQL Server, API Gateway และ 28 โมดูลระบบงาน
            </p>
          </div>
        </div>

        {/* Action Button: View Raw JSON Schema */}
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/Scyst/MES/blob/main/MES/docs/blueprint/MES_SYSTEM_BLUEPRINT.md"
            target="_blank"
            rel="noreferrer"
            className="mes-btn-secondary h-8 px-3 text-xs flex items-center gap-1.5"
            title="เปิดอ่านเอกสารวิศวกรรมบน GitHub"
          >
            <ExternalLink className="w-3.5 h-3.5" /> คู่มือพิมพ์เขียวฉบับเต็ม
          </a>
        </div>
      </div>

      {/* 2. System KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-none">
              {BLUEPRINT_DATA.nodes.length}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
              โหนดระบบทั้งหมด
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-none">
              {BLUEPRINT_DATA.layers.length} ชั้น
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
              เลเยอร์สถาปัตยกรรม
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-none">
              {dbNode?.core_tables?.length || 40}+
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
              ตารางฐานข้อมูลกลาง
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Workflow className="w-4 h-4" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-none">
              {BLUEPRINT_DATA.edges.length} สาย
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
              เส้นทางข้อมูล (Pipelines)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Tab Switcher (Underline style matching System Settings & User Management) */}
      <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 px-1">
        <button
          onClick={() => setActiveTab('layers')}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 transition-colors relative ${
            activeTab === 'layers'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          แผนผัง 5 เลเยอร์สถาปัตยกรรม
        </button>

        <button
          onClick={() => setActiveTab('pipelines')}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 transition-colors relative ${
            activeTab === 'pipelines'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          เส้นทางการไหลของข้อมูล (Pipelines)
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 transition-colors relative ${
            activeTab === 'catalog'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          สารบัญตารางฐานข้อมูล & SP
        </button>
      </div>

      {/* 4. Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Domain Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedDomain('ALL')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedDomain === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-blue-600'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            ทั้งหมด (All)
          </button>
          {BLUEPRINT_DATA.domains.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDomain(d.id)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedDomain === d.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {d.name_th}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาโหนด, ตาราง, หรือโปรโตคอล..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* 5. TAB VIEW 1: Layered Architecture Matrix */}
      {activeTab === 'layers' && (
        <div className="space-y-6">
          {BLUEPRINT_DATA.layers.map(layer => {
            const layerNodes = nodesByLayer[layer.id] || [];
            if (layerNodes.length === 0 && (selectedDomain !== 'ALL' || searchQuery)) return null;

            return (
              <div 
                key={layer.id} 
                className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80"
              >
                {/* Layer Heading */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: layer.color }} 
                    />
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                      {layer.id.replace(/^[L0-9]+_/, '')} — {layer.name_th}
                    </h3>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal hidden sm:inline">
                      ({layer.name_en})
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                    {layerNodes.length} โหนด
                  </span>
                </div>

                {/* Node Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {layerNodes.map(node => (
                    <NodeCard
                      key={node.id}
                      node={node}
                      onClick={handleNodeClick}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. TAB VIEW 2: Data Pipelines & Flows */}
      {activeTab === 'pipelines' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                การไหลของข้อมูลระหว่างเลเยอร์ (Data Pipelines & Integrations)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                แสดงทิศทางการส่งข้อมูลจากเซนเซอร์ IoT, SAP ERP, ฐานข้อมูล และแอปพลิเคชัน
              </p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
              {filteredEdges.length} รายการ
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {filteredEdges.map((edge, idx) => {
              const fromNode = BLUEPRINT_DATA.nodes.find(n => n.id === edge.from);
              const toNode = BLUEPRINT_DATA.nodes.find(n => n.id === edge.to);

              return (
                <div 
                  key={idx}
                  className="p-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                >
                  {/* From Node */}
                  <div 
                    onClick={() => fromNode && handleNodeClick(fromNode)}
                    className="flex-1 min-w-[200px] cursor-pointer group"
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">แหล่งข้อมูลต้นทาง (Source)</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                      {fromNode?.title || edge.from}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">{fromNode?.layer}</span>
                  </div>

                  {/* Flow Arrow & Action Label */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 self-stretch md:self-auto justify-center">
                    <span className="font-semibold text-[11px] text-blue-800 dark:text-blue-300 text-center">
                      {edge.label}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  </div>

                  {/* To Node */}
                  <div 
                    onClick={() => toNode && handleNodeClick(toNode)}
                    className="flex-1 min-w-[200px] cursor-pointer group md:text-right"
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">ปลายทางรับข้อมูล (Target)</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                      {toNode?.title || edge.to}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">{toNode?.layer}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. TAB VIEW 3: Database Catalog */}
      {activeTab === 'catalog' && dbNode && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tables Column (2/3) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  ตารางฐานข้อมูลหลักใน IIOT_TOOLBOX ({dbNode.core_tables.length} ตาราง)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">SQL Server 2016</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {dbNode.core_tables.map(tbl => {
                // Find modules using this table
                const usingModules = BLUEPRINT_DATA.nodes.filter(n => n.tables && n.tables.includes(tbl));

                return (
                  <div 
                    key={tbl}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-emerald-300 transition-colors"
                  >
                    <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 block">
                      dbo.{tbl}
                    </span>
                    {usingModules.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {usingModules.map(m => (
                          <span 
                            key={m.id}
                            onClick={() => handleNodeClick(m)}
                            className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer hover:text-blue-600"
                          >
                            {m.title.split(' ')[0]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stored Procedures Column (1/3) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Stored Procedures ({dbNode.stored_procedures.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">Atomic Logic</span>
            </div>

            <div className="space-y-2">
              {dbNode.stored_procedures.map(sp => (
                <div 
                  key={sp}
                  className="p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20"
                >
                  <span className="font-mono text-xs font-bold text-purple-800 dark:text-purple-300 block truncate">
                    dbo.{sp}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    T-SQL Transaction Procedure
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. Node Detail Drawer */}
      <NodeDetailDrawer
        node={selectedNode}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        allNodes={BLUEPRINT_DATA.nodes}
        edges={BLUEPRINT_DATA.edges}
      />
    </div>
  );
}
