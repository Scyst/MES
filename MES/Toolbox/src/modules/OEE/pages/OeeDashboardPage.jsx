import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  Boxes,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Loader2,
  Monitor,
  RefreshCw,
  UserCheck,
  UserCog,
  WifiOff,
  Wrench,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { oeeApi } from '../../../shared/services/oeeApi';
import OeeGaugesGrid from '../components/OeeGaugesGrid';
import OeeShopfloorBanner from '../components/OeeShopfloorBanner';
import { formatOeeNumber, getWorkingShiftDate } from '../utils/oeeHelpers';

/** Isolated 1s live clock so ticking never re-renders the OEE charts or tables. */
const LiveOeeClock = memo(function LiveOeeClock() {
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString('th-TH'));
  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString('th-TH')), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums">{clock}</span>;
});

/**
 * Self-contained OEE & Cost Monitoring Dashboard supporting both Executive View
 * and Shop Floor Live Monitor (#/oee & #/oee?mode=shopfloor).
 */
export default function OeeDashboardPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const role = String(user?.role || '').toLowerCase();
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const hasExecPermission = role === 'creator' || role === 'admin' || role === 'manager' || permissions.includes('view_executive');

  const requestedMode = searchParams.get('mode') === 'shopfloor' ? 'shopfloor' : 'executive';
  const viewMode = !hasExecPermission ? 'shopfloor' : requestedMode;

  const switchViewMode = useCallback((nextMode) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('mode', nextMode);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const initialLineParamRef = useRef(searchParams.get('line') || '');
  const [filtersMeta, setFiltersMeta] = useState({ lines: [], models: [], machines: [], teams: [] });
  const [line, setLine] = useState(() => initialLineParamRef.current);
  const [model, setModel] = useState(() => searchParams.get('model') || '');
  const [machine, setMachine] = useState(() => searchParams.get('machine') || '');
  const [team, setTeam] = useState(() => searchParams.get('team') || '');
  const [startDate, setStartDate] = useState(() => searchParams.get('startDate') || getWorkingShiftDate());
  const [endDate, setEndDate] = useState(() => searchParams.get('endDate') || getWorkingShiftDate());
  const [laborView, setLaborView] = useState('actual'); // actual | bom
  const [trendView, setTrendView] = useState('daily'); // daily | hourly
  const [stopGroupBy, setStopGroupBy] = useState('cause'); // cause | line

  const [pieData, setPieData] = useState({});
  const [trendData, setTrendData] = useState([]);
  const [barData, setBarData] = useState({ partResults: [], stopCause: { labels: [], values: [] } });
  const [costData, setCostData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);

  useEffect(() => {
    let active = true;
    oeeApi.getFilters().then((res) => {
      if (!active) return;
      if (res?.success && res.data) {
        setFiltersMeta(res.data);
        if (!initialLineParamRef.current) {
          const assembly = (res.data.lines || []).find((ln) => ln.toLowerCase().includes('assembly'));
          if (assembly) setLine(assembly);
        }
      }
    });
    return () => { active = false; };
  }, []);

  const filteredMachines = useMemo(() => {
    const all = filtersMeta.machines || [];
    if (!line) return all;
    return all.filter((m) => String(m.line || '').trim() === line.trim());
  }, [filtersMeta.machines, line]);

  const trendViewRef = useRef(trendView);
  trendViewRef.current = trendView;
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const laborViewRef = useRef(laborView);
  laborViewRef.current = laborView;
  const stopGroupByRef = useRef(stopGroupBy);
  stopGroupByRef.current = stopGroupBy;

  const loadOeeAll = useCallback(async () => {
    setLoading(true);
    const commonParams = {
      startDate,
      endDate,
      line,
      model,
      machine,
      team,
      mode: viewModeRef.current,
    };
    try {
      const [pieRes, lineRes, barRes, costRes] = await Promise.all([
        oeeApi.getPieChart(commonParams),
        trendViewRef.current === 'hourly'
          ? oeeApi.getHourlySparklines(commonParams)
          : oeeApi.getLineChart({ ...commonParams, viewType: 'daily' }),
        oeeApi.getBarCharts({ ...commonParams, stopCauseGroupBy: stopGroupByRef.current }),
        oeeApi.getCostSummary({ ...commonParams, laborView: laborViewRef.current }),
      ]);

      if (pieRes?.success && pieRes.data) setPieData(pieRes.data);
      if (lineRes?.success && Array.isArray(lineRes.data)) setTrendData(lineRes.data);
      if (barRes?.success && barRes.data) setBarData(barRes.data);
      if (costRes?.success && costRes.data) setCostData(costRes.data);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, line, model, machine, team]);

  useEffect(() => {
    loadOeeAll();
  }, [loadOeeAll]);

  // Separate lightweight fetch when switching Daily (30 Days) <-> Hourly (Selected Date)
  const isFirstTrendRender = useRef(true);
  const loadTrendOnly = useCallback(async (targetView) => {
    setTrendLoading(true);
    const commonParams = { startDate, endDate, line, model, machine, team, mode: viewModeRef.current };
    try {
      const lineRes = targetView === 'hourly'
        ? await oeeApi.getHourlySparklines(commonParams)
        : await oeeApi.getLineChart({ ...commonParams, viewType: 'daily' });
      if (lineRes?.success && Array.isArray(lineRes.data)) {
        setTrendData(lineRes.data);
      }
    } finally {
      setTrendLoading(false);
    }
  }, [startDate, endDate, line, model, machine, team]);

  useEffect(() => {
    if (isFirstTrendRender.current) {
      isFirstTrendRender.current = false;
      return;
    }
    loadTrendOnly(trendView);
  }, [trendView, loadTrendOnly]);

  // Separate lightweight fetch when toggling Downtime group by (Machine / Line)
  const isFirstStopGroupRender = useRef(true);
  useEffect(() => {
    if (isFirstStopGroupRender.current) {
      isFirstStopGroupRender.current = false;
      return;
    }
    const commonParams = { startDate, endDate, line, model, machine, team, mode: viewModeRef.current };
    oeeApi.getBarCharts({ ...commonParams, stopCauseGroupBy: stopGroupBy }).then((barRes) => {
      if (barRes?.success && barRes.data) setBarData(barRes.data);
    });
  }, [stopGroupBy, startDate, endDate, line, model, machine, team]);

  useEffect(() => {
    const timer = setInterval(loadOeeAll, 60000);
    return () => clearInterval(timer);
  }, [loadOeeAll]);

  const normalizedTrend = useMemo(() => (trendData || []).map((r) => ({
    label: r.hour || r.Hour || r.date || r.Date || r.time_label || '-',
    oee: Number(r.OEE ?? r.oee ?? 0),
    availability: Number(r.Availability ?? r.availability ?? 0),
    performance: Number(r.Performance ?? r.performance ?? 0),
    quality: Number(r.Quality ?? r.quality ?? 0),
  })), [trendData]);

  const stopCauseRows = useMemo(() => {
    const labels = barData?.stopCause?.labels || [];
    const values = barData?.stopCause?.values || [];
    return labels.map((lbl, idx) => ({ name: lbl, minutes: Number(values[idx] || 0) }));
  }, [barData]);

  const partResults = useMemo(() => barData?.partResults || [], [barData]);
  const maxPartCell = useMemo(() => {
    let m = 1;
    partResults.forEach((r) => {
      m = Math.max(m, Number(r.FG || 0), Number(r.HOLD || 0), Number(r.SCRAP || 0));
    });
    return m;
  }, [partResults]);

  const dualActive = useMemo(() => {
    if (!costData) return null;
    const dual = costData.dualViews || {};
    if (laborView === 'actual') {
      const a = dual.actual || {};
      return {
        revenue: costData.TotalStdRevenue || 0,
        cogs: a.totalCost ?? costData.TotalStdCost ?? 0,
        cpu: a.costPerUnit ?? costData.CostPerUnit ?? 0,
        mat: costData.TotalMatCost || 0,
        pctRm: costData.PercentRM || 0,
        scrapLoss: costData.ScrapCostValue || 0,
        labor: a.laborCost ?? costData.TotalActualDLOT ?? costData.TotalDLCost ?? 0,
        dl: costData.TotalActualDL || 0,
        ot: costData.TotalActualOT || 0,
        eff: a.laborEfficiency ?? costData.LaborEfficiency ?? 0,
        oh: costData.TotalOHCost || 0,
        pctOh: costData.PercentOH || 0,
        gp: a.grossProfit ?? ((costData.TotalStdRevenue || 0) - (a.totalCost || 0)),
        pctGp: a.percentGP ?? costData.PercentGPStd ?? 0,
      };
    }
    const b = dual.bom || {};
    return {
      revenue: costData.TotalStdRevenue || 0,
      cogs: b.totalCost ?? costData.TotalStdCost ?? 0,
      cpu: b.costPerUnit ?? costData.CostPerUnit ?? 0,
      mat: costData.TotalMatCost || 0,
      pctRm: costData.PercentRM || 0,
      scrapLoss: costData.ScrapCostValue || 0,
      labor: b.laborCost ?? costData.TotalStdDLCost ?? costData.TotalDLCost ?? 0,
      dl: b.laborCost ?? costData.TotalStdDLCost ?? 0,
      ot: 0,
      eff: b.laborEfficiency ?? costData.LaborEfficiency ?? 0,
      oh: costData.TotalOHCost || 0,
      pctOh: costData.PercentOH || 0,
      gp: b.grossProfit ?? ((costData.TotalStdRevenue || 0) - (b.totalCost || 0)),
      pctGp: b.percentGP ?? costData.PercentGPStd ?? 0,
    };
  }, [costData, laborView]);

  return (
    <div className="w-full space-y-3">
      {isOffline && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>ขาดการเชื่อมต่อเครือข่าย — ข้อมูล OEE อาจไม่อัปเดตเรียลไทม์</span>
        </div>
      )}

      {/* Top Filter & Status Bar */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm xl:flex-row xl:items-center xl:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${isOffline ? 'bg-rose-500' : 'animate-pulse bg-emerald-500'}`} />
            <span className="text-xs font-black tracking-wide text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
              {isOffline ? 'CONNECTION LOST' : viewMode === 'shopfloor' ? 'LIVE MONITOR' : 'OEE SYSTEM LIVE'}
            </span>
            <LiveOeeClock />
          </div>

          {hasExecPermission && (
            <div
              role="group"
              aria-label="OEE Display Mode"
              className="inline-flex items-center rounded-xl bg-slate-100 border border-slate-200 p-0.5 shrink-0 dark:bg-slate-800 dark:border-slate-700"
            >
              <button
                type="button"
                aria-pressed={viewMode === 'executive'}
                onClick={() => switchViewMode('executive')}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  viewMode === 'executive'
                    ? 'bg-slate-900 text-white shadow-xs dark:bg-blue-600'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <UserCog className="h-3.5 w-3.5 shrink-0" />
                <span>Executive</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'shopfloor'}
                onClick={() => switchViewMode('shopfloor')}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  viewMode === 'shopfloor'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <Monitor className="h-3.5 w-3.5 shrink-0" />
                <span>Shop Floor</span>
              </button>
            </div>
          )}

          <Link
            to="/production"
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Boxes className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span>Production Entry</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <select value={line} onChange={(e) => { setLine(e.target.value); setMachine(''); }} className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
            <option value="">All Lines</option>
            {(filtersMeta.lines || []).map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
            <option value="">All Models</option>
            {(filtersMeta.models || []).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={machine} onChange={(e) => setMachine(e.target.value)} className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
            <option value="">All Machines</option>
            {filteredMachines.map((m) => <option key={m.machine_id} value={m.machine_id}>{m.machine_name}</option>)}
          </select>
          <select value={team} onChange={(e) => setTeam(e.target.value)} className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400">
            <option value="">All Teams</option>
            {(filtersMeta.teams || []).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="col-span-2 flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 bg-transparent font-bold focus:outline-none" />
            <span>-</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 bg-transparent font-bold focus:outline-none" />
          </div>
          <button
            type="button"
            onClick={loadOeeAll}
            className="col-span-2 inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 sm:col-span-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Update</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Executive Financial Card */}
      {viewMode === 'executive' && !machine && dualActive && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex flex-wrap items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">Executive Financial Summary</span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setLaborView('actual')}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold ${
                    laborView === 'actual' ? 'bg-blue-600 text-white' : 'text-slate-500'
                  }`}
                >
                  <UserCheck className="h-3 w-3" />
                  <span>ค่าแรงจริง (Actual DL)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLaborView('bom')}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold ${
                    laborView === 'bom' ? 'bg-blue-600 text-white' : 'text-slate-500'
                  }`}
                >
                  <Layers className="h-3 w-3" />
                  <span>ค่าแรงมาตรฐาน (BOM Std)</span>
                </button>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span>{laborView === 'actual' ? 'โหมด: ค่าแรงจริง (Manpower)' : 'โหมด: ค่าแรงมาตรฐาน (BOM Std)'}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-3 xl:grid-cols-6 xl:divide-y-0 dark:divide-slate-800">
            <div className="p-3.5 text-center">
              <div className="text-[10px] font-bold uppercase text-slate-400">Revenue</div>
              <div className="mt-1 font-mono text-lg font-black text-slate-800 dark:text-slate-100">{formatOeeNumber(dualActive.revenue)}</div>
              <div className="mt-1 text-[11px] text-slate-400">Total Value (THB)</div>
            </div>
            <div className="p-3.5 text-center">
              <div className="text-[10px] font-bold uppercase text-slate-400">Total COGS</div>
              <div className="mt-1 font-mono text-lg font-black text-rose-600">{formatOeeNumber(dualActive.cogs)}</div>
              <div className="mt-1 text-[11px] text-slate-500">CPU: <strong>{formatOeeNumber(dualActive.cpu)}</strong></div>
            </div>
            <div className="p-3.5 text-center">
              <div className="text-[10px] font-bold uppercase text-slate-400">Material (RM)</div>
              <div className="mt-1 font-mono text-lg font-black text-slate-800 dark:text-slate-100">{formatOeeNumber(dualActive.mat)}</div>
              <div className="mt-1 text-[11px] text-slate-500">
                RM: <strong>{formatOeeNumber(dualActive.pctRm, 1, '%')}</strong> • Loss: <strong className="text-rose-600">{formatOeeNumber(dualActive.scrapLoss)}</strong>
              </div>
            </div>
            <div className="p-3.5 text-center">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                {laborView === 'actual' ? 'Labor (DL+OT)' : 'Labor (BOM Std)'}
              </div>
              <div className="mt-1 font-mono text-lg font-black text-slate-800 dark:text-slate-100">{formatOeeNumber(dualActive.labor)}</div>
              <div className="mt-1 text-[11px] text-slate-500">
                DL: {formatOeeNumber(dualActive.dl, 0)} | OT: {formatOeeNumber(dualActive.ot, 0)} • Eff:{' '}
                <strong className="text-blue-600">{dualActive.eff > 0 ? `${formatOeeNumber(dualActive.eff, 1)}x` : '--'}</strong>
              </div>
            </div>
            <div className="p-3.5 text-center">
              <div className="text-[10px] font-bold uppercase text-slate-400">Overhead</div>
              <div className="mt-1 font-mono text-lg font-black text-slate-800 dark:text-slate-100">{formatOeeNumber(dualActive.oh)}</div>
              <div className="mt-1 text-[11px] text-slate-500">OH Ratio: <strong>{formatOeeNumber(dualActive.pctOh, 1, '%')}</strong></div>
            </div>
            <div className="p-3.5 text-center">
              <div className="text-[10px] font-bold uppercase text-slate-400">Gross Profit</div>
              <div className={`mt-1 font-mono text-lg font-black ${dualActive.gp >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatOeeNumber(dualActive.gp)}
              </div>
              <div className="mt-1 inline-block rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                Margin: {formatOeeNumber(dualActive.pctGp, 1, '%')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Shop Floor Big Banner */}
      {viewMode === 'shopfloor' && (
        <OeeShopfloorBanner
          revenue={costData?.TotalStdRevenue || 0}
          partResults={partResults}
          hideRevenue={Boolean(machine)}
        />
      )}

      {/* 4 Gauges Grid */}
      <OeeGaugesGrid pie={pieData} isShopfloor={viewMode === 'shopfloor'} />

      {/* Trend & Downtime Charts (Executive View) */}
      {viewMode === 'executive' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-8 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Activity className="h-4 w-4 text-blue-600" />
                <span>OEE Trend</span>
                {trendLoading && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>กำลังโหลดกราฟ...</span>
                  </span>
                )}
              </h3>
              <div className="inline-flex rounded-xl bg-slate-100 border border-slate-200 p-0.5 text-xs dark:bg-slate-800 dark:border-slate-700">
                {[
                  { id: 'daily', label: 'Daily (30 Days)' },
                  { id: 'hourly', label: 'Hourly (Selected Date)' },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    disabled={trendLoading}
                    onClick={() => setTrendView(v.id)}
                    className={`rounded-lg px-3 py-1 font-bold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-70 ${
                      trendView === v.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative h-72 w-full min-w-0">
              {trendLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px] dark:bg-slate-900/75">
                  <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                  <span className="mt-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    กำลังดึงข้อมูล {trendView === 'hourly' ? 'รายชั่วโมง' : 'รายวัน (30 วัน)'}...
                  </span>
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={normalizedTrend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                  <Legend />
                  <Line isAnimationActive={false} type="monotone" dataKey="oee" name="OEE" stroke="#2563eb" strokeWidth={3} dot={false} />
                  <Line isAnimationActive={false} type="monotone" dataKey="availability" name="Availability" stroke="#06b6d4" strokeDasharray="5 5" dot={false} />
                  <Line isAnimationActive={false} type="monotone" dataKey="performance" name="Performance" stroke="#eab308" strokeDasharray="5 5" dot={false} />
                  <Line isAnimationActive={false} type="monotone" dataKey="quality" name="Quality" stroke="#16a34a" strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Wrench className="h-4 w-4 text-rose-600" />
                <span>Downtime Reasons</span>
              </h3>
              <div className="inline-flex rounded-xl border border-slate-200 p-0.5 text-xs dark:border-slate-700">
                {[
                  { id: 'cause', label: 'Machine' },
                  { id: 'line', label: 'Line' },
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setStopGroupBy(g.id)}
                    className={`rounded-lg px-2.5 py-1 font-bold ${
                      stopGroupBy === g.id ? 'bg-slate-800 text-white dark:bg-blue-600' : 'text-slate-500'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            {stopCauseRows.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center text-center text-slate-400">
                <CheckCircle2 className="mb-2 h-10 w-10 text-emerald-500 opacity-50" />
                <div className="text-sm font-bold">No Downtime Recorded</div>
                <div className="text-xs">เครื่องจักรทำงานปกติในช่วงเวลาที่เลือก</div>
              </div>
            ) : (
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stopCauseRows} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [`${v} min`, 'Downtime']} />
                    <Bar isAnimationActive={false} dataKey="minutes" fill="#e11d48" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Production Output by Part (PowerBI Bar Table) */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <Boxes className="h-4 w-4 text-emerald-600" />
            <span>Production Output by Part ({partResults.length})</span>
          </h3>
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="p-3">Part No.</th>
                <th className="p-3">Line / Model</th>
                <th className="p-3 text-right">FG (Good)</th>
                <th className="p-3 text-right">Hold</th>
                <th className="p-3 text-right">Scrap</th>
                <th className="p-3 text-right">Total Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {partResults.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">ไม่พบข้อมูลผลผลิตในช่วงวันที่เลือก</td></tr>
              ) : partResults.map((row, idx) => {
                const fg = Number(row.FG || 0);
                const hold = Number(row.HOLD || 0);
                const scrap = Number(row.SCRAP || 0);
                const total = fg + hold + scrap;
                const fgPct = total > 0 ? ((fg / total) * 100).toFixed(1) : '0.0';
                const holdPct = total > 0 ? ((hold / total) * 100).toFixed(1) : '0.0';
                const scrapPct = total > 0 ? ((scrap / total) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={`${row.part_no}-${row.production_line}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{row.part_no}</td>
                    <td className="p-3 text-slate-500">{row.production_line} | {row.model}</td>
                    <td className="p-3 text-right">
                      <div className="font-mono font-bold">{fg.toLocaleString()}</div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                        <div className="h-full bg-emerald-500" style={{ width: `${(fg / maxPartCell) * 100}%` }} />
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="font-mono font-bold">{hold.toLocaleString()}</div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                        <div className="h-full bg-amber-500" style={{ width: `${(hold / maxPartCell) * 100}%` }} />
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="font-mono font-bold">{scrap.toLocaleString()}</div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                        <div className="h-full bg-rose-500" style={{ width: `${(scrap / maxPartCell) * 100}%` }} />
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="font-mono text-sm font-black">{total.toLocaleString()}</div>
                      <div className="mt-0.5 flex justify-end gap-1 text-[10px] font-bold">
                        <span className="rounded bg-emerald-50 px-1.5 text-emerald-700">{fgPct}%</span>
                        <span className="rounded bg-amber-50 px-1.5 text-amber-700">{holdPct}%</span>
                        <span className="rounded bg-rose-50 px-1.5 text-rose-700">{scrapPct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
