import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layers,
  Search,
  Plus,
  RefreshCw,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  Copy,
  Calculator,
  Download,
  Trash2,
  Edit2,
  Package,
  Calendar,
  AlertTriangle,
  Lock,
  History,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { systemSettingsApi } from '../../../shared/services/systemSettingsApi';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';
import BomComponentModal from './BomComponentModal';
import BomEcnModal from './BomEcnModal';
import BomCopyModal from './BomCopyModal';
import ItemAuditModal from './ItemAuditModal';

const normalizeFg = (fg) => {
  if (!fg) return null;
  return {
    ...fg,
    item_id: fg.item_id || fg.fg_item_id,
    sap_no: fg.sap_no || fg.fg_sap_no || '',
    part_no: fg.part_no || fg.fg_part_no || '',
    part_description: fg.part_description || fg.fg_part_description || '',
    planned_output: fg.planned_output != null ? fg.planned_output : 0,
    has_bom: fg.has_bom != null ? Number(fg.has_bom) : 1,
  };
};

export default function BomManagerTab({ lines = [], models = [] }) {
  const [fgsWithBom, setFgsWithBom] = useState([]);
  const [selectedFg, setSelectedFg] = useState(null);
  const [fgSearch, setFgSearch] = useState('');
  const [componentSearch, setComponentSearch] = useState('');
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState('');
  const [components, setComponents] = useState([]);
  const [loadingFgs, setLoadingFgs] = useState(true);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [rollingCost, setRollingCost] = useState(false);

  // Modals
  const [compModalOpen, setCompModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState(null);
  const [ecnModalOpen, setEcnModalOpen] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const { showToast } = useToast();
  const { confirm } = useConfirm();

  // Load all FGs
  const fetchFgs = useCallback(async () => {
    setLoadingFgs(true);
    try {
      const res = await systemSettingsApi.getFgsWithBom();
      if (res && res.success) {
        const list = (res.data || [])
          .map(normalizeFg)
          .filter((fg) => fg.material_type !== 'RM' && !fg.sap_no?.startsWith('10') && !fg.sap_no?.startsWith('20'));
        setFgsWithBom(list);
        if (list.length > 0 && !selectedFg) {
          const defaultItem = list.find((it) => it.has_bom === 1) || list[0];
          setSelectedFg(defaultItem);
        }
      } else {
        showToast(res?.message || 'ไม่สามารถโหลดรายชื่อ FG ได้', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการโหลดรายการสินค้า FG: ' + err.message, 'error');
    } finally {
      setLoadingFgs(false);
    }
  }, [selectedFg, showToast]);

  useEffect(() => {
    fetchFgs();
  }, [fetchFgs]);

  // Load versions whenever selectedFg changes
  useEffect(() => {
    const fgId = selectedFg?.item_id || selectedFg?.fg_item_id;
    if (fgId) {
      systemSettingsApi.getBomVersions(fgId).then((res) => {
        if (res && res.success) {
          const vList = res.data || [];
          setVersions(vList);
          const activeV = vList.find((v) => v.bom_status === 'ACTIVE') || vList[0];
          setSelectedVersion(activeV?.bom_version != null ? String(activeV.bom_version) : '');
        } else {
          setVersions([]);
          setSelectedVersion('');
        }
      });
    } else {
      setVersions([]);
      setSelectedVersion('');
    }
  }, [selectedFg]);

  // Load components whenever selectedFg or selectedVersion changes
  const fetchComponents = useCallback(async () => {
    const fgId = selectedFg?.item_id || selectedFg?.fg_item_id;
    if (!fgId) return;

    setLoadingComponents(true);
    try {
      const res = await systemSettingsApi.getBomComponents(fgId, selectedVersion);
      if (res && res.success) {
        setComponents(res.data || []);
      } else {
        showToast(res?.message || 'ไม่สามารถโหลดชิ้นส่วน BOM ได้', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
      setLoadingComponents(false);
    }
  }, [selectedFg, selectedVersion, showToast]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  // Filter FGs list on the left (Strictly exclude RM / 10xxxxxx / 20xxxxxx from requiring BOM)
  const filteredFgs = useMemo(() => {
    let list = fgsWithBom.filter(
      (fg) => fg.material_type !== 'RM' && !fg.sap_no?.startsWith('10') && !fg.sap_no?.startsWith('20')
    );
    if (!fgSearch.trim()) return list;
    const term = fgSearch.toLowerCase();
    return list.filter(
      (fg) =>
        fg.sap_no?.toLowerCase().includes(term) ||
        fg.part_no?.toLowerCase().includes(term) ||
        fg.part_description?.toLowerCase().includes(term)
    );
  }, [fgsWithBom, fgSearch]);

  const currentVersionMeta = useMemo(() => {
    return versions.find((v) => String(v.bom_version) === String(selectedVersion)) || null;
  }, [versions, selectedVersion]);

  const isCurrentVersionActive = currentVersionMeta?.bom_status === 'ACTIVE';

  // Filter components on the right
  const filteredComponents = useMemo(() => {
    if (!componentSearch.trim()) return components;
    const term = componentSearch.toLowerCase();
    return components.filter(
      (c) =>
        (c.component_sap_no && c.component_sap_no.toLowerCase().includes(term)) ||
        (c.sap_no && c.sap_no.toLowerCase().includes(term)) ||
        (c.component_description && c.component_description.toLowerCase().includes(term)) ||
        (c.part_description && c.part_description.toLowerCase().includes(term))
    );
  }, [components, componentSearch]);

  // Calculated total estimated material cost
  const totalRolledCost = useMemo(() => {
    return components.reduce((sum, c) => {
      const qty = Number(c.quantity_required) || 0;
      const price = Number(c.StandardPrice || c.Cost_Total || 0);
      return sum + qty * price;
    }, 0);
  }, [components]);

  // Handlers
  const handleSaveComponent = async (data) => {
    try {
      const res = data.bom_id
        ? await systemSettingsApi.updateBomComponent(data)
        : await systemSettingsApi.addBomComponent(data);

      if (res && res.success) {
        showToast(res.message || 'บันทึกชิ้นส่วนเรียบร้อย', 'success');
        fetchComponents();
      } else {
        showToast(res?.message || 'บันทึกชิ้นส่วนไม่สำเร็จ', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
  };

  const handleDeleteComponent = async (comp) => {
    const confirmed = await confirm({
      title: 'ยืนยันลบชิ้นส่วน',
      message: `คุณต้องการลบชิ้นส่วน "${comp.component_sap_no || comp.sap_no}" ออกจากสูตร Rev ${selectedVersion} ใช่หรือไม่?`,
      type: 'warning',
      confirmText: 'ลบชิ้นส่วน',
    });

    if (confirmed) {
      try {
        const res = await systemSettingsApi.deleteBomComponent(comp.bom_id);
        if (res && res.success) {
          showToast(res.message || 'ลบชิ้นส่วนเรียบร้อย', 'success');
          fetchComponents();
        } else {
          showToast(res?.message || 'ลบชิ้นส่วนไม่สำเร็จ', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      }
    }
  };

  const handleRollupCost = async () => {
    const fgId = selectedFg?.item_id || selectedFg?.fg_item_id;
    if (!fgId) return;

    setRollingCost(true);
    try {
      const res = await systemSettingsApi.rollupBomCost(fgId, selectedVersion);
      if (res && res.success) {
        showToast(res.message || 'คำนวณและปรับปรุงต้นทุนกลับสู่ Item Master สำเร็จ', 'success');
        fetchComponents();
      } else {
        showToast(res?.message || 'คำนวณต้นทุนไม่สำเร็จ', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
      setRollingCost(false);
    }
  };

  const handleExportBomExcel = () => {
    if (!components.length) {
      showToast('ไม่มีข้อมูลชิ้นส่วนสำหรับส่งออก', 'warning');
      return;
    }
    try {
      const data = components.map((c) => ({
        'FG SAP No.': selectedFg.sap_no,
        'FG Description': selectedFg.part_description,
        'BOM Version': `Rev ${selectedVersion}`,
        'Component SAP No.': c.component_sap_no || c.sap_no,
        'Component Description': c.component_description || c.part_description,
        Type: c.material_type,
        'Quantity (Req)': c.quantity_required,
        'Est. Cost (THB)': (Number(c.quantity_required || 0) * Number(c.StandardPrice || 0)).toFixed(4),
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'BOM');
      XLSX.writeFile(wb, `BOM_${selectedFg.sap_no}_Rev${selectedVersion}.xlsx`);
      showToast('ส่งออก BOM Excel เรียบร้อย', 'success');
    } catch (err) {
      showToast('ส่งออกล้มเหลว: ' + err.message, 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
      {/* Left Sidebar: Finished Goods List (Matches Legacy Image 8) */}
      <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col h-[750px]">
        {/* Top Header & Search */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              สินค้าสำเร็จรูป (FG)
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold">
              {filteredFgs.length}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหา FG SAP No..."
              value={fgSearch}
              onChange={(e) => setFgSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* FG Items List */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
          {loadingFgs ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
              กำลังโหลดรายการ FG...
            </div>
          ) : filteredFgs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">ไม่พบรายการสินค้า</div>
          ) : (
            filteredFgs.map((fg) => {
              const fgId = fg.item_id || fg.fg_item_id;
              const selectedId = selectedFg?.item_id || selectedFg?.fg_item_id;
              const isSelected = selectedId === fgId;
              const hasNoBom = fg.has_bom === 0;

              return (
                <button
                  key={fgId || fg.sap_no}
                  onClick={() => setSelectedFg(fg)}
                  className={`w-full text-left p-3 transition-all flex items-start justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`font-mono font-bold text-xs ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {fg.sap_no}
                      </span>
                      {hasNoBom && (
                        <span title="ยังไม่มีสูตรผลิต (NO BOM)">
                          <AlertCircle className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-rose-500'}`} />
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] truncate mb-1 ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {fg.part_description || fg.part_no || '-'}
                    </p>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className={isSelected ? 'text-blue-200 font-medium' : 'text-slate-400'}>
                        ⚡ UPH: {fg.planned_output || 0}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : fg.material_type === 'FG'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {fg.material_type || 'FG'}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Main Panel: Selected FG BOM Details (Matches Legacy Image 8) */}
      <div className="lg:col-span-3 space-y-3">
        {selectedFg ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col h-[750px]">
            {/* Header (Top Info & Action Buttons) */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-base font-bold font-mono text-slate-900 dark:text-white">
                    {selectedFg.sap_no}
                  </h2>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {selectedFg.part_description || selectedFg.part_no || '-'}
                  </span>
                  <span>|</span>
                  <span>Standard UPH: <strong>{selectedFg.planned_output || '-'}</strong></span>
                  <span>|</span>

                  {/* Rev selector dropdown */}
                  {versions.length > 0 ? (
                    <select
                      value={selectedVersion}
                      onChange={(e) => setSelectedVersion(e.target.value)}
                      className="px-2 py-0.5 text-xs font-bold rounded border border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {versions.map((v) => (
                        <option key={v.bom_version} value={v.bom_version}>
                          Rev {v.bom_version} {v.bom_status ? `(${v.bom_status})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px]">
                      No Rev
                    </span>
                  )}

                  {/* Status badge */}
                  {currentVersionMeta && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isCurrentVersionActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-slate-900'
                      }`}
                    >
                      {currentVersionMeta.bom_status}
                    </span>
                  )}

                  {currentVersionMeta?.ecn_number && (
                    <span className="text-[11px] font-mono text-slate-500">
                      ECN: {currentVersionMeta.ecn_number}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons (Matches Image 8) */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setEcnModalOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-400 hover:bg-amber-500 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="สร้างสูตรเวอร์ชันใหม่ (ECN)"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  สร้าง Revision ใหม่
                </button>

                <button
                  onClick={handleRollupCost}
                  disabled={rollingCost || components.length === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  title="อัปเดตต้นทุนรวมกลับไปที่ Item Master"
                >
                  <Calculator className={`w-3.5 h-3.5 ${rollingCost ? 'animate-spin' : ''}`} />
                  Update Cost
                </button>

                <button
                  onClick={() => setCopyModalOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 border border-sky-300 dark:border-sky-800 rounded-lg transition-colors cursor-pointer"
                  title="คัดลอกสูตรไปยัง FG อื่น"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Clone
                </button>

                <button
                  onClick={() => setHistoryModalOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="ดูประวัติการแก้ไข"
                >
                  <History className="w-3.5 h-3.5" />
                  History
                </button>

                <button
                  onClick={handleExportBomExcel}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors"
                  title="Export Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {!isCurrentVersionActive && (
                  <button
                    onClick={() => {
                      setEditingComp(null);
                      setCompModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + เพิ่มชิ้นส่วน
                  </button>
                )}
              </div>
            </div>

            {/* Component Search Input */}
            <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชิ้นส่วนในสูตร..."
                  value={componentSearch}
                  onChange={(e) => setComponentSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Components Table (Matches Legacy Image 8 Schema) */}
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-xs text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Component SAP No.</th>
                    <th className="py-2.5 px-3">Description</th>
                    {/* Quantity (Req) with yellow background matching Image 8 */}
                    <th className="py-2.5 px-3 text-center bg-amber-100/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold border-x border-amber-200 dark:border-amber-900 min-w-[130px]">
                      Quantity (Req)
                    </th>
                    <th className="py-2.5 px-3 text-right">Est. Cost (THB)</th>
                    <th className="py-2.5 px-3 text-center w-24">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingComponents ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                        กำลังโหลดชิ้นส่วนในสูตร...
                      </td>
                    </tr>
                  ) : filteredComponents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        {components.length === 0
                          ? 'ยังไม่มีรายการชิ้นส่วนในสูตรการผลิตนี้'
                          : 'ไม่พบชิ้นส่วนที่ตรงกับคำค้นหา'}
                      </td>
                    </tr>
                  ) : (
                    filteredComponents.map((c) => {
                      const qty = Number(c.quantity_required) || 0;
                      const unitPrice = Number(c.StandardPrice || 0);
                      const estCost = qty * unitPrice;

                      return (
                        <tr
                          key={c.bom_id || `${c.component_item_id}-${c.bom_version}`}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Component SAP No. */}
                          <td className="py-2 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {c.component_sap_no || c.sap_no}
                          </td>

                          {/* Description */}
                          <td className="py-2 px-3 text-slate-800 dark:text-slate-200">
                            {c.component_description || c.part_description || '-'}
                          </td>

                          {/* Quantity (Req) with yellow background matching Image 8 */}
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-900 dark:text-white bg-amber-50/50 dark:bg-amber-950/20 border-x border-amber-100 dark:border-amber-900/40">
                            {qty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                          </td>

                          {/* Est. Cost (THB) */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ฿{estCost.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </td>

                          {/* Action */}
                          <td className="py-2 px-3 text-center">
                            {isCurrentVersionActive ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                <Lock className="w-3 h-3" /> Locked
                              </span>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingComp(c);
                                    setCompModalOpen(true);
                                  }}
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="แก้ไข"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteComponent(c)}
                                  className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                                  title="ลบ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Footer (Matches Legacy Image 8 Total Estimated Material Cost) */}
            <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                จำนวนชิ้นส่วนทั้งหมด: <strong>{components.length}</strong> รายการ
              </span>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600 dark:text-slate-300">
                  Total Estimated Material Cost:
                </span>
                <span className="font-mono font-extrabold text-base text-rose-600 dark:text-rose-400">
                  ฿{totalRolledCost.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            กรุณาเลือกสินค้าสำเร็จรูป (FG) จากรายการด้านซ้ายเพื่อจัดการสูตรการผลิต (BOM)
          </div>
        )}
      </div>

      {/* Modals */}
      <BomComponentModal
        isOpen={compModalOpen}
        onClose={() => setCompModalOpen(false)}
        onSave={handleSaveComponent}
        component={editingComp}
        fgItem={selectedFg}
        bomVersion={selectedVersion}
        lines={lines}
        models={models}
      />

      <BomEcnModal
        isOpen={ecnModalOpen}
        onClose={() => setEcnModalOpen(false)}
        onSave={async (data) => {
          const res = await systemSettingsApi.createBomRevision(data);
          if (res?.success) {
            showToast(res.message || 'สร้าง Revision ใหม่สำเร็จ', 'success');
            const fgId = selectedFg?.item_id || selectedFg?.fg_item_id;
            const vRes = await systemSettingsApi.getBomVersions(fgId);
            if (vRes?.success) {
              setVersions(vRes.data || []);
              setSelectedVersion(String(res.data?.new_version || '2'));
            }
          } else {
            showToast(res?.message || 'สร้าง Revision ไม่สำเร็จ', 'error');
          }
        }}
        fgItem={selectedFg}
      />

      <BomCopyModal
        isOpen={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        onSave={async (data) => {
          const res = await systemSettingsApi.copyBom(data);
          if (res?.success) {
            showToast(res.message || 'คัดลอกสูตรการผลิตสำเร็จ', 'success');
            fetchFgs();
          } else {
            showToast(res?.message || 'คัดลอกไม่สำเร็จ', 'error');
          }
        }}
        sourceFg={selectedFg}
        lines={lines}
        models={models}
      />

      <ItemAuditModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        item={selectedFg}
      />
    </div>
  );
}
