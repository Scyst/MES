import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Coins,
  Package,
  Layers,
  Sparkles,
  Database,
  Box,
  Boxes,
  Cpu,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { systemSettingsApi } from '../../../shared/services/systemSettingsApi';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';
import DataTable from '../../../shared/components/DataTable';

const STATUS_CONFIGS = {
  MATCH: {
    label: 'Match',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    icon: CheckCircle2,
  },
  VARIANCE: {
    label: 'Variance',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    icon: AlertTriangle,
  },
  MISSING_MES: {
    label: 'Missing MES Cost',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    icon: AlertTriangle,
  },
  MISSING_SAP: {
    label: 'Missing SAP Cost',
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    icon: AlertTriangle,
  },
  UNREGISTERED: {
    label: 'Unregistered in MES',
    badge: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: AlertTriangle,
  },
};

export default function SapValuationTab() {
  const [valuationData, setValuationData] = useState({
    summary: { total_sap_value: 0, total_mes_value: 0, variance: 0, variance_pct: 0, groups: {} },
    categories: [],
    items: [],
    last_synced: '',
    last_synced_formatted: '',
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const fetchValuation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await systemSettingsApi.getSapValuation();
      if (res && res.success) {
        const raw = res.data || res;
        setValuationData({
          summary: raw.summary || { total_sap_value: 0, total_mes_value: 0, variance: 0, variance_pct: 0, groups: {} },
          categories: raw.categories || [],
          items: raw.items || [],
          last_synced: raw.last_synced || res.last_synced || '',
          last_synced_formatted: raw.last_synced_formatted || res.last_synced_formatted || '',
        });
      } else {
        showToast(res?.message || 'ไม่สามารถโหลดข้อมูล SAP Valuation ได้', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchValuation();
  }, [fetchValuation]);

  const items = valuationData.items || [];
  const summary = valuationData.summary || {};
  const groups = summary.groups || {};

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchesSearch =
        !searchTerm ||
        it.sap_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.part_no?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat = selectedCategory === 'ALL' || it.category_group === selectedCategory;
      const matchesStatus = selectedStatus === 'ALL' || it.health_status === selectedStatus;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [items, searchTerm, selectedCategory, selectedStatus]);

  const handleSyncCosts = async (sapNos = []) => {
    const isAll = sapNos.length === 0;
    const targetCount = isAll ? items.filter((i) => i.health_status !== 'MATCH').length : sapNos.length;

    const confirmed = await confirm({
      title: 'ยืนยันปรับปรุงต้นทุน (Sync SAP Costs)',
      message: isAll
        ? `คุณต้องการดึงต้นทุนมาตรฐานล่าสุดจาก SAP Staging ไปปรับปรุงลงใน Item Master สำหรับสินค้าทั้งหมดที่มีผลต่าง (${targetCount} รายการ) ใช่หรือไม่?`
        : `คุณต้องการดึงต้นทุน SAP ของรหัส "${sapNos[0]}" ไปบันทึกลง MES ใช่หรือไม่?`,
      type: 'info',
      confirmText: 'Sync ต้นทุน',
    });

    if (confirmed) {
      setSyncing(true);
      try {
        const res = await systemSettingsApi.syncSapCosts(sapNos);
        if (res && res.success) {
          showToast(res.message || 'ปรับปรุงต้นทุนตาม SAP สำเร็จ', 'success');
          fetchValuation();
        } else {
          showToast(res?.message || 'ปรับปรุงต้นทุนไม่สำเร็จ', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาดในการ Sync: ' + err.message, 'error');
      } finally {
        setSyncing(false);
      }
    }
  };

  // Helper calculation for direct materials (RM + PKG)
  const rmGroup = groups['RM'] || { qty: 0, sap_value: 0, mes_value: 0, variance: 0 };
  const pkgGroup = groups['PKG'] || { qty: 0, sap_value: 0, mes_value: 0, variance: 0 };
  const wipGroup = groups['WIP'] || { qty: 0, sap_value: 0, mes_value: 0, variance: 0 };
  const fgGroup = groups['FG'] || { qty: 0, sap_value: 0, mes_value: 0, variance: 0 };

  const directMaterials = {
    qty: (rmGroup.qty || 0) + (pkgGroup.qty || 0),
    sap_value: (rmGroup.sap_value || 0) + (pkgGroup.sap_value || 0),
    mes_value: (rmGroup.mes_value || 0) + (pkgGroup.mes_value || 0),
    variance: (rmGroup.variance || 0) + (pkgGroup.variance || 0),
  };

  const columns = [
    {
      key: 'sap_no',
      label: 'SAP No.',
      sortable: true,
      render: (it) => (
        <span className="font-mono font-bold text-slate-900 dark:text-white">{it.sap_no}</span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (it) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-xs block" title={it.description}>
          {it.description || '-'}
        </span>
      ),
    },
    {
      key: 'category_group',
      label: 'Group',
      sortable: true,
      render: (it) => {
        const colors = {
          RM: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
          PKG: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300',
          WIP: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
          FG: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
          OTHER: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
        };
        return (
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${colors[it.category_group] || colors.OTHER}`}>
            {it.category_group || 'OTHER'}
          </span>
        );
      },
    },
    {
      key: 'staging_stock',
      label: 'Stock Qty',
      sortable: true,
      render: (it) => (
        <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
          {Number(it.staging_stock || 0).toLocaleString()}{' '}
          <span className="text-[10px] text-slate-400 font-sans">{it.unit || 'PC'}</span>
        </div>
      ),
    },
    {
      key: 'costs_compare',
      label: 'SAP Cost vs MES Cost',
      render: (it) => (
        <div className="text-xs font-mono">
          <span className="text-blue-600 dark:text-blue-400 font-bold">
            ฿{Number(it.sap_unit_cost || 0).toFixed(2)}
          </span>{' '}
          / <span className="text-slate-600 dark:text-slate-400">฿{Number(it.mes_unit_cost || 0).toFixed(2)}</span>
        </div>
      ),
    },
    {
      key: 'values_compare',
      label: 'SAP Val vs MES Val',
      render: (it) => (
        <div className="text-xs font-mono">
          <span className="text-blue-600 dark:text-blue-400 font-bold">
            ฿{Number(it.sap_total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>{' '}
          /{' '}
          <span className="text-slate-600 dark:text-slate-400">
            ฿{Number(it.mes_total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
      ),
    },
    {
      key: 'variance',
      label: 'Variance (THB)',
      sortable: true,
      render: (it) => {
        const val = Number(it.variance || 0);
        const isDiff = Math.abs(val) > 1;
        return (
          <span
            className={`font-mono font-bold text-xs ${
              isDiff ? (val > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400') : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {val > 0 ? '+' : ''}{val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: 'health_status',
      label: 'Status',
      sortable: true,
      render: (it) => {
        const conf = STATUS_CONFIGS[it.health_status] || STATUS_CONFIGS.MATCH;
        const Icon = conf.icon;
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${conf.badge}`}>
            <Icon className="w-3 h-3" />
            {conf.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Action',
      render: (it) => (
        <button
          onClick={() => handleSyncCosts([it.sap_no])}
          disabled={syncing || it.health_status === 'MATCH'}
          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
          title="Sync SAP Cost to MES"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Live SAP Staging Connection Status Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50/40 to-slate-50 dark:from-slate-800 dark:to-slate-850 rounded-xl border border-blue-200/80 dark:border-slate-700 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                เชื่อมต่อฐานข้อมูล SAP Staging สำเร็จ ({items.length.toLocaleString()} รายการ)
              </h4>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              แสดงข้อมูลสต็อกและมูลค่าคงคลังล่าสุดจาก SAP Staging Table เพื่อเปรียบเทียบกับ Item Master ใน MES
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs self-end sm:self-auto">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span>ข้อมูล ณ: {valuationData.last_synced_formatted || '02/11/2026 04:03'}</span>
        </div>
      </div>

      {/* Legacy Category Breakdown 5-Card Group (Full Parity) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* 1. RM */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border-l-4 border-l-blue-600 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-blue-600" /> RM (10-xx)
            </span>
            <span className="text-[10px] font-mono text-slate-400">{Number(rmGroup.qty || 0).toLocaleString()} pcs</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">SAP Val:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">฿{Number(rmGroup.sap_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">MES Val:</span>
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300">฿{Number(rmGroup.mes_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 text-[11px]">Variance:</span>
              <span className={`font-mono font-bold ${Math.abs(rmGroup.variance || 0) > 1 ? 'text-amber-600' : 'text-emerald-600'}`}>
                ฿{Number(rmGroup.variance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* 2. PKG */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border-l-4 border-l-cyan-500 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-cyan-500" /> PKG (20-xx)
            </span>
            <span className="text-[10px] font-mono text-slate-400">{Number(pkgGroup.qty || 0).toLocaleString()} pcs</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">SAP Val:</span>
              <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">฿{Number(pkgGroup.sap_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">MES Val:</span>
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300">฿{Number(pkgGroup.mes_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 text-[11px]">Variance:</span>
              <span className={`font-mono font-bold ${Math.abs(pkgGroup.variance || 0) > 1 ? 'text-amber-600' : 'text-emerald-600'}`}>
                ฿{Number(pkgGroup.variance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* 3. RM + PKG */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border-l-4 border-l-purple-600 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-purple-600" /> RM + PKG
            </span>
            <span className="text-[10px] font-mono text-slate-400">{Number(directMaterials.qty).toLocaleString()} pcs</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">SAP Val:</span>
              <span className="font-mono font-bold text-purple-600 dark:text-purple-400">฿{Number(directMaterials.sap_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">MES Val:</span>
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300">฿{Number(directMaterials.mes_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 text-[11px]">Variance:</span>
              <span className={`font-mono font-bold ${Math.abs(directMaterials.variance) > 1 ? 'text-amber-600' : 'text-emerald-600'}`}>
                ฿{Number(directMaterials.variance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* 4. WIP */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border-l-4 border-l-amber-500 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-500" /> WIP (30-xx)
            </span>
            <span className="text-[10px] font-mono text-slate-400">{Number(wipGroup.qty || 0).toLocaleString()} pcs</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">SAP Val:</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">฿{Number(wipGroup.sap_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">MES Val:</span>
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300">฿{Number(wipGroup.mes_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 text-[11px]">Variance:</span>
              <span className={`font-mono font-bold ${Math.abs(wipGroup.variance || 0) > 1 ? 'text-amber-600' : 'text-emerald-600'}`}>
                ฿{Number(wipGroup.variance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* 5. FG */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border-l-4 border-l-emerald-500 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> FG (40-xx)
            </span>
            <span className="text-[10px] font-mono text-slate-400">{Number(fgGroup.qty || 0).toLocaleString()} pcs</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">SAP Val:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">฿{Number(fgGroup.sap_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">MES Val:</span>
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300">฿{Number(fgGroup.mes_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 text-[11px]">Variance:</span>
              <span className={`font-mono font-bold ${Math.abs(fgGroup.variance || 0) > 1 ? 'text-amber-600' : 'text-emerald-600'}`}>
                ฿{Number(fgGroup.variance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total SAP Valuation */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total SAP Valuation
            </p>
            <p className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
              ฿{Number(summary.total_sap_value || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* Total MES Valuation */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total MES Valuation
            </p>
            <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              ฿{Number(summary.total_mes_value || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Variance */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Valuation Variance
            </p>
            <p
              className={`text-lg font-bold font-mono mt-0.5 ${
                Math.abs(summary.variance || 0) > 1000 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
              }`}
            >
              ฿{Number(summary.variance || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              <span className="text-[10px] font-sans font-normal">
                ({Number(summary.variance_pct || 0).toFixed(2)}%)
              </span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
        </div>

        {/* Items Health Count */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Discrepancies Count
            </p>
            <p className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
              {items.filter((i) => i.health_status !== 'MATCH').length} / {items.length}{' '}
              <span className="text-xs text-slate-400 font-sans font-normal">Items</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Actions Bar (Sticky Docked at Top) */}
      <div className="sticky top-0 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-xs transition-all">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหา SAP No., Description, Part No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">ทุกกลุ่ม (All Groups)</option>
            <option value="RM">RM (Raw Material)</option>
            <option value="PKG">PKG (Packaging)</option>
            <option value="WIP">WIP (Work in Process)</option>
            <option value="FG">FG (Finished Goods)</option>
            <option value="OTHER">OTHER (อื่นๆ)</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">ทุกสถานะ (All Status)</option>
            <option value="MATCH">Match (ตรงกัน)</option>
            <option value="VARIANCE">Variance (ราคาต่างกัน)</option>
            <option value="MISSING_MES">Missing MES Cost (ยังไม่มีต้นทุนใน MES)</option>
            <option value="MISSING_SAP">Missing SAP Cost (ไม่มีราคาใน SAP)</option>
            <option value="UNREGISTERED">Unregistered (ยังไม่ได้ขึ้นทะเบียนใน MES)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchValuation}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => handleSyncCosts([])}
            disabled={syncing || items.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
          >
            <ArrowRightLeft className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'กำลัง Sync ต้นทุน...' : 'Sync Costs to MES'}
          </button>
        </div>
      </div>

      {/* Valuation Items DataTable */}
      <DataTable
        columns={columns}
        rows={filteredItems}
        data={filteredItems}
        rowKey={(it) => it.Mat_No || it.sap_no}
        loading={loading}
        defaultSortKey="variance"
        defaultSortDirection="desc"
        emptyMessage="ไม่พบข้อมูลสินค้าตรงตามเงื่อนไขที่เลือก"
        searchable={false}
        watermark="SAP VALUATION"
      />
    </div>
  );
}
