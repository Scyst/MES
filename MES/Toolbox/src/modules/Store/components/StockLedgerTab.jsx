import React, { useState, useEffect } from 'react';
import {
  FileText, Search, RefreshCw, Calendar, ArrowUpRight, ArrowDownLeft,
  ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { storeApi } from '../../../shared/services/storeApi';
import SecurityWatermark from '../../../shared/components/SecurityWatermark';

export default function StockLedgerTab() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [txType, setTxType] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await storeApi.getStockLedger({
        page,
        limit: 50,
        search,
        transactionType: txType,
        startDate,
        endDate
      });

      if (res.success) {
        setTransactions(res.transactions || res.data || []);
      }
    } catch (err) {
      console.error('Failed to load stock ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [page, txType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLedger();
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fadeIn relative">
      <SecurityWatermark classification="STOCK LEDGER • AUDIT TRAIL" />

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาตาม Part No, Ref Document, Tag Serial..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Transaction Type Filter */}
          <select
            value={txType}
            onChange={(e) => {
              setTxType(e.target.value);
              setPage(1);
            }}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">ทุกประเภทการเคลื่อนไหว</option>
            <option value="IN">รับเข้า (IN / RECEIVE)</option>
            <option value="OUT">จ่ายออก (OUT / ISSUE)</option>
            <option value="ADJ_IN">ปรับยอดเพิ่ม (ADJ_IN)</option>
            <option value="ADJ_OUT">ปรับยอดยุบ (ADJ_OUT)</option>
            <option value="TRF">โอนย้ายคลัง (TRANSFER)</option>
          </select>

          {/* Date range inputs */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            />
            <span>ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            />
          </div>

          <button
            onClick={() => {
              setPage(1);
              fetchLedger();
            }}
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-24 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              กำลังโหลดสมุดบัญชีสต็อก...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-24 text-center text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold">ไม่พบประวัติการเคลื่อนไหวสต็อก</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-4"># Tx ID</th>
                  <th className="py-2.5 px-3">วันที่ / เวลา</th>
                  <th className="py-2.5 px-3">ประเภท (Type)</th>
                  <th className="py-2.5 px-3">Part No / SAP No</th>
                  <th className="py-2.5 px-3">รายละเอียดชิ้นงาน</th>
                  <th className="py-2.5 px-3 text-right">จำนวน (+ / -)</th>
                  <th className="py-2.5 px-3">คลังสินค้า</th>
                  <th className="py-2.5 px-3">เอกสารอ้างอิง (Ref)</th>
                  <th className="py-2.5 px-4">ผู้บันทึก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.map((tx, idx) => {
                  const qty = parseFloat(tx.quantity || tx.qty || 0);
                  const isPositive = qty > 0;
                  const isNegative = qty < 0;
                  const type = tx.transaction_type || tx.tx_type || 'TX';

                  let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                  if (type.includes('IN')) badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
                  else if (type.includes('OUT')) badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300';
                  else if (type.includes('ADJ')) badgeColor = 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300';

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono text-slate-400 font-bold">
                        #{tx.transaction_id || tx.id}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {tx.created_at ? new Date(tx.created_at).toLocaleString('th-TH') : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor}`}>
                          {type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {tx.part_no || tx.sap_no}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 truncate max-w-xs">
                        {tx.part_description || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-sm">
                        <span
                          className={
                            isPositive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isNegative
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-slate-500'
                          }
                        >
                          {isPositive ? `+${qty.toLocaleString()}` : qty.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {tx.location_name || 'STORE'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-blue-600 dark:text-blue-400 text-[11px]">
                        {tx.reference_no || tx.doc_no || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                        {tx.created_by_name || tx.username || 'System'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-slate-50/40 dark:bg-slate-800/20">
          <span>แสดงผล {transactions.length} รายการ</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
              {page}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={transactions.length < 50}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
