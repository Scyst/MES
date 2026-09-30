// PaintChemHistoryPage.jsx โ€” History table with date filter + OOR summary
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Clock, FileText } from 'lucide-react';

const API_BASE = '/iot-toolbox/sandbox-b9/MES/MES/page/paintChem/api';

function StatusBadge({ status }) {
  const map = {
    DRAFT:     { cls: 'bg-gray-100 text-gray-600',    label: 'เธฃเนเธฒเธ' },
    SUBMITTED: { cls: 'bg-yellow-100 text-yellow-700', label: 'เธฃเธญเธ•เธฃเธงเธเธชเธญเธ' },
    APPROVED:  { cls: 'bg-green-100 text-green-700',   label: 'เธญเธเธธเธกเธฑเธ•เธดเนเธฅเนเธง' },
  };
  const s = map[status] ?? { cls: 'bg-gray-100 text-gray-500', label: status };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

import { Eye, X } from 'lucide-react';

export default function PaintChemHistoryDrawer({ isOpen, onClose, onSelectRecord }) {
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
      // silently fail โ€” user can retry
    } finally {
      setLoading(false);
    }
  };

  // Fetch when drawer opens, or when page changes
  useEffect(() => {
    if (isOpen) fetchHistory();
  }, [isOpen, page]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => { setPage(1); fetchHistory(); };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        ></div>
      )}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-5xl bg-gray-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-800">เธเธฃเธฐเธงเธฑเธ•เธดเธเธฑเธเธ—เธถเธเน€เธเธกเธตเธชเธต โ€” PAINT Line</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar w-full max-w-full">
          <div className="w-full">

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">เธเธฒเธเธงเธฑเธเธ—เธตเน</label>
            <input type="date" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">เธ–เธถเธเธงเธฑเธเธ—เธตเน</label>
            <input type="date" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">เธเธฐ</label>
            <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={shift} onChange={(e) => setShift(e.target.value)}>
              <option value="">เธ—เธฑเนเธเธซเธกเธ”</option>
              <option value="DAY">เธเธฅเธฒเธเธงเธฑเธ</option>
              <option value="NIGHT">เธเธฅเธฒเธเธเธทเธ</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleSearch}
              className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 rounded transition-colors">
              <Search size={14} /> เธเนเธเธซเธฒ
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">เธเธณเธฅเธฑเธเนเธซเธฅเธ”...</div>
        ) : data.items.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">เนเธกเนเธเธเธเนเธญเธกเธนเธฅ</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">เธงเธฑเธเธ—เธตเน</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">เธเธฐ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">เธชเธ–เธฒเธเธฐ</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">OOR</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">เธฃเธฒเธขเธเธฒเธฃเธ—เธฑเนเธเธซเธกเธ”</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">เธเธนเนเน€เธ•เธฃเธตเธขเธก</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">เธญเธฑเธเน€เธ”เธ•</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">เธเธฑเธ”เธเธฒเธฃ</th>
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
                        {row.shift === 'DAY' ? 'โ€ เธเธฅเธฒเธเธงเธฑเธ' : '๐ เธเธฅเธฒเธเธเธทเธ'}
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
                    <td className="px-4 py-3 text-gray-600 text-xs">{row.prepared_by_name ?? 'โ€”'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      <span className="flex items-center gap-1"><Clock size={11} />{row.updated_at?.slice(0, 16)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                          onClick={() => onSelectRecord && onSelectRecord(row.log_date, row.shift)}
                          className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors mr-2"
                          title="เธ”เธนเธเนเธญเธกเธนเธฅ"
                        >
                          <Eye size={16} />
                        </button>
                        <a 
                        href={`${API_BASE}/export_pdf.php?date=${row.log_date}&shift=${row.shift}&t=${Date.now()}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        title="เธ”เธฒเธงเธเนเนเธซเธฅเธ” PDF"
                      >
                        <FileText size={16} />
                      </a>
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
              {data.total} เธฃเธฒเธขเธเธฒเธฃ โ€” เธซเธเนเธฒ {data.page} / {data.total_pages}
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
        </div>
      </div>
    </>
  );
}
