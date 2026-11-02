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
    summary: { total_sap_value: 0, total_mes_value: 0, variance: 0, variance_pct: 0 },
    categories: [],
    items: [],
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
        setValuationData(
          res.data || {
            summary: { total_sap_value: 0, total_mes_value: 0, variance: 0, variance_pct: 0 },
            categories: [],
            items: [],
          }
        );
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
        <span className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-xs block">
          {it.description || '-'}
        </span>
      ),
    },
    {
      key: 'category_group',
      label: 'Group',
      sortable: true,
      render: (it) => (
        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {it.category_group || 'OTHER'}
        </span>
      ),
    },
    {
      key: 'staging_stock',
      label: 'Stock Qty',
      sortable: true,
      render: (it) => (
        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
          {Number(it.staging_stock || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'costs_compare',
      label: 'SAP Cost vs MES Cost',
      render: (it) => (
        <div className="text-xs font-mono">
          <span className="text-blue-600 dark:text-blue-400 font-bold">
            {Number(it.sap_unit_cost || 0).toFixed(2)}
          </span>{' '}
          / <span className="text-slate-600 dark:text-slate-400">{Number(it.mes_unit_cost || 0).toFixed(2)}</span>
        </div>
      ),
    },
    {
      key: 'values_compare',
      label: 'SAP Val vs MES Val',
      render: (it) => (
        <div className="text-xs font-mono">
          <span className="text-blue-600 dark:text-blue-400 font-bold">
            {Number(it.sap_total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>{' '}
          /{' '}
          <span className="text-slate-600 dark:text-slate-400">
            {Number(it.mes_total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
            {val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
    <div className="space-y-6">
      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total SAP Valuation */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total SAP Valuation
            </p>
            <p className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
              {Number(summary.total_sap_value || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              <span className="text-xs text-slate-400 font-sans font-normal">THB</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Total MES Valuation */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total MES Valuation
            </p>
            <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {Number(summary.total_mes_value || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              <span className="text-xs text-slate-400 font-sans font-normal">THB</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Variance */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Valuation Variance
            </p>
            <p
              className={`text-xl font-bold font-mono mt-1 ${
                Math.abs(summary.variance || 0) > 1000 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
              }`}
            >
              {Number(summary.variance || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              <span className="text-xs font-sans font-normal">
                ({Number(summary.variance_pct || 0).toFixed(2)}%)
              </span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
        </div>

        {/* Items Health Count */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Discrepancies Count
            </p>
            <p className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
              {items.filter((i) => i.health_status !== 'MATCH').length} / {items.length}{' '}
              <span className="text-xs text-slate-400 font-sans font-normal">Items</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหา SAP No., รายละเอียด..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">ทุกกลุ่ม (All Groups)</option>
            <option value="RM">RM (Raw Material)</option>
            <option value="PKG">PKG (Packaging)</option>
            <option value="WIP">WIP (Work in Process)</option>
            <option value="FG">FG (Finished Goods)</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">ทุกสถานะ (All Status)</option>
            <option value="MATCH">Match (ตรงกัน)</option>
            <option value="VARIANCE">Variance (ราคาต่างกัน)</option>
            <option value="MISSING_MES">Missing MES Cost (ยังไม่มีต้นทุนใน MES)</option>
            <option value="MISSING_SAP">Missing SAP Cost (ไม่มีราคาใน SAP)</option>
            <option value="UNREGISTERED">Unregistered (ยังไม่ได้ขึ้นทะเบียน)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchValuation}
            disabled={loading}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => handleSyncCosts([])}
            disabled={syncing || items.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            <ArrowRightLeft className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'กำลัง Sync ต้นทุน...' : 'Sync SAP Costs to MES'}
          </button>
        </div>
      </div>

      {/* Valuation Items DataTable */}
      <DataTable
        columns={columns}
        data={filteredItems}
        loading={loading}
        defaultSortKey="variance"
        defaultSortDirection="desc"
        emptyMessage="ไม่พบข้อมูลสินค้าตรงตามเงื่อนไขที่เลือก"
      />
    </div>
  );
}

