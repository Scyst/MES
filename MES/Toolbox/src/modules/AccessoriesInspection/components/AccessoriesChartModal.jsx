import React, { useMemo } from 'react';
import { BarChart3, RefreshCw, X } from 'lucide-react';
import {
  GAP_LIMIT_SEC,
  buildInspectionChartAnalytics,
  niceChartMax,
} from '../utils/accessoriesHelpers';

function fmtSecStat(val) {
  return val === null || !Number.isFinite(val) ? '–' : `${val.toFixed(1)}s`;
}

function fmtHhmm(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtHhmmss(ms) {
  const d = new Date(ms);
  return `${fmtHhmm(ms)}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function HourAxisTicks({ t0, t1, left, right, height, bottom }) {
  if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) return null;
  const span = (t1 - t0) / 3600000;
  const step = span > 13 ? 2 : 1;
  const xOf = (t) => left + ((right - left) * (t - t0)) / (t1 - t0);
  const ticks = [];

  for (let t = t0, i = 0; t <= t1; t += 3600000, i += 1) {
    if (i % step !== 0) continue;
    const x = xOf(t);
    ticks.push(
      <g key={t}>
        <line x1={x} x2={x} y1={height - bottom} y2={height - bottom + 4} className="stroke-slate-400" strokeWidth={1} />
        <text x={x} y={height - bottom + 16} textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 text-[11px]">
          {fmtHhmm(t)}
        </text>
      </g>
    );
  }
  return <>{ticks}</>;
}

function YGridLines({ left, right, top, bottom, height, ymax, ticks = 4, formatTick }) {
  return Array.from({ length: ticks + 1 }, (_, i) => {
    const val = (ymax * i) / ticks;
    const y = height - bottom - ((height - top - bottom) * i) / ticks;
    return (
      <g key={i}>
        <line x1={left} x2={right} y1={y} y2={y} className="stroke-slate-200 dark:stroke-slate-700/70" strokeWidth={1} />
        <text x={left - 6} y={y + 4} textAnchor="end" className="fill-slate-500 dark:fill-slate-400 text-[11px]">
          {formatTick(val)}
        </text>
      </g>
    );
  });
}

function HourlyStackedChart({ buckets }) {
  const W = 760;
  const H = 210;
  const L = 40;
  const R = W - 12;
  const T = 16;
  const B = 26;
  const nH = Math.max(1, buckets.length);
  const ymax = niceChartMax(Math.max(1, ...buckets.map((b) => b.ok + b.alarm)));
  const slot = (R - L) / nH;
  const bw = Math.max(6, Math.min(34, slot * 0.62));
  const yOf = (v) => H - B - ((H - T - B) * v) / ymax;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[210px] overflow-visible" role="img" aria-label="จำนวนงาน OK/ALARM รายชั่วโมง">
      <YGridLines left={L} right={R} top={T} bottom={B} height={H} ymax={ymax} formatTick={(v) => Math.round(v)} />
      {buckets.map((b, i) => {
        const x = L + slot * i + (slot - bw) / 2;
        const yOk = yOf(b.ok);
        const total = b.ok + b.alarm;
        const yTot = yOf(total);
        const hLabel = `${fmtHhmm(b.startMs)}–${fmtHhmm(b.startMs + 3600000)}`;
        const alarmH = Math.max(0, yOk - yTot - (b.ok > 0 ? 2 : 0));

        return (
          <g key={b.index}>
            <title>{`${hLabel}\nOK ${b.ok} · ALARM ${b.alarm} · รวม ${total}`}</title>
            <rect x={L + slot * i} y={T} width={slot} height={H - T - B} fill="transparent" />
            {b.ok > 0 && <rect x={x} y={yOk} width={bw} height={H - B - yOk} rx={2} className="fill-emerald-500" />}
            {b.alarm > 0 && <rect x={x} y={yTot} width={bw} height={alarmH} rx={2} className="fill-rose-500" />}
            {total > 0 && (
              <text x={x + bw / 2} y={yTot - 4} textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-[10px] font-semibold">
                {total}
              </text>
            )}
            {(nH <= 13 || i % 2 === 0) && (
              <text x={L + slot * i + slot / 2} y={H - B + 16} textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 text-[11px]">
                {fmtHhmm(b.startMs).slice(0, 2)}
              </text>
            )}
          </g>
        );
      })}
      <line x1={L} x2={R} y1={H - B} y2={H - B} className="stroke-slate-400" strokeWidth={1} />
    </svg>
  );
}

function IdleGapChart({ gaps, t0, t1 }) {
  if (!gaps.length) {
    return (
      <div className="py-7 text-center text-xs text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
        ยังไม่มีข้อมูล S1 เข้า/ออก ในช่วงนี้
      </div>
    );
  }
  const W = 760;
  const H = 210;
  const L = 48;
  const R = W - 12;
  const T = 14;
  const B = 26;
  const ymax = niceChartMax(Math.max(GAP_LIMIT_SEC * 1.1, ...gaps.map((p) => p.g)));
  const xOf = (t) => L + ((R - L) * (t - t0)) / Math.max(1, t1 - t0);
  const yOf = (v) => H - B - ((H - T - B) * v) / ymax;
  const yLim = yOf(GAP_LIMIT_SEC);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[210px] overflow-visible" role="img" aria-label="Idle ตามเวลา">
      <YGridLines left={L} right={R} top={T} bottom={B} height={H} ymax={ymax} formatTick={(v) => `${Math.round(v)}s`} />
      <HourAxisTicks t0={t0} t1={t1} left={L} right={R} height={H} bottom={B} />
      <line x1={L} x2={R} y1={yLim} y2={yLim} stroke="#d97706" strokeWidth={1.5} strokeDasharray="5 4" />
      <text x={R} y={yLim - 4} textAnchor="end" className="fill-amber-600 dark:fill-amber-400 text-[11px] font-semibold">
        {GAP_LIMIT_SEC}s
      </text>
      <polyline
        fill="none"
        stroke="#2563eb"
        strokeOpacity={0.45}
        strokeWidth={1.5}
        points={gaps.map((p) => `${xOf(p.t)},${yOf(p.g)}`).join(' ')}
      />
      {gaps.map((p, idx) => {
        const cx = xOf(p.t);
        const cy = yOf(p.g);
        const over = p.g >= GAP_LIMIT_SEC;
        return (
          <g key={`${p.t}_${idx}`}>
            <title>{`${fmtHhmmss(p.t)} · ${p.model}\nIdle ${p.g.toFixed(1)}s`}</title>
            <circle cx={cx} cy={cy} r={8} fill="transparent" />
            <circle
              cx={cx}
              cy={cy}
              r={over ? 4.5 : 3.5}
              className={over ? 'fill-amber-500 stroke-white dark:stroke-slate-900' : 'fill-blue-600 stroke-white dark:stroke-slate-900'}
              strokeWidth={1.5}
            />
          </g>
        );
      })}
      <line x1={L} x2={R} y1={H - B} y2={H - B} className="stroke-slate-400" strokeWidth={1} />
    </svg>
  );
}

function DetectDurationChart({ points, medianSec, t0, t1 }) {
  if (!points.length) {
    return (
      <div className="py-7 text-center text-xs text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
        ยังไม่มีข้อมูล S1 เข้า/ออก ในช่วงนี้
      </div>
    );
  }
  const W = 760;
  const H = 210;
  const L = 48;
  const R = W - 12;
  const T = 14;
  const B = 26;
  const ymax = niceChartMax(Math.max(...points.map((p) => p.v)) * 1.1);
  const xOf = (t) => L + ((R - L) * (t - t0)) / Math.max(1, t1 - t0);
  const yOf = (v) => H - B - ((H - T - B) * v) / ymax;
  const yMed = medianSec !== null ? yOf(medianSec) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[210px] overflow-visible" role="img" aria-label="Detect ตามเวลา">
      <YGridLines left={L} right={R} top={T} bottom={B} height={H} ymax={ymax} formatTick={(v) => `${Math.round(v)}s`} />
      <HourAxisTicks t0={t0} t1={t1} left={L} right={R} height={H} bottom={B} />
      {yMed !== null && (
        <>
          <line x1={L} x2={R} y1={yMed} y2={yMed} className="stroke-slate-500" strokeWidth={1.5} strokeDasharray="2 4" />
          <text x={R} y={yMed - 4} textAnchor="end" className="fill-slate-500 dark:fill-slate-400 text-[11px]">
            ค่ากลาง {medianSec.toFixed(1)}s
          </text>
        </>
      )}
      <polyline
        fill="none"
        stroke="#2563eb"
        strokeOpacity={0.4}
        strokeWidth={1.5}
        points={points.map((p) => `${xOf(p.t)},${yOf(p.v)}`).join(' ')}
      />
      {points.map((p, idx) => (
        <g key={`${p.t}_${idx}`}>
          <title>{`${fmtHhmmss(p.t)} · ${p.model} · ${p.isOk ? 'OK' : 'ALARM'}\nDetect ${p.v.toFixed(1)}s`}</title>
          <circle cx={xOf(p.t)} cy={yOf(p.v)} r={8} fill="transparent" />
          <circle
            cx={xOf(p.t)}
            cy={yOf(p.v)}
            r={p.isOk ? 3.5 : 4.5}
            className={p.isOk ? 'fill-emerald-500 stroke-white dark:stroke-slate-900' : 'fill-rose-500 stroke-white dark:stroke-slate-900'}
            strokeWidth={1.5}
          />
        </g>
      ))}
      <line x1={L} x2={R} y1={H - B} y2={H - B} className="stroke-slate-400" strokeWidth={1} />
    </svg>
  );
}

function S1TimelineStrip({ segments, t0, t1 }) {
  if (!segments.length) {
    return (
      <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
        ยังไม่มีข้อมูล S1 เข้า/ออก ในช่วงนี้
      </div>
    );
  }
  const W = 760;
  const H = 88;
  const L = 12;
  const R = W - 12;
  const T = 10;
  const B = 26;
  const span = Math.max(1, t1 - t0);
  const xOf = (t) => L + ((R - L) * (Math.min(Math.max(t, t0), t1) - t0)) / span;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[88px] overflow-visible" role="img" aria-label="Timeline ช่วงที่มีงานอยู่ที่ S1">
      <rect x={L} y={T} width={R - L} height={H - T - B} rx={3} className="fill-slate-100 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-700" />
      <HourAxisTicks t0={t0} t1={t1} left={L} right={R} height={H} bottom={B} />
      {segments.map((seg, idx) => {
        const x = xOf(seg.a);
        const w = Math.max(1.5, xOf(seg.b) - x);
        return (
          <g key={`${seg.a}_${idx}`}>
            <title>{`${seg.model} · ${seg.isOk ? 'OK' : 'ALARM'}\nS1 เข้า ${fmtHhmmss(seg.a)} → ออก ${fmtHhmmss(seg.b)} (${((seg.b - seg.a) / 1000).toFixed(1)}s)`}</title>
            <rect x={x} y={T} width={w} height={H - T - B} className={seg.isOk ? 'fill-emerald-500' : 'fill-rose-500'} />
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Interactive SVG Analytics Modal displaying Hourly OK/ALARM, Idle Gap, Detect Duration,
 * and S1 Occupancy Timeline matching legacy production charts.
 */
export default function AccessoriesChartModal({
  isOpen,
  onClose,
  rows,
  rangeStart,
  rangeEnd,
  shift,
  loading,
}) {
  const analytics = useMemo(
    () => buildInspectionChartAnalytics(rows, rangeStart, rangeEnd, GAP_LIMIT_SEC),
    [rows, rangeStart, rangeEnd]
  );

  if (!isOpen) return null;

  const shiftLabel = { all: 'ทุกกะ', day: 'กะเช้า', night: 'กะดึก' }[shift] || '';
  const { stats } = analytics;
  const kpiTiles = [
    { label: 'ทั้งหมด', val: stats.total, accent: '' },
    { label: 'OK', val: stats.ok, accent: 'border-l-4 border-l-emerald-500' },
    { label: 'ALARM', val: stats.alarm, accent: 'border-l-4 border-l-rose-500' },
    { label: 'Idle เฉลี่ย', val: fmtSecStat(stats.idleAvg), accent: '' },
    { label: 'Idle ค่ากลาง', val: fmtSecStat(stats.idleMed), accent: '' },
    { label: 'Idle สูงสุด', val: fmtSecStat(stats.idleMax), accent: '' },
    { label: `เกิน ${GAP_LIMIT_SEC}s`, val: `${stats.idleOverLimit} ครั้ง`, accent: stats.idleOverLimit > 0 ? 'border-l-4 border-l-amber-500' : '' },
    { label: 'Detect เฉลี่ย', val: fmtSecStat(stats.detectAvg), accent: '' },
    { label: 'Detect ค่ากลาง', val: fmtSecStat(stats.detectMed), accent: '' },
    { label: 'Detect สูงสุด', val: fmtSecStat(stats.detectMax), accent: '' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <BarChart3 size={18} className="text-blue-600 shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
              กราฟวิเคราะห์รอบเวลาการทำงาน (Cycle & S1 Analytics)
            </h3>
            <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400">
              {shiftLabel} · {String(rangeStart || '').slice(0, 16)} → {String(rangeEnd || '').slice(0, 16)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {loading && <RefreshCw size={15} className="animate-spin text-blue-600" />}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              aria-label="ปิดหน้าต่างกราฟ"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto space-y-5">
          {/* 10 KPI Summary Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {kpiTiles.map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/70 px-3 py-2 ${item.accent}`}
              >
                <div className="text-[11px] text-gray-500 dark:text-gray-400">{item.label}</div>
                <div className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white tabular-nums">
                  {item.val}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-bold text-gray-800 dark:text-gray-200">จำนวนงานรายชั่วโมง</span>
              <div className="flex items-center gap-3 text-gray-500">
                <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" /> OK</span>
                <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" /> ALARM</span>
              </div>
            </div>
            <HourlyStackedChart buckets={analytics.hourlyBuckets} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-bold text-gray-800 dark:text-gray-200">Idle (วินาที) — งานพ้น S1 → ชิ้นถัดไปเข้า S1</span>
              <span className="text-amber-600 dark:text-amber-400">--- เกณฑ์ {GAP_LIMIT_SEC}s</span>
            </div>
            <IdleGapChart gaps={analytics.gaps} t0={analytics.t0} t1={analytics.t1} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-bold text-gray-800 dark:text-gray-200">Detect (วินาที) — Sensor 1 จับงานอยู่นานเท่าไหร่</span>
              <div className="flex items-center gap-3 text-gray-500">
                <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" /> OK</span>
                <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" /> ALARM</span>
                <span>··· ค่ากลาง</span>
              </div>
            </div>
            <DetectDurationChart points={analytics.detectPoints} medianSec={stats.detectMed} t0={analytics.t0} t1={analytics.t1} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-bold text-gray-800 dark:text-gray-200">Timeline — ช่วงที่มีงานอยู่ที่ S1</span>
              <div className="flex items-center gap-3 text-gray-500">
                <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" /> OK</span>
                <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" /> ALARM</span>
                <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-xs bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 inline-block" /> ว่าง</span>
              </div>
            </div>
            <S1TimelineStrip segments={analytics.timelineSegments} t0={analytics.t0} t1={analytics.t1} />
          </div>
        </div>
      </div>
    </div>
  );
}
