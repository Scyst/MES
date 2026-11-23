import React, { useState, useMemo } from 'react';
import { X, BarChart2, Lock, Printer } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  PieChart, Pie, Legend, ComposedChart, Line
} from 'recharts';
import { formatMoney } from '../utils/manpowerHelpers';

const GRADE_COLORS = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#ef4444', UNGRADED: '#94a3b8' };

export default function GradingAnalyticsModal({ isOpen, onClose, rows, period, unlocked, onRequestUnlock }) {
  const [lineFilter, setLineFilter] = useState('ALL');
  const [tab, setTab] = useState('overview'); // overview | performers

  const lines = useMemo(
    () => Array.from(new Set((rows || []).map((r) => r.line).filter(Boolean))).sort(),
    [rows]
  );

  const scopedRows = useMemo(() => {
    if (!rows?.length) return [];
    if (lineFilter === 'ALL') return rows;
    return rows.filter((r) => r.line === lineFilter);
  }, [rows, lineFilter]);

  const stats = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0, UNGRADED: 0 };
    let totalIncome = 0;
    let totalWage = 0;
    const byLineMap = new Map();

    for (const r of scopedRows) {
      const g = String(r.grade_overall || '').toUpperCase();
      if (counts[g] !== undefined) counts[g] += 1;
      else counts.UNGRADED += 1;

      const inc = Number(r.income_per_head || 0);
      const wg = Number(r.total_wage || 0);
      totalIncome += inc;
      totalWage += wg;

      const ln = r.line || 'OTHER';
      if (!byLineMap.has(ln)) {
        byLineMap.set(ln, { line: ln, count: 0, income: 0, wage: 0, gradeA: 0 });
      }
      const lEntry = byLineMap.get(ln);
      lEntry.count += 1;
      lEntry.income += inc;
      lEntry.wage += wg;
      if (g === 'A') lEntry.gradeA += 1;
    }

    const lineChart = Array.from(byLineMap.values())
      .map((x) => ({
        line: x.line,
        avgIncome: x.count > 0 ? Math.round(x.income / x.count) : 0,
        avgWage: x.count > 0 ? Math.round(x.wage / x.count) : 0,
        ratio: x.wage > 0 ? Number((x.income / x.wage).toFixed(2)) : 0,
        gradeAPct: x.count > 0 ? Number(((x.gradeA / x.count) * 100).toFixed(1)) : 0,
        count: x.count,
      }))
      .sort((a, b) => b.ratio - a.ratio);

    const donutData = ['A', 'B', 'C', 'D', 'UNGRADED']
      .map((k) => ({ name: k === 'UNGRADED' ? 'ยังไม่ตัดเกรด' : `Grade ${k}`, value: counts[k], color: GRADE_COLORS[k] }))
      .filter((x) => x.value > 0);

    const sortedByRatio = [...scopedRows].sort((a, b) => Number(b.ratio || 0) - Number(a.ratio || 0));

    return {
      counts,
      totalIncome,
      totalWage,
      avgRatio: totalWage > 0 ? totalIncome / totalWage : 0,
      lineChart,
      donutData,
      top5: sortedByRatio.slice(0, 5),
      bottom5: [...sortedByRatio].reverse().slice(0, 5),
    };
  }, [scopedRows]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-800 px-5 py-3.5 text-white">
          <div className="flex items-center gap-2.5">
            <BarChart2 className="h-5 w-5 text-indigo-200" />
            <div>
              <h4 className="text-base font-extrabold leading-tight">Grading &amp; Productivity Analytics</h4>
              <p className="text-[11px] text-indigo-200">งวดประเมิน: {period} · จำนวน {scopedRows.length} คน</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              className="min-h-[36px] rounded-lg border border-white/25 bg-white/10 px-2.5 text-xs font-semibold text-white outline-none [&>option]:text-slate-900"
            >
              <option value="ALL">ทุกสายผลิต</option>
              {lines.map((ln) => <option key={ln} value={ln}>{ln}</option>)}
            </select>

            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[36px] inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 text-xs font-semibold text-white hover:bg-white/25"
              title="พิมพ์หน้าต่างวิเคราะห์"
            >
              <Printer className="h-3.5 w-3.5" /> พิมพ์
            </button>
            <button type="button" onClick={onClose} className="p-1.5 text-white/80 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sub-Tabs + Quick Stats */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-2 dark:border-slate-700 dark:bg-slate-800/70">
          <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setTab('overview')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${tab === 'overview' ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-800 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}
            >
              ภาพรวม &amp; ความคุ้มค่า (Line Comparison)
            </button>
            <button
              type="button"
              onClick={() => setTab('performers')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${tab === 'performers' ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-800 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Top 5 / Bottom 5 Performers
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span>Avg Ratio: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{unlocked ? `${stats.avgRatio.toFixed(2)}x` : '•••'}</strong></span>
            <span>รายได้รวม: <strong className="font-mono text-emerald-600">{unlocked ? `฿${formatMoney(stats.totalIncome)}` : '•••••'}</strong></span>
            <span>ค่าแรงรวม: <strong className="font-mono text-rose-600">{unlocked ? `฿${formatMoney(stats.totalWage)}` : '•••••'}</strong></span>
            {!unlocked && (
              <button
                type="button"
                onClick={onRequestUnlock}
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-200"
              >
                <Lock className="h-3 w-3" /> ปลดล็อกข้อมูลการเงิน
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'overview' && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="rounded-xl border border-slate-200 p-4 lg:col-span-5 dark:border-slate-700">
                  <h5 className="mb-2 text-xs font-bold uppercase text-slate-500">สัดส่วนเกรดรวม (Grade Distribution)</h5>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.donutData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2}>
                          {stats.donutData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="relative rounded-xl border border-slate-200 p-4 lg:col-span-7 dark:border-slate-700">
                  <h5 className="mb-2 text-xs font-bold uppercase text-slate-500">
                    เปรียบเทียบ IPH Ratio &amp; % เกรด A ตามสายผลิต
                  </h5>
                  {!unlocked && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/80 backdrop-blur-xs dark:bg-slate-900/80">
                      <Lock className="mb-2 h-6 w-6 text-amber-500" />
                      <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">กราฟความคุ้มค่า (Income/Wage Ratio) ถูกล็อกอยู่</p>
                      <button type="button" onClick={onRequestUnlock} className="rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700">
                        ปลดล็อกเพื่อดูกราฟ
                      </button>
                    </div>
                  )}
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={stats.lineChart} margin={{ top: 8, right: 10, left: -10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="line" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={46} />
                        <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit="%" />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Bar yAxisId="left" dataKey="ratio" name="Avg Ratio (x)" fill="#6366f1" radius={[3, 3, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="gradeAPct" name="% Grade A" stroke="#10b981" strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="relative rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <h5 className="mb-2 text-xs font-bold uppercase text-slate-500">รายได้เฉลี่ย vs ค่าแรงเฉลี่ยต่อหัวตามสายผลิต (THB/Person)</h5>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.lineChart} margin={{ top: 8, right: 12, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="line" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={46} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(val) => (unlocked ? `฿${formatMoney(val)}` : 'Locked')} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="avgIncome" name="Avg Income/Head" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="avgWage" name="Avg Wage/Head" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {tab === 'performers' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {[
                { title: 'Top 5 Performers (By IPH Ratio)', list: stats.top5, cls: 'text-emerald-600' },
                { title: 'Bottom 5 Performers (By IPH Ratio)', list: stats.bottom5, cls: 'text-rose-600' },
              ].map((blk) => (
                <div key={blk.title} className="rounded-xl border border-slate-200 overflow-hidden dark:border-slate-700">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
                    <span className={blk.cls}>{blk.title}</span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 text-[11px] font-bold text-slate-500 dark:bg-slate-900/50">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">พนักงาน</th>
                        <th className="px-3 py-2 text-right">Ratio</th>
                        <th className="px-3 py-2 text-center">Overall</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {blk.list.map((p, idx) => (
                        <tr key={p.emp_id}>
                          <td className="px-3 py-2 font-mono">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-800 dark:text-white">{p.name_th}</div>
                            <div className="text-[10px] text-slate-400">{p.emp_id} · {p.line}</div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold">
                            {unlocked ? `${Number(p.ratio || 0).toFixed(2)}x` : '•••'}
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-extrabold">{p.grade_overall || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
