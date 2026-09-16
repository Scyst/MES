// PaintChemHistoryPage.jsx — History table with date filter + OOR summary
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const API_BASE = '/MES/page/paintChem/api';

function StatusBadge({ status }) {
  const map = {
    DRAFT:     { cls: 'bg-gray-100 text-gray-600',    label: 'ร่าง' },
    SUBMITTED: { cls: 'bg-yellow-100 text-yellow-700', label: 'รอตรวจสอบ' },
    APPROVED:  { cls: 'bg-green-100 text-green-700',   label: 'อนุมัติแล้ว' },
  };
  const s = map[status] ?? { cls: 'bg-gray-100 text-gray-500', label: status };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

export default function PaintChemHistoryPage() {
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dateTo,   setDateTo]   = useState(new Date().toISOString().slice(0, 10));
  const [shift,    setShift]    = useState('');
  const [page,     setPage]     = useState(1);
  const [data,     setData]     = useState({ items: [], total: 0, total_pages: 1 });
  const [loading,  setLoading]  = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/get_history.php`, {
        params: { date_from: dateFrom, date_to: dateTo, shift, page },
      });
      if (res.data.success) setData(res.data.data);
    } catch {
      // silently fail — user can retry
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [page]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => { setPage(1); fetchHistory(); };

  return (
    <div className="max-w-4xl mx-auto px-3 py-4">
      <h1 className="text-base font-bold text-gray-800 mb-4">ประวัติบันทึกเคมีสี — PAINT Line</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">จากวันที่</label>
            <input type="date" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">ถึงวันที่</label>
            <input type="date" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">กะ</label>
            <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={shift} onChange={(e) => setShift(e.target.value)}>
              <option value="">ทั้งหมด</option>
              <option value="DAY">กลางวัน</option>
              <option value="NIGHT">กลางคืน</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleSearch}
              className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 rounded transition-colors">
              <Search size={14} /> ค้นหา
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">กำลังโหลด...</div>
        ) : data.items.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">ไม่พบข้อมูล</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">วันที่</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">กะ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">สถานะ</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">OOR</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">รายการทั้งหมด</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ผู้เตรียม</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">อัปเดต</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((row) => (
                  <tr key={row.header_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.log_date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.shift === 'DAY' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {row.shift === 'DAY' ? '☀ กลางวัน' : '🌙 กลางคืน'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {row.oor_count > 0 ? (
                        <span className="flex items-center justify-end gap-1 text-red-600 font-semibold">
                          <AlertTriangle size={12} /> {row.oor_count}
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-green-600">
                          <CheckCircle2 size={12} /> 0
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.total_entries}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{row.prepared_by_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      <span className="flex items-center gap-1"><Clock size={11} />{row.updated_at?.slice(0, 16)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              {data.total} รายการ — หน้า {data.page} / {data.total_pages}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:border-blue-400 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))} disabled={page === data.total_pages}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:border-blue-400 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
