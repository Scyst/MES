import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '../utils/fleetLogHelpers';

export default function FleetAnalyticsChart({ dailyTrend = [] }) {
  if (!Array.isArray(dailyTrend) || dailyTrend.length === 0) {
    return null;
  }

  const chartData = dailyTrend.map((item) => ({
    ...item,
    shortDay: String(item.log_day || '').slice(5)
  }));

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm w-full">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              แนวโน้มจำนวนเที่ยวรถและค่าขนส่งรายวัน
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              เปรียบเทียบปริมาณการเดินรถกับค่าใช้จ่ายขนส่งรายวันตามตัวกรองที่เลือก
            </p>
          </div>
        </div>
      </div>

      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
            <XAxis dataKey="shortDay" tick={{ fontSize: 11 }} className="text-slate-500" />
            <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              width={64}
              tickFormatter={(val) => `฿${Number(val).toLocaleString()}`}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'ค่าขนส่งรวม (฿)') return [`฿${formatCurrency(value)}`, name];
                return [`${value} เที่ยว`, name];
              }}
              labelFormatter={(label) => `วันที่ ${label}`}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar
              yAxisId="left"
              dataKey="trips"
              name="จำนวนเที่ยว (ครั้ง)"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              barSize={24}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="total_cost"
              name="ค่าขนส่งรวม (฿)"
              stroke="#e11d48"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
