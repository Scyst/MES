import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend
} from 'recharts';
import { Layers, BarChart2, DollarSign, Activity } from 'lucide-react';

export default function HourlyCostChart({ data, trends, isRange = false }) {
  const [chartMode, setChartMode] = useState('stacked'); // 'stacked' | 'grouped'
  const [metricType, setMetricType] = useState('cost'); // 'cost' | 'usage'

  const chartData = useMemo(() => {
    const raw = Array.isArray(data) ? data : (Array.isArray(trends) ? trends : []);
    if (!raw || raw.length === 0) return [];
    if (isRange) return raw;

    // Order single-day hourly data along the 08:00 -> 07:00 production shift day
    const byHour = new Map();
    raw.forEach((row) => {
      const hourMatch = String(row.label ?? row.key ?? '').match(/^(\d{1,2})/);
      if (hourMatch) {
        const hr = parseInt(hourMatch[1], 10);
        if (!Number.isNaN(hr) && hr >= 0 && hr <= 23) {
          byHour.set(hr, row);
        }
      }
    });

    if (byHour.size === 0) return raw;

    const shiftRows = [];
    for (let i = 8; i < 32; i++) {
      const hr = i % 24;
      const existing = byHour.get(hr);
      shiftRows.push(
        existing || {
          label: `${String(hr).padStart(2, '0')}:00`,
          key: hr,
          elec_usage: 0,
          elec_cost: 0,
          peak_kwh: 0,
          offpeak_kwh: 0,
          peak_cost: 0,
          offpeak_cost: 0,
          lpg_usage: 0,
          lpg_cost: 0,
          total_cost: 0
        }
      );
    }
    return shiftRows;
  }, [data, trends, isRange]);

  if (chartData.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-xs font-semibold">ไม่มีข้อมูลการใช้พลังงานในช่วงเวลานี้</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0]?.payload || {};
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs min-w-[200px] z-50">
          <p className="font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2 flex items-center justify-between">
            <span>{isRange ? `วันที่ ${label}` : `เวลา ${label} น.`}</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
              ฿{Number(item.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </p>

          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Elec Peak (09-22น.):</span>
              </span>
              <span className="font-bold">
                {metricType === 'cost'
                  ? `฿${Number(item.peak_cost || 0).toFixed(2)}`
                  : `${Number(item.peak_kwh || 0).toFixed(1)} kWh`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Elec Off-Peak:</span>
              </span>
              <span className="font-bold">
                {metricType === 'cost'
                  ? `฿${Number(item.offpeak_cost || 0).toFixed(2)}`
                  : `${Number(item.offpeak_kwh || 0).toFixed(1)} kWh`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>LPG Gas:</span>
              </span>
              <span className="font-bold">
                {metricType === 'cost'
                  ? `฿${Number(item.lpg_cost || 0).toFixed(2)}`
                  : `${Number(item.lpg_usage || 0).toFixed(1)} m³`}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-3.5 sm:p-5 flex flex-col">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>{isRange ? 'แนวโน้มค่าพลังงานรายวัน (Daily Utility Breakdown)' : 'การใช้พลังงานรายชั่วโมง (Hourly Utility Consumption)'}</span>
          </h3>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
            เปรียบเทียบค่าไฟฟ้าตามช่วงเวลา TOU (Peak / Off-Peak) และก๊าซ LPG
          </p>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
          {/* Cost vs Usage Toggle */}
          <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setMetricType('cost')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                metricType === 'cost'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <DollarSign className="w-3 h-3" />
              <span>มูลค่า (฿)</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricType('usage')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                metricType === 'usage'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>หน่วย (kWh/m³)</span>
            </button>
          </div>

          {/* Stacked vs Grouped Toggle */}
          <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setChartMode('stacked')}
              title="Stacked: รวมยอดสัดส่วน"
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                chartMode === 'stacked'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span className="hidden sm:inline">Stacked</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('grouped')}
              title="Grouped: เปรียบเทียบเคียงข้าง"
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                chartMode === 'grouped'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              <span className="hidden sm:inline">Grouped</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recharts Canvas */}
      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -5, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fill: '#64748b', fontSize: 10 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickFormatter={(val) => {
                if (val >= 1000) return `${Number((val / 1000).toFixed(1))}k`;
                return val;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              formatter={(value) => {
                if (value === 'peak_cost' || value === 'peak_kwh') return 'Elec Peak (09-22น.)';
                if (value === 'offpeak_cost' || value === 'offpeak_kwh') return 'Elec Off-Peak';
                if (value === 'lpg_cost' || value === 'lpg_usage') return 'LPG Gas';
                return value;
              }}
            />

            {metricType === 'cost' ? (
              <>
                <Bar
                  dataKey="peak_cost"
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  fill="#f59e0b"
                  radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                  name="peak_cost"
                />
                <Bar
                  dataKey="offpeak_cost"
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  fill="#3b82f6"
                  radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                  name="offpeak_cost"
                />
                <Bar
                  dataKey="lpg_cost"
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  fill="#ef4444"
                  radius={chartMode === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]}
                  name="lpg_cost"
                />
              </>
            ) : (
              <>
                <Bar
                  dataKey="peak_kwh"
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  fill="#f59e0b"
                  radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                  name="peak_kwh"
                />
                <Bar
                  dataKey="offpeak_kwh"
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  fill="#3b82f6"
                  radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                  name="offpeak_kwh"
                />
                <Bar
                  dataKey="lpg_usage"
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  fill="#ef4444"
                  radius={chartMode === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]}
                  name="lpg_usage"
                />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
