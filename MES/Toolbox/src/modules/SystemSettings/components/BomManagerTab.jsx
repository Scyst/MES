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
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { systemSettingsApi } from '../../../shared/services/systemSettingsApi';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';
import DataTable from '../../../shared/components/DataTable';
import BomComponentModal from './BomComponentModal';
import BomEcnModal from './BomEcnModal';
import BomCopyModal from './BomCopyModal';

const STATUS_BADGES = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  DRAFT: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  OBSOLETE: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};

export default function BomManagerTab({ lines = [], models = [] }) {
  const [fgsWithBom, setFgsWithBom] = useState([]);
  const [selectedFg, setSelectedFg] = useState(null);
  const [fgSearch, setFgSearch] = useState('');
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

  const { showToast } = useToast();
  const { confirm } = useConfirm();

  // Load all FGs that have BOM
  const fetchFgs = useCallback(async () => {
    setLoadingFgs(true);
    try {
      const res = await systemSettingsApi.getFgsWithBom();
      if (res && res.success) {
        const list = res.data || [];
        setFgsWithBom(list);
        if (list.length > 0 && !selectedFg) {
          setSelectedFg(list[0]);
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
    if (selectedFg?.item_id) {
      systemSettingsApi.getBomVersions(selectedFg.item_id).then((res) => {
        if (res && res.success) {
          const vList = res.data || [];
          setVersions(vList);
          // Auto select active or first version
          const activeV = vList.find((v) => v.bom_status === 'ACTIVE') || vList[0];
          setSelectedVersion(activeV?.bom_version || 'V1');
        }
      });
    } else {
      setVersions([]);
      setSelectedVersion('');
    }
  }, [selectedFg]);

  // Load components whenever selectedFg or selectedVersion changes
  const fetchComponents = useCallback(async () => {
    if (!selectedFg?.item_id) return;
    setLoadingComponents(true);
    try {
      const res = await systemSettingsApi.getBomComponents(selectedFg.item_id, selectedVersion);
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

  // Filter FGs list
  const filteredFgs = useMemo(() => {
    if (!fgSearch.trim()) return fgsWithBom;
    const term = fgSearch.toLowerCase();
    return fgsWithBom.filter(
      (fg) =>
        fg.sap_no?.toLowerCase().includes(term) ||
        fg.part_no?.toLowerCase().includes(term) ||
        fg.part_description?.toLowerCase().includes(term)
    );
  }, [fgsWithBom, fgSearch]);

  const currentVersionMeta = useMemo(() => {
    return versions.find((v) => v.bom_version === selectedVersion) || null;
  }, [versions, selectedVersion]);

  // Calculated totals
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
      message: `คุณต้องการลบชิ้นส่วน "${comp.component_sap_no || comp.sap_no}" ออกจากสูตร ${selectedVersion} ใช่หรือไม่?`,
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
    if (!selectedFg?.item_id) return;
    setRollingCost(true);
    try {
      const res = await systemSettingsApi.rollupBomCost(selectedFg.item_id, selectedVersion);
      if (res && res.success) {
        showToast(res.message || 'คำนวณและปรับปรุงต้นทุนสำเร็จ', 'success');
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

  const handleApproveRevision = async () => {
    const confirmed = await confirm({
      title: 'ยืนยันอนุมัติสูตรการผลิต (Approve Revision)',
      message: `คุณต้องการอนุมัติสูตรเวอร์ชัน ${selectedVersion} ให้เป็น ACTIVE (สูตรที่ใช้ผลิตจริง) ใช่หรือไม่? เวอร์ชันก่อนหน้าจะถูกปรับเป็น OBSOLETE อัตโนมัติ`,
      type: 'info',
      confirmText: 'อนุมัติสูตรผลิต',
    });

    if (confirmed) {
      try {
        const res = await systemSettingsApi.approveBomRevision(selectedFg.item_id, selectedVersion);
        if (res && res.success) {
          showToast(res.message || 'อนุมัติสูตรสำเร็จ', 'success');
          // Reload versions & components
          systemSettingsApi.getBomVersions(selectedFg.item_id).then((r) => {
            if (r?.success) setVersions(r.data || []);
          });
          fetchComponents();
        } else {
          showToast(res?.message || 'อนุมัติสูตรไม่สำเร็จ', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      }
    }
  };

  const handleDeleteFullBom = async () => {
    const confirmed = await confirm({
      title: 'ยืนยันลบสูตรทั้งหมด (Delete BOM Version)',
      message: `คุณต้องการลบสูตรเวอร์ชัน "${selectedVersion}" ของสินค้า "${selectedFg.sap_no}" ทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      type: 'danger',
      confirmText: 'ลบสูตรทั้งหมด',
    });

    if (confirmed) {
      try {
        const res = await systemSettingsApi.deleteFullBom(selectedFg.item_id, selectedVersion);
        if (res && res.success) {
          showToast(res.message || 'ลบสูตรเรียบร้อย', 'success');
          fetchFgs();
        } else {
          showToast(res?.message || 'ลบสูตรไม่สำเร็จ', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      }
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
        'BOM Version': selectedVersion,
        'Component SAP No.': c.component_sap_no || c.sap_no,
        'Component Description': c.component_description || c.part_description,
        Type: c.material_type,
        'Usage Qty': c.quantity_required,
        'Unit Cost (THB)': c.StandardPrice,
        'Total Cost (THB)': (Number(c.quantity_required) || 0) * (Number(c.StandardPrice) || 0),
        Line: c.line || 'ALL',
        Model: c.model || 'ALL',
        Memo: c.memo || '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'BOM');
      XLSX.writeFile(wb, `BOM_${selectedFg.sap_no}_${selectedVersion}.xlsx`);
      showToast('ส่งออก BOM Excel เรียบร้อย', 'success');
    } catch (err) {
      showToast('ส่งออกล้มเหลว: ' + err.message, 'error');
    }
  };

  const columns = [
    {
      key: 'component_sap_no',
      label: 'Component SAP No.',
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-white">
          <Layers className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>{c.component_sap_no || c.sap_no}</span>
        </div>
      ),
    },
    {
      key: 'component_description',
      label: 'Description',
      render: (c) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-xs block">
          {c.component_description || c.part_description || '-'}
        </span>
      ),
    },
    {
      key: 'material_type',
      label: 'Type',
      render: (c) => (
        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {c.material_type || 'RM'}
        </span>
      ),
    },
    {
      key: 'quantity_required',
      label: 'Usage Qty',
      sortable: true,
      render: (c) => (
        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
          {Number(c.quantity_required).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
        </span>
      ),
    },
    {
      key: 'StandardPrice',
      label: 'Unit Cost (THB)',
      render: (c) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          {c.StandardPrice ? Number(c.StandardPrice).toFixed(4) : '-'}
        </span>
      ),
    },
    {
      key: 'line_total_cost',
      label: 'Total Cost',
      render: (c) => {
        const total = (Number(c.quantity_required) || 0) * (Number(c.StandardPrice) || 0);
        return (
          <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
            {total > 0 ? total.toFixed(4) : '-'}
          </span>
        );
      },
    },
    {
      key: 'line_model',
      label: 'Line / Model',
      render: (c) => (
        <span className="text-[11px] text-slate-500">
          {c.line || 'ALL'} / {c.model || 'ALL'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (c) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setEditingComp(c);
              setCompModalOpen(true);
            }}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="แก้ไขชิ้นส่วน"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteComponent(c)}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="ลบชิ้นส่วน"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* Left Sidebar: Finished Goods List */}
      <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col max-h-[750px]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              สินค้าสำเร็จรูป (FG)
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-semibold">
              {filteredFgs.length}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหา FG..."
              value={fgSearch}
              onChange={(e) => setFgSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
          {loadingFgs ? (
            <div className="p-8 text-center text-xs text-slate-400">กำลังโหลดรายการ FG...</div>
          ) : filteredFgs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">ไม่พบรายการสินค้า</div>
          ) : (
            filteredFgs.map((fg) => {
              const isSelected = selectedFg?.item_id === fg.item_id;
              return (
                <button
                  key={fg.item_id}
                  onClick={() => setSelectedFg(fg)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <Package className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
                      {fg.sap_no}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{fg.part_description || fg.part_no || '-'}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Main Panel: Selected FG BOM Details */}
      <div className="lg:col-span-3 space-y-4">
        {selectedFg ? (
          <>
            {/* Header Box */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                      {selectedFg.sap_no}
                    </h2>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {selectedFg.material_type || 'FG'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedFg.part_description} ({selectedFg.part_no || 'No Part No'})
                  </p>
                </div>

                {/* Version switcher & Status */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Version:</span>
                    <select
                      value={selectedVersion}
                      onChange={(e) => setSelectedVersion(e.target.value)}
                      className="px-3 py-1.5 text-xs font-bold font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {versions.map((v) => (
                        <option key={v.bom_version} value={v.bom_version}>
                          {v.bom_version} [{v.bom_status || 'ACTIVE'}]
                        </option>
                      ))}
                    </select>
                  </div>

                  {currentVersionMeta?.bom_status && (
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                        STATUS_BADGES[currentVersionMeta.bom_status] || STATUS_BADGES.ACTIVE
                      }`}
                    >
                      {currentVersionMeta.bom_status}
                    </span>
                  )}

                  {currentVersionMeta?.ecn_number && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800">
                      <GitBranch className="w-3.5 h-3.5" />
                      {currentVersionMeta.ecn_number}
                    </span>
                  )}
                </div>
              </div>

              {/* Toolbar Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingComp(null);
                      setCompModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มชิ้นส่วน (Add Component)
                  </button>

                  <button
                    onClick={handleRollupCost}
                    disabled={rollingCost}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors"
                  >
                    <Calculator className={`w-3.5 h-3.5 ${rollingCost ? 'animate-spin' : ''}`} />
                    Rollup Standard Cost
                  </button>

                  <button
                    onClick={() => setEcnModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 rounded-xl border border-amber-200 dark:border-amber-800 transition-colors"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    สร้าง Revision (ECN)
                  </button>

                  {currentVersionMeta?.bom_status === 'DRAFT' && (
                    <button
                      onClick={handleApproveRevision}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      อนุมัติสูตร (Approve)
                    </button>
                  )}

                  <button
                    onClick={() => setCopyModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 rounded-xl border border-purple-200 dark:border-purple-800 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    คัดลอกสูตร (Copy BOM)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportBomExcel}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    title="Export BOM Excel"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDeleteFullBom}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    title="ลบสูตรเวอร์ชันนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Components DataTable */}
            <DataTable
              columns={columns}
              rows={components}
              data={components}
              rowKey={(c) => c.bom_id || `${c.component_item_id}-${c.bom_version}`}
              loading={loadingComponents}
              defaultSortKey="component_sap_no"
              emptyMessage="ยังไม่มีรายการชิ้นส่วนในสูตรการผลิตนี้ คลิก 'เพิ่มชิ้นส่วน' เพื่อเริ่มกำหนดสูตร"
            />

            {/* Bottom Summary Bar */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
              <span className="text-slate-500">
                จำนวนชิ้นส่วนทั้งหมด:{' '}
                <strong className="text-slate-900 dark:text-white">{components.length}</strong> รายการ
              </span>
              <span className="text-slate-500">
                ต้นทุนรวมจากการคำนวณ (Rolled-up Cost):{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                  {totalRolledCost.toFixed(4)} THB
                </strong>
              </span>
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            กรุณาเลือกสินค้าสำเร็จรูป (FG) จากรายการด้านซ้ายเพื่อดูหรือแก้ไขสูตร BOM
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
            // Refresh versions
            const vRes = await systemSettingsApi.getBomVersions(selectedFg.item_id);
            if (vRes?.success) {
              setVersions(vRes.data || []);
              setSelectedVersion(res.data?.new_version || 'V2');
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
    </div>
  );
}

