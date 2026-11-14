import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, SlidersHorizontal, Plus, Printer, FileText, X, Upload,
  CheckCircle2, Clock, ShieldCheck, Ban, RotateCcw, Edit3, Eye
} from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import { qmsCasesApi, resolveQmsMediaUrl } from '../../../shared/services/qmsApi';
import {
  CASE_STATUS_META, DEFECT_TYPES, PRELIM_DISPOSITIONS, FOUND_BY_TYPES,
  ROOT_CAUSE_CATEGORIES, CLAIM_DISPOSITIONS,
  formatQmsDate, formatQmsDateInput, formatQmsDateTime, formatQmsQty,
  openQmsPrintWindow, buildCasePrintHtml
} from '../utils/qmsFormatters';

const DEFAULT_NCR_FORM = {
  case_id: null,
  production_line: '',
  production_date: new Date().toISOString().slice(0, 10),
  found_shift: 'Day',
  lot_no: '',
  invoice_no: '',
  product_model: '',
  prelim_disposition: '',
  prelim_remark: '',
  customer_name: '',
  product_name: '',
  found_by_type: 'QC',
  issue_by_name: '',
  issuer_position: '',
  defect_type: '',
  defect_qty: '1',
  defect_description: '',
};

const DEFAULT_CAR_FORM = {
  qa_issue_description: '',
  containment_action: '',
  root_cause_category: 'Man',
  customer_root_cause: '',
  leak_cause: '',
  customer_action_plan: '',
  return_container_no: '',
  expected_return_qty: '',
};

const DEFAULT_CLAIM_FORM = {
  disposition: '',
  actual_received_qty: '',
  cost_estimation: '0',
  verify_date_1: '',
  verify_result_1: '',
  verify_date_2: '',
  verify_result_2: '',
  verify_date_3: '',
  verify_result_3: '',
  std_fmea: false,
  std_control_plan: false,
  std_wi: false,
  std_others: '',
};

export default function CasesNcrCarClaimTab({ isOnline }) {
  const { user } = useAuth();
  const toast = useToast();

  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({ total: 0, ncr_count: 0, car_count: 0, reply_count: 0, closed_count: 0 });
  const [masterData, setMasterData] = useState({ lines: [], items: [], customers: [] });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advFilters, setAdvFilters] = useState({ startDate: '', endDate: '', customer: '', defect: '' });

  // NCR Create / Edit Modal
  const [ncrModalOpen, setNcrModalOpen] = useState(false);
  const [ncrForm, setNcrForm] = useState(DEFAULT_NCR_FORM);
  const [ncrFiles, setNcrFiles] = useState([]);
  const [savingNcr, setSavingNcr] = useState(false);

  // Case Detail Modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [caseFiles, setCaseFiles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [detailTab, setDetailTab] = useState('ncr');
  const [carForm, setCarForm] = useState(DEFAULT_CAR_FORM);
  const [carFiles, setCarFiles] = useState([]);
  const [claimForm, setClaimForm] = useState(DEFAULT_CLAIM_FORM);
  const [savingAction, setSavingAction] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await qmsCasesApi.list();
      setCases(res.data?.cases || []);
      setStats(res.data?.stats || { total: 0, ncr_count: 0, car_count: 0, reply_count: 0, closed_count: 0 });
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถโหลดข้อมูล NCR / CAR ได้');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCases();
    qmsCasesApi.masterData()
      .then((res) => setMasterData(res.data || { lines: [], items: [], customers: [] }))
      .catch(() => {});
  }, [fetchCases]);

  const filteredCases = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const def = advFilters.defect.trim().toLowerCase();
    return cases.filter((row) => {
      if (statusFilter !== 'ALL' && row.current_status !== statusFilter) return false;
      if (q) {
        const hay = `${row.car_no || ''} ${row.customer_name || ''} ${row.product_name || ''} ${row.lot_no || ''} ${row.defect_type || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (advFilters.customer && row.customer_name !== advFilters.customer) return false;
      if (def && !`${row.defect_type || ''} ${row.defect_description || ''}`.toLowerCase().includes(def)) return false;
      const dateStr = formatQmsDateInput(row.case_date);
      if (advFilters.startDate && dateStr < advFilters.startDate) return false;
      if (advFilters.endDate && dateStr > advFilters.endDate) return false;
      return true;
    });
  }, [cases, statusFilter, searchTerm, advFilters]);

  const openCreateNcr = () => {
    setNcrForm({
      ...DEFAULT_NCR_FORM,
      issue_by_name: user?.fullname || user?.username || '',
    });
    setNcrFiles([]);
    setNcrModalOpen(true);
  };

  const openEditNcr = () => {
    if (!selectedDetail) return;
    setNcrForm({
      case_id: selectedDetail.case_id,
      production_line: selectedDetail.production_line || '',
      production_date: formatQmsDateInput(selectedDetail.production_date),
      found_shift: selectedDetail.found_shift || 'Day',
      lot_no: selectedDetail.lot_no || '',
      invoice_no: selectedDetail.invoice_no || '',
      product_model: selectedDetail.product_model || '',
      prelim_disposition: selectedDetail.prelim_disposition || '',
      prelim_remark: selectedDetail.prelim_remark || '',
      customer_name: selectedDetail.customer_name || '',
      product_name: selectedDetail.product_name || '',
      found_by_type: selectedDetail.found_by_type || 'QC',
      issue_by_name: selectedDetail.issue_by_name || '',
      issuer_position: selectedDetail.issuer_position || '',
      defect_type: selectedDetail.defect_type || '',
      defect_qty: String(selectedDetail.defect_qty ?? '1'),
      defect_description: selectedDetail.defect_description || '',
    });
    setNcrFiles([]);
    setDetailOpen(false);
    setNcrModalOpen(true);
  };

  const handleSaveNcr = async (e) => {
    e.preventDefault();
    if (!isOnline) return;
    setSavingNcr(true);
    try {
      const fd = new FormData();
      Object.entries(ncrForm).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, String(v));
      });
      ncrFiles.forEach((file) => fd.append('ncr_images[]', file));

      const res = ncrForm.case_id
        ? await qmsCasesApi.updateNcr(fd)
        : await qmsCasesApi.createNcr(fd);

      toast.success(res.message || 'บันทึกข้อมูล NCR เรียบร้อยแล้ว');
      setNcrModalOpen(false);
      await fetchCases();
      if (ncrForm.case_id) {
        openCaseDetail(ncrForm.case_id);
      }
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถบันทึกข้อมูล NCR ได้');
    } finally {
      setSavingNcr(false);
    }
  };

  const openCaseDetail = async (caseId, initialSubTab = 'ncr') => {
    setDetailOpen(true);
    setDetailLoading(true);
    setConfirmCancel(false);
    setDetailTab(initialSubTab);
    try {
      const res = await qmsCasesApi.detail(caseId);
      const d = res.data?.detail || null;
      setSelectedDetail(d);
      setCaseFiles(res.data?.files || []);
      setAuditLogs(res.data?.audit_logs || []);
      if (d) {
        setCarForm({
          qa_issue_description: d.qa_issue_description || d.defect_description || '',
          containment_action: d.containment_action || '',
          root_cause_category: d.root_cause_category || 'Man',
          customer_root_cause: d.customer_root_cause || '',
          leak_cause: d.leak_cause || '',
          customer_action_plan: d.customer_action_plan || '',
          return_container_no: d.return_container_no || '',
          expected_return_qty: d.expected_return_qty !== null && d.expected_return_qty !== undefined ? String(d.expected_return_qty) : '',
        });
        setCarFiles([]);
        setClaimForm({
          disposition: d.disposition || '',
          actual_received_qty: d.actual_received_qty !== null && d.actual_received_qty !== undefined
            ? String(d.actual_received_qty)
            : String(d.defect_qty ?? ''),
          cost_estimation: d.cost_estimation !== null && d.cost_estimation !== undefined ? String(d.cost_estimation) : '0',
          verify_date_1: formatQmsDateInput(d.verify_date_1),
          verify_result_1: d.verify_result_1 === null || d.verify_result_1 === undefined ? '' : (d.verify_result_1 ? '1' : '0'),
          verify_date_2: formatQmsDateInput(d.verify_date_2),
          verify_result_2: d.verify_result_2 === null || d.verify_result_2 === undefined ? '' : (d.verify_result_2 ? '1' : '0'),
          verify_date_3: formatQmsDateInput(d.verify_date_3),
          verify_result_3: d.verify_result_3 === null || d.verify_result_3 === undefined ? '' : (d.verify_result_3 ? '1' : '0'),
          std_fmea: Boolean(d.std_fmea),
          std_control_plan: Boolean(d.std_control_plan),
          std_wi: Boolean(d.std_wi),
          std_others: d.std_others || '',
        });
      }
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถโหลดรายละเอียดเคสได้');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveCar8d = async (carMode) => {
    if (!selectedDetail || !isOnline) return;
    setSavingAction(true);
    try {
      const fd = new FormData();
      fd.append('case_id', String(selectedDetail.case_id));
      fd.append('car_mode', carMode);
      Object.entries(carForm).forEach(([k, v]) => fd.append(k, String(v ?? '')));
      carFiles.forEach((f) => fd.append('car_images[]', f));
      const res = await qmsCasesApi.saveCar8d(fd);
      toast.success(res.message || 'บันทึก CAR 8D เรียบร้อยแล้ว');
      await fetchCases();
      await openCaseDetail(selectedDetail.case_id, 'car');
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถบันทึก CAR 8D ได้');
    } finally {
      setSavingAction(false);
    }
  };

  const handleCloseClaim = async (e) => {
    e.preventDefault();
    if (!selectedDetail || !isOnline) return;
    setSavingAction(true);
    try {
      const res = await qmsCasesApi.closeClaim({
        case_id: selectedDetail.case_id,
        ...claimForm,
        std_fmea: claimForm.std_fmea ? 1 : 0,
        std_control_plan: claimForm.std_control_plan ? 1 : 0,
        std_wi: claimForm.std_wi ? 1 : 0,
      });
      toast.success(res.message || 'ปิดงานเคลมเรียบร้อยแล้ว');
      await fetchCases();
      await openCaseDetail(selectedDetail.case_id, 'claim');
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถปิดงานเคลมได้');
    } finally {
      setSavingAction(false);
    }
  };

  const handleRejectCar = async () => {
    if (!selectedDetail || !isOnline) return;
    setSavingAction(true);
    try {
      const res = await qmsCasesApi.rejectCar(selectedDetail.case_id);
      toast.success(res.message || 'ส่งกลับ CAR เพื่อทบทวนเรียบร้อยแล้ว');
      await fetchCases();
      await openCaseDetail(selectedDetail.case_id, 'car');
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถตีกลับ CAR ได้');
    } finally {
      setSavingAction(false);
    }
  };

  const handleCancelCase = async () => {
    if (!selectedDetail || !isOnline) return;
    setSavingAction(true);
    try {
      const res = await qmsCasesApi.cancelCase(selectedDetail.case_id);
      toast.success(res.message || 'ยกเลิกเอกสารเรียบร้อยแล้ว');
      setDetailOpen(false);
      await fetchCases();
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถยกเลิกเอกสารได้');
    } finally {
      setSavingAction(false);
    }
  };

  const printDoc = (docType, detail = null) => {
    const labelMap = { ncr: 'NCR Report', car: 'CAR 8D Report', claim: 'Customer Claim Report' };
    const title = detail?.car_no ? `${detail.car_no} - ${labelMap[docType]}` : `Blank ${labelMap[docType]}`;
    const ok = openQmsPrintWindow({ title, bodyHtml: buildCasePrintHtml(docType, detail) });
    if (!ok) toast.error('เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต Pop-up');
  };

  const kpiCards = [
    { key: 'ALL', label: 'ทั้งหมด (Total)', value: stats.total || 0, color: 'border-slate-300 text-slate-800 dark:text-slate-100' },
    { key: 'NCR_CREATED', label: 'New NCR', value: stats.ncr_count || 0, color: 'border-rose-400 text-rose-600 dark:text-rose-400' },
    { key: 'SENT_TO_CUSTOMER', label: 'Wait CAR 8D', value: stats.car_count || 0, color: 'border-amber-400 text-amber-600 dark:text-amber-400' },
    { key: 'CUSTOMER_REPLIED', label: '8D Ready / Verify', value: stats.reply_count || 0, color: 'border-sky-400 text-sky-600 dark:text-sky-400' },
    { key: 'CLOSED', label: 'Closed', value: stats.closed_count || 0, color: 'border-emerald-400 text-emerald-600 dark:text-emerald-400' },
  ];

  const isClosedOrCancelled = selectedDetail && ['CLOSED', 'CANCELLED'].includes(selectedDetail.current_status);

  return (
    <div className="space-y-4">
      {/* KPI Filter Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((c) => {
          const active = statusFilter === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setStatusFilter(c.key)}
              className={`min-h-[76px] p-3.5 rounded-xl border-l-4 text-left transition-all shadow-xs ${c.color} ${
                active
                  ? 'bg-blue-50/80 dark:bg-blue-950/30 ring-2 ring-blue-500 border-t border-r border-b border-t-blue-200 border-r-blue-200 border-b-blue-200'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70'
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wide opacity-80">{c.label}</div>
              <div className="text-2xl font-extrabold mt-1 text-slate-900 dark:text-white">{Number(c.value).toLocaleString()}</div>
            </button>
          );
        })}
      </div>

      {/* Search & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหา CAR No, ลูกค้า, สินค้า, Lot..."
              className="w-full min-h-[44px] pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className={`min-h-[44px] px-3 py-2 rounded-lg border text-sm font-semibold inline-flex items-center gap-1.5 ${
              showAdvanced ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">ตัวกรองขั้นสูง</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => printDoc('ncr', null)}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-rose-500" /> Blank NCR
          </button>
          <button
            type="button"
            onClick={() => printDoc('car', null)}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-amber-500" /> Blank CAR
          </button>
          <button
            type="button"
            onClick={() => printDoc('claim', null)}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-emerald-500" /> Blank Claim
          </button>
          <button
            type="button"
            disabled={!isOnline}
            onClick={openCreateNcr}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> แจ้งปัญหาใหม่ (New NCR)
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-900/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">ตั้งแต่วันที่</label>
            <input
              type="date"
              value={advFilters.startDate}
              onChange={(e) => setAdvFilters((p) => ({ ...p, startDate: e.target.value }))}
              className="w-full min-h-[40px] px-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">ถึงวันที่</label>
            <input
              type="date"
              value={advFilters.endDate}
              onChange={(e) => setAdvFilters((p) => ({ ...p, endDate: e.target.value }))}
              className="w-full min-h-[40px] px-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">ลูกค้า (Customer)</label>
            <select
              value={advFilters.customer}
              onChange={(e) => setAdvFilters((p) => ({ ...p, customer: e.target.value }))}
              className="w-full min-h-[40px] px-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="">ทั้งหมด</option>
              {masterData.customers.map((c) => (
                <option key={c.customer_name} value={c.customer_name}>{c.customer_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">อาการเสีย (Defect)</label>
            <input
              type="text"
              value={advFilters.defect}
              onChange={(e) => setAdvFilters((p) => ({ ...p, defect: e.target.value }))}
              placeholder="พิมพ์อาการเสีย..."
              className="w-full min-h-[40px] px-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setAdvFilters({ startDate: '', endDate: '', customer: '', defect: '' })}
              className="min-h-[40px] w-full px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300"
            >
              ล้างตัวกรอง
            </button>
          </div>
        </div>
      )}

      {/* Desktop Data Table */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">CAR No.</th>
                <th className="px-3 py-3 font-bold">วันที่แจ้ง</th>
                <th className="px-4 py-3 font-bold">ลูกค้า / สินค้า</th>
                <th className="px-4 py-3 font-bold">รายละเอียดอาการเสีย</th>
                <th className="px-3 py-3 font-bold text-center">สถานะ</th>
                <th className="px-3 py-3 font-bold">ผู้แจ้งปัญหา</th>
                <th className="px-4 py-3 font-bold text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">กำลังโหลดข้อมูล QMS...</td></tr>
              ) : filteredCases.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">ไม่พบเอกสารคุณภาพตามเงื่อนไขที่เลือก</td></tr>
              ) : (
                filteredCases.map((row) => {
                  const stMeta = CASE_STATUS_META[row.current_status] || CASE_STATUS_META.NCR_CREATED;
                  return (
                    <tr
                      key={row.case_id}
                      onClick={() => openCaseDetail(row.case_id)}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{row.car_no}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatQmsDate(row.case_date)}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">{row.customer_name}</div>
                        <div className="text-xs text-slate-500 line-clamp-1">{row.product_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-rose-600 dark:text-rose-400">{row.defect_type}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                            {formatQmsQty(row.defect_qty)} pcs
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {row.defect_description || '-'} {row.lot_no ? `(Lot: ${row.lot_no})` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${stMeta.badgeClass}`}>
                          {stMeta.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">{row.issue_by_name || '-'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openCaseDetail(row.case_id); }}
                          className="min-h-[36px] px-3 py-1 rounded-lg bg-slate-100 hover:bg-blue-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> เปิดดู / จัดการ
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">กำลังโหลดข้อมูล...</div>
        ) : filteredCases.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">ไม่พบข้อมูลเอกสารคุณภาพ</div>
        ) : (
          filteredCases.map((row) => {
            const stMeta = CASE_STATUS_META[row.current_status] || CASE_STATUS_META.NCR_CREATED;
            return (
              <button
                key={row.case_id}
                type="button"
                onClick={() => openCaseDetail(row.case_id)}
                className="w-full text-left p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{row.car_no}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${stMeta.badgeClass}`}>{stMeta.label}</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">{row.customer_name}</div>
                <div className="text-xs text-slate-500 line-clamp-2">{row.product_name}</div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-rose-600">{row.defect_type} ({formatQmsQty(row.defect_qty)})</span>
                  <span className="text-slate-500">{formatQmsDate(row.case_date)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* NCR Create / Edit Modal */}
      {ncrModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                {ncrForm.case_id ? 'แก้ไขใบแจ้งปัญหา (Edit NCR)' : 'บันทึกใบแจ้งปัญหาใหม่ (Create NCR)'}
              </h3>
              <button type="button" onClick={() => setNcrModalOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-200/70">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNcr} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">ลูกค้า (Customer) *</label>
                  <input
                    type="text"
                    required
                    list="qms-customer-options"
                    value={ncrForm.customer_name}
                    onChange={(e) => setNcrForm((p) => ({ ...p, customer_name: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                  <datalist id="qms-customer-options">
                    {masterData.customers.map((c) => <option key={c.customer_name} value={c.customer_name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">สินค้า (Product / Part) *</label>
                  <input
                    type="text"
                    required
                    list="qms-item-options"
                    value={ncrForm.product_name}
                    onChange={(e) => setNcrForm((p) => ({ ...p, product_name: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                  <datalist id="qms-item-options">
                    {masterData.items.map((it) => (
                      <option key={it.part_no} value={`${it.part_no} | ${it.name}`} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">สายการผลิต (Line)</label>
                  <select
                    value={ncrForm.production_line}
                    onChange={(e) => setNcrForm((p) => ({ ...p, production_line: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {masterData.lines.map((l) => (
                      <option key={l.location_id} value={l.location_name}>{l.location_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">วันที่ผลิต (Production Date)</label>
                  <input
                    type="date"
                    value={ncrForm.production_date}
                    onChange={(e) => setNcrForm((p) => ({ ...p, production_date: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">กะที่พบ (Shift)</label>
                  <select
                    value={ncrForm.found_shift}
                    onChange={(e) => setNcrForm((p) => ({ ...p, found_shift: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="Day">Day (กะเช้า)</option>
                    <option value="Night">Night (กะดึก)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Lot No. / Model</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Lot No."
                      value={ncrForm.lot_no}
                      onChange={(e) => setNcrForm((p) => ({ ...p, lot_no: e.target.value }))}
                      className="min-h-[44px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Model"
                      value={ncrForm.product_model}
                      onChange={(e) => setNcrForm((p) => ({ ...p, product_model: e.target.value }))}
                      className="min-h-[44px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">ประเภทปัญหา (Defect Type) *</label>
                  <select
                    required
                    value={ncrForm.defect_type}
                    onChange={(e) => setNcrForm((p) => ({ ...p, defect_type: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="">-- ระบุอาการเสีย --</option>
                    {DEFECT_TYPES.map((dt) => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">จำนวนงานเสีย (Defect Qty) *</label>
                  <input
                    type="number"
                    min="0.0001"
                    step="any"
                    required
                    value={ncrForm.defect_qty}
                    onChange={(e) => setNcrForm((p) => ({ ...p, defect_qty: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2 text-sm font-bold text-rose-600 bg-rose-50/40 dark:bg-slate-950 border border-rose-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Invoice No. / ผู้พบปัญหา (Found By)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Invoice No."
                      value={ncrForm.invoice_no}
                      onChange={(e) => setNcrForm((p) => ({ ...p, invoice_no: e.target.value }))}
                      className="min-h-[44px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                    <select
                      value={ncrForm.found_by_type}
                      onChange={(e) => setNcrForm((p) => ({ ...p, found_by_type: e.target.value }))}
                      className="min-h-[44px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      <option value="">-- Found By --</option>
                      {FOUND_BY_TYPES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">การจัดการเบื้องต้น (Preliminary Disposition)</label>
                  <select
                    value={ncrForm.prelim_disposition}
                    onChange={(e) => setNcrForm((p) => ({ ...p, prelim_disposition: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {PRELIM_DISPOSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">ผู้แจ้งปัญหา (Issuer Name) *</label>
                  <input
                    type="text"
                    required
                    value={ncrForm.issue_by_name}
                    onChange={(e) => setNcrForm((p) => ({ ...p, issue_by_name: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2 text-sm font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">ตำแหน่งผู้แจ้ง (Position)</label>
                  <input
                    type="text"
                    value={ncrForm.issuer_position}
                    onChange={(e) => setNcrForm((p) => ({ ...p, issuer_position: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">รายละเอียดปัญหา (Defect Description)</label>
                <textarea
                  rows={3}
                  value={ncrForm.defect_description}
                  onChange={(e) => setNcrForm((p) => ({ ...p, defect_description: e.target.value }))}
                  placeholder="อธิบายลักษณะอาการผิดปกติ..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">รูปภาพหลักฐานหน้างาน (สูงสุด 5 รูป)</label>
                <label className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 text-xs font-semibold text-slate-600">
                  <Upload className="w-4 h-4" />
                  {ncrFiles.length > 0 ? `เลือกแล้ว ${ncrFiles.length} ไฟล์` : 'คลิกเพื่อเลือกรูปภาพ (JPG, PNG, WebP)'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => setNcrFiles(Array.from(e.target.files || []).slice(0, 5))}
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setNcrModalOpen(false)}
                  className="min-h-[44px] px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingNcr || !isOnline}
                  className="min-h-[44px] px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold"
                >
                  {savingNcr ? 'กำลังบันทึก...' : 'บันทึกข้อมูล NCR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Case Detail Modal (NCR -> CAR 8D -> Claim Verification) */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-lg font-extrabold text-blue-600 dark:text-blue-400 truncate">
                  {selectedDetail?.car_no || 'Loading...'}
                </span>
                {selectedDetail && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    (CASE_STATUS_META[selectedDetail.current_status] || CASE_STATUS_META.NCR_CREATED).badgeClass
                  }`}>
                    {(CASE_STATUS_META[selectedDetail.current_status] || CASE_STATUS_META.NCR_CREATED).thLabel}
                  </span>
                )}
              </div>
              <button type="button" onClick={() => setDetailOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-200/70">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-white dark:bg-slate-900 overflow-x-auto">
              {[
                { id: 'ncr', label: '1. ข้อมูล NCR & หลักฐาน' },
                { id: 'car', label: '2. CAR 8D Analysis' },
                { id: 'claim', label: '3. ปิดเคลม & ประเมินผล' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDetailTab(t.id)}
                  className={`min-h-[44px] px-4 py-2.5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                    detailTab === t.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {detailLoading || !selectedDetail ? (
                <div className="py-16 text-center text-slate-500">กำลังโหลดรายละเอียดเคส...</div>
              ) : detailTab === 'ncr' ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="text-xs text-slate-500">
                      วันที่แจ้ง: <b className="text-slate-800 dark:text-slate-200">{formatQmsDateTime(selectedDetail.case_date)}</b>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isClosedOrCancelled && (
                        <button
                          type="button"
                          disabled={!isOnline}
                          onClick={openEditNcr}
                          className="min-h-[40px] px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> แก้ไข NCR
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => printDoc('ncr', selectedDetail)}
                        className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-600" /> พิมพ์ NCR
                      </button>
                      {!isClosedOrCancelled && (
                        <button
                          type="button"
                          disabled={!isOnline}
                          onClick={() => setConfirmCancel((v) => !v)}
                          className="min-h-[40px] px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <Ban className="w-3.5 h-3.5" /> ยกเลิกเอกสาร
                        </button>
                      )}
                    </div>
                  </div>

                  {confirmCancel && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-rose-800 dark:text-rose-200 font-semibold">
                        ยืนยันการยกเลิกเอกสาร <b>{selectedDetail.car_no}</b> หรือไม่? การกระทำนี้จะถูกบันทึกใน Audit Log
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setConfirmCancel(false)} className="min-h-[36px] px-3 rounded-lg bg-white border border-slate-300 text-xs font-bold">ปิด</button>
                        <button type="button" disabled={savingAction || !isOnline} onClick={handleCancelCase} className="min-h-[36px] px-3 rounded-lg bg-rose-600 text-white text-xs font-bold">ยืนยันยกเลิก</button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm">
                    <div><span className="text-xs text-slate-500 block">ลูกค้า</span><b className="text-blue-700 dark:text-blue-400">{selectedDetail.customer_name}</b></div>
                    <div><span className="text-xs text-slate-500 block">สินค้า</span><b>{selectedDetail.product_name}</b></div>
                    <div><span className="text-xs text-slate-500 block">Model / Production Line</span><b>{selectedDetail.product_model || '-'} / {selectedDetail.production_line || '-'}</b></div>
                    <div><span className="text-xs text-slate-500 block">Prod Date / Shift / Lot</span><b>{formatQmsDate(selectedDetail.production_date)} / {selectedDetail.found_shift || '-'} / {selectedDetail.lot_no || '-'}</b></div>
                    <div><span className="text-xs text-slate-500 block">อาการเสีย</span><b className="text-rose-600">{selectedDetail.defect_type} ({formatQmsQty(selectedDetail.defect_qty)} pcs)</b></div>
                    <div><span className="text-xs text-slate-500 block">Invoice / Found By</span><b>{selectedDetail.invoice_no || '-'} / {selectedDetail.found_by_type || '-'}</b></div>
                    <div><span className="text-xs text-slate-500 block">ผู้แจ้ง / ตำแหน่ง</span><b>{selectedDetail.issue_by_name || '-'} ({selectedDetail.issuer_position || '-'})</b></div>
                    <div><span className="text-xs text-slate-500 block">Preliminary Disposition</span><b>{selectedDetail.prelim_disposition || '-'} {selectedDetail.prelim_remark ? `(${selectedDetail.prelim_remark})` : ''}</b></div>
                    <div className="sm:col-span-2">
                      <span className="text-xs text-slate-500 block mb-1">รายละเอียดอาการผิดปกติ</span>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 whitespace-pre-wrap text-xs">
                        {selectedDetail.defect_description || '-'}
                      </div>
                    </div>
                  </div>

                  {/* Attachments */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase text-slate-500">รูปภาพหลักฐาน ({caseFiles.length})</h4>
                    {caseFiles.length === 0 ? (
                      <div className="text-xs text-slate-400 italic">ไม่มีรูปภาพแนบ</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {caseFiles.map((f) => {
                          const url = resolveQmsMediaUrl(f.file_path);
                          return (
                            <button
                              key={f.att_id}
                              type="button"
                              onClick={() => setPreviewImage(url)}
                              className="group relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square bg-slate-100"
                            >
                              <img src={url} alt={f.file_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-900/70 text-[10px] text-white font-bold">{f.doc_stage}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : detailTab === 'car' ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <div className="text-xs text-amber-900 dark:text-amber-200">
                      <b>Internal CAR 8D Investigation</b> — บันทึกการวิเคราะห์สาเหตุและแผนแก้ไขภายในระบบ (ข้ามขั้นตอนลิงก์ภายนอกลูกค้าตามมติทีม QA)
                    </div>
                    <button
                      type="button"
                      onClick={() => printDoc('car', { ...selectedDetail, ...carForm })}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-600" /> พิมพ์ CAR 8D
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">D1-D2: คำอธิบายปัญหาสำหรับใบ CAR (QA Issue Description) *</label>
                      <textarea
                        rows={2}
                        disabled={isClosedOrCancelled}
                        value={carForm.qa_issue_description}
                        onChange={(e) => setCarForm((p) => ({ ...p, qa_issue_description: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">D3: การสกัดกั้นปัญหาเบื้องต้น (Containment Action)</label>
                      <textarea
                        rows={2}
                        disabled={isClosedOrCancelled}
                        value={carForm.containment_action}
                        onChange={(e) => setCarForm((p) => ({ ...p, containment_action: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">D4: หมวดหมู่สาเหตุ (4M1E Category)</label>
                        <select
                          disabled={isClosedOrCancelled}
                          value={carForm.root_cause_category}
                          onChange={(e) => setCarForm((p) => ({ ...p, root_cause_category: e.target.value }))}
                          className="w-full min-h-[44px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                        >
                          {ROOT_CAUSE_CATEGORIES.map((rc) => <option key={rc.value} value={rc.value}>{rc.label}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Container Return No.</label>
                          <input
                            type="text"
                            disabled={isClosedOrCancelled}
                            value={carForm.return_container_no}
                            onChange={(e) => setCarForm((p) => ({ ...p, return_container_no: e.target.value }))}
                            className="w-full min-h-[44px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Expected Qty</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            disabled={isClosedOrCancelled}
                            value={carForm.expected_return_qty}
                            onChange={(e) => setCarForm((p) => ({ ...p, expected_return_qty: e.target.value }))}
                            className="w-full min-h-[44px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">D4: สาเหตุที่แท้จริงของปัญหา (Occurrence Root Cause) *</label>
                      <textarea
                        rows={2}
                        disabled={isClosedOrCancelled}
                        value={carForm.customer_root_cause}
                        onChange={(e) => setCarForm((p) => ({ ...p, customer_root_cause: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">D4: สาเหตุที่หลุดรอดการตรวจสอบ (Escape / Leak Cause)</label>
                      <textarea
                        rows={2}
                        disabled={isClosedOrCancelled}
                        value={carForm.leak_cause}
                        onChange={(e) => setCarForm((p) => ({ ...p, leak_cause: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">D5-D6: แผนแก้ไขและป้องกันถาวร (Corrective Action Plan) *</label>
                      <textarea
                        rows={3}
                        disabled={isClosedOrCancelled}
                        value={carForm.customer_action_plan}
                        onChange={(e) => setCarForm((p) => ({ ...p, customer_action_plan: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                      />
                    </div>

                    {!isClosedOrCancelled && (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">แนบรูปประกอบ CAR 8D เพิ่มเติม (ถ้ามี)</label>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={(e) => setCarFiles(Array.from(e.target.files || []).slice(0, 5))}
                          className="text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {!isClosedOrCancelled && (
                    <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                      {selectedDetail.current_status === 'NCR_CREATED' && (
                        <button
                          type="button"
                          disabled={savingAction || !isOnline}
                          onClick={() => handleSaveCar8d('issue')}
                          className="min-h-[44px] px-4 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold"
                        >
                          เปิดใบ CAR (Wait CAR 8D)
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={savingAction || !isOnline}
                        onClick={() => handleSaveCar8d('submit_8d')}
                        className="min-h-[44px] px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold inline-flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        {savingAction ? 'กำลังบันทึก...' : 'บันทึกผล CAR 8D (พร้อมตรวจปิดเคลม)'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {['NCR_CREATED', 'SENT_TO_CUSTOMER'].includes(selectedDetail.current_status) ? (
                    <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                      <Clock className="w-10 h-10 text-amber-500 mx-auto" />
                      <h4 className="font-bold text-slate-800 dark:text-white">รอการบันทึกผลการวิเคราะห์ CAR 8D</h4>
                      <p className="text-xs text-slate-500">กรุณาบันทึก Root Cause และ Corrective Action Plan ในแท็บ "2. CAR 8D Analysis" ก่อนปิดเคลม</p>
                      <button
                        type="button"
                        onClick={() => setDetailTab('car')}
                        className="mt-2 min-h-[40px] px-4 rounded-lg bg-blue-600 text-white text-xs font-bold"
                      >
                        ไปยังแท็บ CAR 8D Analysis
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleCloseClaim} className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                          <CheckCircle2 className="w-4 h-4" />
                          {selectedDetail.current_status === 'CLOSED'
                            ? `ปิดเคลมแล้วเมื่อ ${formatQmsDateTime(selectedDetail.closed_at)} โดย ${selectedDetail.approved_by_name || '-'}`
                            : 'ข้อมูล CAR 8D พร้อมสำหรับการประเมินผล 3 ระยะและปิดเคลม'}
                        </div>
                        <button
                          type="button"
                          onClick={() => printDoc('claim', { ...selectedDetail, ...claimForm })}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-600" /> พิมพ์ใบ Claim
                        </button>
                      </div>

                      {/* 3-Stage Verification */}
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase text-slate-600">
                          D7: การติดตามประเมินประสิทธิผล 3 ระยะ (3-Stage Verification)
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {[1, 2, 3].map((stage) => (
                            <div key={stage} className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 items-center">
                              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">ประเมินครั้งที่ {stage}</div>
                              <input
                                type="date"
                                disabled={isClosedOrCancelled}
                                value={claimForm[`verify_date_${stage}`]}
                                onChange={(e) => setClaimForm((p) => ({ ...p, [`verify_date_${stage}`]: e.target.value }))}
                                className="min-h-[40px] px-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                              />
                              <select
                                disabled={isClosedOrCancelled}
                                value={claimForm[`verify_result_${stage}`]}
                                onChange={(e) => setClaimForm((p) => ({ ...p, [`verify_result_${stage}`]: e.target.value }))}
                                className="min-h-[40px] px-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                              >
                                <option value="">- รอประเมิน -</option>
                                <option value="1">Accept (ผ่าน)</option>
                                <option value="0">Reject (ไม่ผ่าน)</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* D8 Standardization */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="text-xs font-bold uppercase text-slate-600">D8: การปรับปรุงเอกสารมาตรฐาน (Standardization)</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { key: 'std_fmea', label: 'Update FMEA' },
                            { key: 'std_control_plan', label: 'Control Plan' },
                            { key: 'std_wi', label: 'Update Work Instruction (WI)' },
                          ].map((s) => (
                            <label key={s.key} className="flex items-center gap-2 min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs font-semibold">
                              <input
                                type="checkbox"
                                disabled={isClosedOrCancelled}
                                checked={claimForm[s.key]}
                                onChange={(e) => setClaimForm((p) => ({ ...p, [s.key]: e.target.checked }))}
                              />
                              {s.label}
                            </label>
                          ))}
                        </div>
                        <input
                          type="text"
                          disabled={isClosedOrCancelled}
                          placeholder="มาตรฐานอื่นๆ ระบุ (ถ้ามี)..."
                          value={claimForm.std_others}
                          onChange={(e) => setClaimForm((p) => ({ ...p, std_others: e.target.value }))}
                          className="w-full min-h-[40px] px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                        />
                      </div>

                      {/* Disposition & Cost */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">การจัดการของเสีย (Disposition) *</label>
                          <select
                            required
                            disabled={isClosedOrCancelled}
                            value={claimForm.disposition}
                            onChange={(e) => setClaimForm((p) => ({ ...p, disposition: e.target.value }))}
                            className="w-full min-h-[44px] px-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                          >
                            <option value="">-- เลือกผลการจัดการ --</option>
                            {CLAIM_DISPOSITIONS.map((cd) => <option key={cd.value} value={cd.value}>{cd.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">ยอดรับเข้าจริง (Qty) *</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            required
                            disabled={isClosedOrCancelled}
                            value={claimForm.actual_received_qty}
                            onChange={(e) => setClaimForm((p) => ({ ...p, actual_received_qty: e.target.value }))}
                            className="w-full min-h-[44px] px-3 py-2 text-sm font-bold text-emerald-700 bg-emerald-50/40 dark:bg-slate-950 border border-emerald-300 rounded-lg disabled:opacity-60"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-rose-700 dark:text-rose-400 mb-1">มูลค่าความเสียหาย / CN (THB)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={isClosedOrCancelled}
                            value={claimForm.cost_estimation}
                            onChange={(e) => setClaimForm((p) => ({ ...p, cost_estimation: e.target.value }))}
                            className="w-full min-h-[44px] px-3 py-2 text-sm font-bold text-rose-700 bg-rose-50/40 dark:bg-slate-950 border border-rose-300 rounded-lg disabled:opacity-60"
                          />
                        </div>
                      </div>

                      {!isClosedOrCancelled && (
                        <div className="flex flex-wrap justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                          <button
                            type="button"
                            disabled={savingAction || !isOnline}
                            onClick={handleRejectCar}
                            className="min-h-[44px] px-4 rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-bold inline-flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-4 h-4" /> ตีกลับเพื่อแก้ไข CAR 8D
                          </button>
                          <button
                            type="submit"
                            disabled={savingAction || !isOnline}
                            className="min-h-[44px] px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold inline-flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" /> ยืนยันปิดงานเคลม (Close Claim)
                          </button>
                        </div>
                      )}
                    </form>
                  )}

                  {/* Audit Trail */}
                  {auditLogs.length > 0 && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="text-xs font-bold uppercase text-slate-500">ประวัติการเปลี่ยนสถานะ (Audit Trail)</div>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs">
                        {auditLogs.map((log) => (
                          <div key={log.log_id} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800">
                            <span><b>{log.action_type}</b> ({log.old_status || 'NEW'} → <b>{log.new_status}</b>) โดย {log.updated_by}</span>
                            <span className="text-slate-400 whitespace-nowrap">{formatQmsDateTime(log.updated_at)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {previewImage && (
        <div onClick={() => setPreviewImage('')} className="fixed inset-0 z-[60] bg-slate-950/85 flex items-center justify-center p-4">
          <button type="button" onClick={() => setPreviewImage('')} className="absolute top-4 right-4 min-w-[44px] min-h-[44px] rounded-full bg-white/10 text-white flex items-center justify-center">
            <X className="w-6 h-6" />
          </button>
          <img src={previewImage} alt="Evidence Preview" className="max-w-full max-h-[88vh] rounded-xl shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
