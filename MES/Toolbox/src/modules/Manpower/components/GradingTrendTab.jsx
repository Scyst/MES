import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import { gradingTrendApi } from '../../../shared/services/manpowerApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';

const DIMENSIONS = [
  { id: 'overall', label: 'เกรดรวม (4D Overall)' },
  { id: 'iph', label: 'รายได้ต่อหัว (IPH Ratio)' },
  { id: '5s', label: 'กิจกรรม 5ส (5S Audit)' },
  { id: 'attendance', label: 'วินัยเวลา (Attendance)' },
  { id: 'learning', label: 'การเรียนรู้ (Learning/Skill)' },
];

const LINE_PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f97316', '#14b8a6'];

export default function GradingTrendTab({ hcGroup, structure }) {
  const { showToast } = useToast();
  const [lineFilter, setLineFilter] = useState('ALL');
  const [dimension, setDimension] = useState('overall');
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const fetchTrend = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gradingTrendApi.getTrendData({
        line: lineFilter,
        hcGroup,
        dimension,
        months,
      });
      setData(res?.data || null);
    } catch (err) {
      showToast(err.message || 'ไม่สามารถโหลดแนวโน้มเกรดพนักงานได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [lineFilter, hcGroup, dimension, months, showToast]);

  useEffect(() => {
    fetchTrend();
  }, [fetchTrend]);

  const pctChartData = useMemo(() => {
    if (!data?.periods?.length) return [];
    return data.periods.map((p, idx) => {
      const row = { period: p };
      for (const s of data.line_series || []) {
        row[s.name] = s.data[idx];
      }
      return row;
    });
  }, [data]);

  const stackedChartData = useMemo(() => {
    if (!data?.periods?.length) return [];
    return data.periods.map((p, idx) => {
      const row = { period: p };
      for (const st of data.stacked_grades || []) {
        row[st.name] = st.data[idx] || 0;
      }
      return row;
    });
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-medium dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            {DIMENSIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>

          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            <option value="ALL">ทุกสายผลิต</option>
            {(structure?.lines || []).map((ln) => <option key={ln} value={ln}>{ln}</option>)}
          </select>

          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            <option value={6}>ย้อนหลัง 6 เดือน</option>
            <option value={12}>ย้อนหลัง 12 เดือน</option>
            <option value={24}>ย้อนหลัง 24 เดือน</option>
          </select>
        </div>

        <button
          type="button"
          onClick={fetchTrend}
          className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            สัดส่วนพนักงาน Grade A (%) แยกตามสายผลิต
          </h4>
          <div className="h-72 w-full min-w-0">
            {pctChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">ยังไม่มีประวัติการประเมินเกรดรายเดือน</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={pctChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {(data?.line_series || []).slice(0, 8).map((s, idx) => (
                    <Line
                      key={s.name}
                      type="monotone"
                      dataKey={s.name}
                      stroke={LINE_PALETTE[idx % LINE_PALETTE.length]}
                      strokeWidth={2}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <h4 className="mb-3 text-sm font-bold text-slate-800 dark:text-white">การกระจายตัวของเกรด A / B / C / D รายเดือน</h4>
          <div className="h-72 w-full min-w-0">
            {stackedChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">ไม่มีข้อมูลกราฟ</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={stackedChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Grade A" stackId="g" fill="#10b981" />
                  <Bar dataKey="Grade B" stackId="g" fill="#3b82f6" />
                  <Bar dataKey="Grade C" stackId="g" fill="#f59e0b" />
                  <Bar dataKey="Grade D" stackId="g" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Month-over-Month Comparison Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white">
            เปรียบเทียบ % Grade A ({data?.prev_period || '-'} vs {data?.latest_period || '-'})
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-bold dark:bg-slate-900/70">
              <tr>
                <th className="px-4 py-2.5">สายผลิต</th>
                <th className="px-3 py-2.5 text-right">งวดก่อน ({data?.prev_period || '-'})</th>
                <th className="px-3 py-2.5 text-right">งวดล่าสุด ({data?.latest_period || '-'})</th>
                <th className="px-4 py-2.5 text-right">เปลี่ยนแปลง (Delta)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {(data?.comparison || []).length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">ไม่มีข้อมูลเปรียบเทียบรายสายผลิต</td></tr>
              ) : (
                (data?.comparison || []).map((c) => (
                  <tr key={c.line}>
                    <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-white">{c.line}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{c.pct_a_prev !== null ? `${c.pct_a_prev}%` : '-'}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold">{c.pct_a_cur !== null ? `${c.pct_a_cur}%` : '-'}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-bold ${
                      c.delta === null ? 'text-slate-400' : c.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {c.delta === null ? '-' : `${c.delta >= 0 ? '+' : ''}${c.delta}%`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
