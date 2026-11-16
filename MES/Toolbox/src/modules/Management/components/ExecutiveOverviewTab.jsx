import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  HelpCircle,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import { managementExecApi } from '../../../shared/services/managementApi';
import {
  buildTrendWithAiForecast,
  formatMoneyCompact,
} from '../utils/managementHelpers';
import {
  ExecHelpModal,
  LineDetailModal,
  MetricExplainerModal,
} from './ManagementModals';

const PRIORITY_LINES = ['ASSEMBLY', 'PRESS', 'PAINT', 'SPOT', 'BEND', 'WELDING'];

export default function ExecutiveOverviewTab({ isOffline }) {
  const toast = useToast();
  const confirm = useConfirm();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const past30Str = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  const [startDate, setStartDate] = useState(past30Str);
  const [endDate, setEndDate] = useState(todayStr);
  const [exchangeRate, setExchangeRate] = useState(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('lastExchangeRate') : null;
    return saved || '32.0';
  });
  const [aiForecast, setAiForecast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState({ summary: {}, lines: [], trend: [] });
  const [syncProgress, setSyncProgress] = useState(null);
  const [explainerKey, setExplainerKey] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const rateNum = Number(exchangeRate) || 32.0;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('lastExchangeRate', String(rateNum));
      }
      const res = await managementExecApi.getDashboard({
        startDate,
        endDate,
        exchangeRate: rateNum,
      });
      if (res?.success && res.data) {
        setDashboard(res.data);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [startDate, endDate, exchangeRate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setInterval(() => loadData(true), 60000);
    return () => clearInterval(timer);
  }, [loadData]);

  const runLaborSync = async (sd, ed) => {
    if (isOffline) return;
    const dates = [];
    const cur = new Date(`${sd}T00:00:00`);
    const stop = new Date(`${ed}T00:00:00`);
    while (cur <= stop) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < dates.length; i += 1) {
      setSyncProgress({ current: i + 1, total: dates.length, date: dates[i] });
      try {
        const res = await managementExecApi.syncLaborDay(dates[i], dates[i]);
        if (res?.success) ok += 1;
        else fail += 1;
      } catch {
        fail += 1;
      }
    }
    setSyncProgress(null);
    if (fail === 0) {
      toast.success(`ซิงค์ข้อมูลค่าแรงสำเร็จ ${ok} วัน`);
    } else {
      toast.warning(`ซิงค์สำเร็จ ${ok} วัน, ล้มเหลว ${fail} วัน`);
    }
    loadData(false);
  };

  const handleSyncRange = async () => {
    const diffDays = Math.ceil(Math.abs(new Date(endDate) - new Date(startDate)) / 86400000) + 1;
    const accepted = await confirm({
      title: `ซิงค์ค่าแรงจริง (${diffDays} วัน)`,
      message: `ประมวลผลช่วง ${startDate} ถึง ${endDate} จากระบบ Manpower${diffDays > 7 ? ' (อาจใช้เวลาหลายวินาที)' : ''}`,
      confirmText: 'เริ่มซิงค์ค่าแรง',
    });
    if (accepted) {
      await runLaborSync(startDate, endDate);
    }
  };

  const handleQuickSync = async () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = y.toISOString().split('T')[0];
    const accepted = await confirm({
      title: 'Quick Sync (เมื่อวาน + วันนี้)',
      message: `อัปเดตค่าแรงเฉพาะวันที่ ${yesterday} และ ${todayStr}`,
      confirmText: 'Quick Sync',
    });
    if (accepted) {
      await runLaborSync(yesterday, todayStr);
    }
  };

  const summary = dashboard.summary || {};
  const saleVal = Number(summary.sale || 0);
  const costVal = Number(summary.cost || 0);
  const gpVal = Number(summary.gp || 0);
  const rmVal = Number(summary.rm || 0);
  const dlotVal = Number(summary.dlot || 0);
  const stdDlVal = Number(summary.std_dl || 0);
  const ohVal = Number(summary.oh || 0);
  const scrapVal = Number(summary.scrap || 0);
  const totalStdCost = Number(summary.std_cost || rmVal + stdDlVal + ohVal + scrapVal);
  const costDiff = totalStdCost - costVal;
  const costDiffPct = totalStdCost > 0 ? (costDiff / totalStdCost) * 100 : 0;
  const dlDiff = stdDlVal - dlotVal;
  const dlDiffPct = stdDlVal > 0 ? (dlDiff / stdDlVal) * 100 : 0;
  const gpPct = saleVal > 0 ? (gpVal / saleVal) * 100 : 0;

  const trendSeries = useMemo(
    () => buildTrendWithAiForecast(dashboard.trend || [], aiForecast),
    [dashboard.trend, aiForecast]
  );

  const sortedLines = useMemo(() => {
    const copy = [...(dashboard.lines || [])];
    return copy.sort((a, b) => {
      const nA = String(a.name || '').toUpperCase();
      const nB = String(b.name || '').toUpperCase();
      const pA = PRIORITY_LINES.some((p) => nA.includes(p));
      const pB = PRIORITY_LINES.some((p) => nB.includes(p));
      if (pA && !pB) return -1;
      if (!pA && pB) return 1;
      return Number(b.gp || 0) - Number(a.gp || 0);
    });
  }, [dashboard.lines]);

  const saleVsCostPie = [
    { name: 'Profit', value: Math.max(0, gpVal), color: '#16a34a' },
    { name: 'Cost', value: Math.max(0, costVal), color: '#dc2626' },
  ];
  const costBreakdownPie = [
    { name: 'RM', value: Math.max(0, rmVal), color: '#2563eb' },
    { name: 'Labor', value: Math.max(0, dlotVal), color: '#7c3aed' },
    { name: 'OH', value: Math.max(0, ohVal), color: '#f97316' },
    { name: 'Scrap', value: Math.max(0, scrapVal), color: '#64748b' },
  ];
  const laborBarData = [
    { name: 'Std BOM', amount: stdDlVal, fill: '#2563eb' },
    { name: 'Actual', amount: dlotVal, fill: dlotVal > stdDlVal ? '#dc2626' : '#16a34a' },
  ];

  return (
    <div className="space-y-4">
      {syncProgress && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 p-6 text-white backdrop-blur-sm">
          <RefreshCw className="h-12 w-12 animate-spin text-amber-400" />
          <div className="mt-4 text-lg font-bold">
            กำลังซิงค์ค่าแรง ({syncProgress.current}/{syncProgress.total})
          </div>
          <div className="mt-1 text-sm text-amber-200">วันที่ {syncProgress.date}</div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
          <span>EXECUTIVE FINANCIAL OVERVIEW (LIVE)</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            <span className="px-2.5 text-[11px] font-bold text-slate-500">USD</span>
            <input
              type="number"
              step="0.1"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              className="min-h-[44px] w-20 bg-transparent px-2 text-right font-mono text-xs font-bold text-blue-600 focus:outline-none dark:text-blue-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="min-h-[38px] bg-transparent text-xs font-bold focus:outline-none"
            />
            <span className="text-xs text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="min-h-[38px] bg-transparent text-xs font-bold focus:outline-none"
            />
          </div>

          <button
            type="button"
            disabled={isOffline}
            onClick={handleSyncRange}
            title="ซิงค์ค่าแรงจริงตามช่วงวันที่"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-amber-400 px-3 text-xs font-bold text-slate-900 hover:bg-amber-500 disabled:opacity-50"
          >
            <Users className="h-4 w-4" />
            <span>Sync Labor</span>
          </button>

          <button
            type="button"
            disabled={isOffline}
            onClick={handleQuickSync}
            title="Quick Sync เมื่อวาน & วันนี้"
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
          >
            <Zap className="h-4 w-4 text-amber-500" />
            <span>Quick</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !aiForecast;
              setAiForecast(next);
              toast.info(next ? 'เปิดโหมดพยากรณ์ AI 7 วันแล้ว' : 'ปิดโหมดพยากรณ์ AI');
            }}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
              aiForecast
                ? 'border-cyan-600 bg-cyan-600 text-white'
                : 'border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>AI Forecast</span>
          </button>

          <button
            type="button"
            onClick={() => loadData(false)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-600 px-3 text-white hover:bg-blue-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 px-3 text-slate-500 hover:bg-slate-100 dark:border-slate-700"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <button
          type="button"
          onClick={() => setExplainerKey('sale')}
          className="flex flex-col justify-between rounded-2xl border border-slate-200 border-l-4 border-l-emerald-500 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900"
        >
          <span className="text-[11px] font-bold uppercase text-slate-400">Total Revenue</span>
          <span className="mt-1 font-mono text-xl font-black text-slate-900 dark:text-slate-100">
            {formatMoneyCompact(saleVal)}
          </span>
          <span className="mt-1 text-[11px] font-semibold text-emerald-600">Actual Production</span>
        </button>

        <button
          type="button"
          onClick={() => setExplainerKey('cost')}
          className="flex flex-col justify-between rounded-2xl border border-slate-200 border-l-4 border-l-rose-500 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900"
        >
          <span className="text-[11px] font-bold uppercase text-slate-400">Total Cost (Act)</span>
          <span className="mt-1 font-mono text-xl font-black text-slate-900 dark:text-slate-100">
            {formatMoneyCompact(costVal)}
          </span>
          <div className="mt-1.5 flex justify-between border-t border-slate-100 pt-1 text-[10px] dark:border-slate-800">
            <span className="text-slate-400">Std: {formatMoneyCompact(totalStdCost)}</span>
            <span className={`font-bold ${costDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {costDiff > 0 ? '+' : ''}{costDiffPct.toFixed(1)}%
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setExplainerKey('gp')}
          className="flex flex-col justify-between rounded-2xl border border-blue-200 border-l-4 border-l-blue-600 bg-blue-50/70 p-4 text-left shadow-sm transition hover:-translate-y-0.5 dark:border-blue-900 dark:bg-blue-950/30"
        >
          <span className="text-[11px] font-bold uppercase text-blue-700 dark:text-blue-300">Gross Profit</span>
          <span className="mt-1 font-mono text-xl font-black text-blue-700 dark:text-blue-300">
            {formatMoneyCompact(gpVal)}
          </span>
          <span className={`mt-1 inline-block w-fit rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${gpPct >= 0 ? 'bg-blue-600' : 'bg-rose-600'}`}>
            {gpPct.toFixed(1)}% Margin
          </span>
        </button>

        <button
          type="button"
          onClick={() => setExplainerKey('rm')}
          className="flex flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <span className="text-[11px] font-bold uppercase text-slate-400">Material (RM)</span>
          <span className="mt-1 font-mono text-lg font-black text-slate-700 dark:text-slate-200">
            {formatMoneyCompact(rmVal)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setExplainerKey('labor')}
          className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <span className="text-[11px] font-bold uppercase text-slate-400">Labor (DL+OT)</span>
          <span className="mt-1 font-mono text-lg font-black text-slate-700 dark:text-slate-200">
            {formatMoneyCompact(dlotVal)}
          </span>
          <div className="mt-1.5 flex justify-between border-t border-slate-200/60 pt-1 text-[10px] dark:border-slate-800">
            <span className="text-slate-400">Std: {formatMoneyCompact(stdDlVal)}</span>
            <span className={`font-bold ${dlDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {dlDiffPct.toFixed(1)}%
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setExplainerKey('oh')}
          className="flex flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <span className="text-[11px] font-bold uppercase text-slate-400">Overhead (OH)</span>
          <span className="mt-1 font-mono text-lg font-black text-slate-700 dark:text-slate-200">
            {formatMoneyCompact(ohVal)}
          </span>
        </button>
      </div>

      {/* Revenue & Cost Trend Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span>Revenue &amp; Cost Trend {aiForecast ? '(with 7-Day AI Projection)' : ''}</span>
          </h3>
        </div>
        <div className="h-72 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendSeries}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v)} />
              <Tooltip formatter={(val) => formatMoneyCompact(val)} />
              <Legend />
              <Area type="monotone" dataKey="sale" name="Revenue" stroke="#16a34a" fill="#16a34a" fillOpacity={0.12} strokeWidth={2} />
              <Line type="monotone" dataKey="cost" name="Total Cost" stroke="#dc2626" strokeDasharray="4 4" strokeWidth={2} dot={false} />
              {aiForecast && (
                <Line type="monotone" dataKey="aiForecast" name="AI Projection" stroke="#0891b2" strokeDasharray="3 3" strokeWidth={2.5} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost Structure + Ops Stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 lg:col-span-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-0">
            <div className="mb-1 text-center text-xs font-bold text-slate-700 dark:text-slate-200">Sale vs Cost</div>
            <div className="h-44 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={saleVsCostPie} dataKey="value" nameKey="name" innerRadius={38} outerRadius={58}>
                    {saleVsCostPie.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatMoneyCompact(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-1 text-center text-xs font-bold text-slate-700 dark:text-slate-200">Cost Breakdown</div>
            <div className="h-44 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={costBreakdownPie} dataKey="value" nameKey="name" outerRadius={58}>
                    {costBreakdownPie.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatMoneyCompact(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-1 text-center text-xs font-bold text-slate-700 dark:text-slate-200">Labor (Std vs Act)</div>
            <div className="h-44 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={laborBarData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip formatter={(v) => formatMoneyCompact(v)} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {laborBarData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-4 lg:grid-cols-1 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-center justify-center rounded-xl bg-blue-50/70 p-3 dark:bg-blue-950/30">
            <div className="font-mono text-2xl font-black text-blue-600 dark:text-blue-400">
              {Number(summary.total_units || 0).toLocaleString()}
            </div>
            <div className="text-[11px] font-bold uppercase text-slate-500">Total Units (FG)</div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl bg-cyan-50/70 p-3 dark:bg-cyan-950/30">
            <div className="font-mono text-2xl font-black text-cyan-700 dark:text-cyan-400">
              {Number(summary.headcount || 0).toLocaleString()}
            </div>
            <div className="text-[11px] font-bold uppercase text-slate-500">Avg Headcount</div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl bg-amber-50/70 p-3 dark:bg-amber-950/30">
            <div className="font-mono text-2xl font-black text-amber-600 dark:text-amber-400">
              {Number(summary.active_lines || 0)}
            </div>
            <div className="text-[11px] font-bold uppercase text-slate-500">Active Lines</div>
          </div>
        </div>
      </div>

      {/* Line Performance Cards */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
          <Activity className="h-4 w-4 text-blue-600" />
          <span>Line Performance (คลิกที่การ์ดเพื่อเจาะลึกรายชั่วโมง / Downtime / Waste / Staff)</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedLines.map((line) => {
            const isProfit = Number(line.gp || 0) >= 0;
            const statusText = line.units > 0 ? 'Running' : line.headcount > 0 ? 'Setup' : 'Idle';
            const statusBadge = line.units > 0
              ? 'bg-emerald-100 text-emerald-700'
              : line.headcount > 0
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-500';
            return (
              <button
                key={line.name}
                type="button"
                onClick={() => setSelectedLine(line.name)}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-black text-slate-900 dark:text-slate-100">{line.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadge}`}>{statusText}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isProfit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    GP {Number(line.gp_percent || 0).toFixed(1)}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 border-y border-slate-100 py-2 text-center dark:border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400">Sale</div>
                    <div className="font-mono text-xs font-bold">{formatMoneyCompact(line.sale)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Cost</div>
                    <div className="font-mono text-xs font-bold">{formatMoneyCompact(line.cost)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Profit</div>
                    <div className={`font-mono text-xs font-black ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatMoneyCompact(line.gp)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  <div className="rounded-lg bg-slate-50 px-2 py-1 dark:bg-slate-800">
                    <span className="text-slate-400">RM:</span> <span className="font-mono font-bold">{formatMoneyCompact(line.rm)}</span>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2 py-1 dark:bg-slate-800">
                    <span className="text-slate-400">DL:</span> <span className="font-mono font-bold">{formatMoneyCompact(line.dlot)}</span>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2 py-1 dark:bg-slate-800">
                    <span className="text-slate-400">OH:</span> <span className="font-mono font-bold">{formatMoneyCompact(line.oh)}</span>
                  </div>
                  <div className="rounded-lg bg-amber-50 px-2 py-1 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    <span>Scrap:</span> <span className="font-mono font-bold">{formatMoneyCompact(line.scrap)}</span>
                  </div>
                  <div className="rounded-lg bg-blue-50 px-2 py-1 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                    <span>HC:</span> <span className="font-mono font-bold">{line.headcount}</span>
                  </div>
                  <div className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <span>Units:</span> <span className="font-mono font-bold">{Number(line.units || 0).toLocaleString()}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <MetricExplainerModal metricKey={explainerKey} onClose={() => setExplainerKey(null)} />
      <LineDetailModal lineName={selectedLine} date={endDate} onClose={() => setSelectedLine(null)} />
      <ExecHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
