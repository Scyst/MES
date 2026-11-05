import React, { useState, useMemo } from 'react';
import {
  Zap, Flame, Search, Filter, Activity, CheckCircle2,
  AlertTriangle, ArrowUpDown, ChevronDown
} from 'lucide-react';

export default function MetersTable({ meters = [], isRange = false }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'ELECTRIC' | 'LPG'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ONLINE' | 'OFFLINE'
  const [sortField, setSortField] = useState('period_cost');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredMeters = useMemo(() => {
    return meters
      .filter((m) => {
        const matchSearch = (m.meter_name || '').toLowerCase().includes(search.toLowerCase());
        const matchType = typeFilter === 'ALL' || m.utility_type === typeFilter;
        const matchStatus = statusFilter === 'ALL' || m.status === statusFilter;
        return matchSearch && matchType && matchStatus;
      })
      .sort((a, b) => {
        let valA = a[sortField] ?? 0;
        let valB = b[sortField] ?? 0;
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [meters, search, typeFilter, statusFilter, sortField, sortAsc]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
      {/* Header and Toolbar */}
      <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div>
          <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>สถานะและการใช้พลังงานรายมิเตอร์ (Submeters Status)</span>
          </h3>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
            แสดง {filteredMeters.length} จากทั้งหมด {meters.length} มิเตอร์
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-56 min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อมิเตอร์..."
              className="w-full text-xs pl-8 pr-2.5 py-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
          >
            <option value="ALL">ทุกประเภทพลังงาน</option>
            <option value="ELECTRIC">⚡ ไฟฟ้า (Electric)</option>
            <option value="LPG">🔥 ก๊าซ (LPG)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="ONLINE">🟢 ออนไลน์ (Online)</option>
            <option value="OFFLINE">🔴 ออฟไลน์ (Offline)</option>
          </select>
        </div>
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0">
            <tr>
              <th className="py-2.5 px-4 cursor-pointer" onClick={() => handleSort('meter_name')}>
                <div className="flex items-center gap-1">
                  <span>ชื่อมิเตอร์ (Meter Name)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-3">ประเภท</th>
              <th className="py-2.5 px-3 text-center">สถานะ</th>
              <th className="py-2.5 px-3 text-right cursor-pointer" onClick={() => handleSort('power_kw')}>
                <div className="flex items-center justify-end gap-1">
                  <span>กำลังไฟ (kW) / Flow</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-right">แรงดัน (V)</th>
              <th className="py-2.5 px-3 text-right">กระแส (A)</th>
              <th className="py-2.5 px-3 text-center">PF</th>
              <th className="py-2.5 px-3 text-right cursor-pointer" onClick={() => handleSort('period_usage')}>
                <div className="flex items-center justify-end gap-1">
                  <span>การใช้ (kWh / m³)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-4 text-right cursor-pointer" onClick={() => handleSort('period_cost')}>
                <div className="flex items-center justify-end gap-1">
                  <span>ค่าพลังงานรวม (฿)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredMeters.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  ไม่พบมิเตอร์ตามเงื่อนไขที่เลือก
                </td>
              </tr>
            ) : (
              filteredMeters.map((m, idx) => {
                const isOnline = m.status === 'ONLINE';
                const isElec = m.utility_type === 'ELECTRIC';
                const powerKw = parseFloat(m.power_kw ?? 0);
                const flowRate = parseFloat(m.flow_rate ?? 0);
                const pf = parseFloat(m.power_factor ?? 0);
                const periodUsage = parseFloat(m.period_usage ?? 0);
                const periodCost = parseFloat(m.period_cost ?? 0);

                return (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        {isElec ? (
                          <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        ) : (
                          <Flame className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        )}
                        <span>{m.meter_name}</span>
                        {m.meter_name === 'MDB' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                            MAIN
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isElec
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                      }`}>
                        {m.utility_type}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isOnline
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span>{m.status}</span>
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {isElec ? `${powerKw.toFixed(1)} kW` : `${flowRate.toFixed(1)} m³/h`}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {isElec && m.voltage ? `${parseFloat(m.voltage).toFixed(1)} V` : '-'}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {isElec && m.current_amp ? `${parseFloat(m.current_amp).toFixed(1)} A` : '-'}
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono">
                      {isElec && pf > 0 ? (
                        <span className={`font-bold ${pf >= 0.90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {pf.toFixed(2)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      {periodUsage.toLocaleString(undefined, { maximumFractionDigits: 1 })}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">{isElec ? 'kWh' : 'm³'}</span>
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                      ฿{periodCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="block md:hidden p-2 space-y-2">
        {filteredMeters.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            ไม่พบมิเตอร์ตามเงื่อนไขที่เลือก
          </div>
        ) : (
          filteredMeters.map((m, idx) => {
            const isOnline = m.status === 'ONLINE';
            const isElec = m.utility_type === 'ELECTRIC';
            const powerKw = parseFloat(m.power_kw ?? 0);
            const flowRate = parseFloat(m.flow_rate ?? 0);
            const pf = parseFloat(m.power_factor ?? 0);
            const periodUsage = parseFloat(m.period_usage ?? 0);
            const periodCost = parseFloat(m.period_cost ?? 0);

            return (
              <div
                key={idx}
                className={`rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 shadow-xs border-l-4 ${
                  isElec ? 'border-l-amber-500' : 'border-l-rose-500'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isElec ? (
                      <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    ) : (
                      <Flame className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    )}
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {m.meter_name}
                    </span>
                    {m.meter_name === 'MDB' && (
                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700">
                        MAIN
                      </span>
                    )}
                  </div>

                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                    isOnline
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    <span>{m.status}</span>
                  </span>
                </div>

                {/* Metrics 3-split */}
                <div className="grid grid-cols-3 text-center border-t border-slate-100 dark:border-slate-800 pt-2 mt-1.5 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg py-1.5 divide-x divide-slate-200/80 dark:divide-slate-700/80">
                  <div className="min-w-0 px-1">
                    <span className="text-[10px] text-slate-400 block truncate">กำลังไฟ / Flow</span>
                    <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 block truncate">
                      {isElec ? `${powerKw.toFixed(1)} kW` : `${flowRate.toFixed(1)} m³`}
                    </span>
                  </div>

                  <div className="min-w-0 px-1">
                    <span className="text-[10px] text-slate-400 block truncate">การใช้ ({isElec ? 'kWh' : 'm³'})</span>
                    <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 block truncate">
                      {periodUsage.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </span>
                  </div>

                  <div className="min-w-0 px-1">
                    <span className="text-[10px] text-slate-400 block truncate">มูลค่ารวม</span>
                    <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400 block truncate">
                      ฿{periodCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {isElec && (m.voltage || m.current_amp || pf > 0) && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1.5 pt-1">
                    <span>{m.voltage ? `${parseFloat(m.voltage).toFixed(0)}V` : ''} • {m.current_amp ? `${parseFloat(m.current_amp).toFixed(1)}A` : ''}</span>
                    <span>PF: <strong className={pf >= 0.9 ? 'text-emerald-600' : 'text-amber-600'}>{pf > 0 ? pf.toFixed(2) : '-'}</strong></span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
