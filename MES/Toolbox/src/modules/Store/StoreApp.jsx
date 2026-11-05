import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Boxes, MapPin, ShieldAlert, FileText, Sparkles, CheckCircle2
} from 'lucide-react';
import InventoryDashboardTab from './components/InventoryDashboardTab';
import CycleCountTab from './components/CycleCountTab';
import PendingApprovalsTab from './components/PendingApprovalsTab';
import StockLedgerTab from './components/StockLedgerTab';
import { storeApi } from '../../shared/services/storeApi';

export default function StoreApp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'onhand';
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

  const setTab = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  useEffect(() => {
    // Check pending count for badge indicator
    storeApi.getPendingCounts()
      .then((res) => {
        if (res.success && res.pending_counts) {
          setPendingApprovalCount(res.pending_counts.length);
        }
      })
      .catch(() => {});
  }, [currentTab]);

  return (
    <div className="w-full flex flex-col h-full gap-3 p-4 md:p-6 bg-slate-50/50 dark:bg-slate-950/50">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Store & Warehouse Management
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                ⚡ SPA Ported
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ศูนย์กลางคลังสินค้า: ตรวจนับสต็อกแบบ Visual Map (Blind Count), รายงานสต็อกคงเหลือ, และระบบอนุมัติการปรับยอด
            </p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setTab('onhand')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentTab === 'onhand'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>สต็อกคงเหลือ (Onhand)</span>
          </button>

          <button
            onClick={() => setTab('cycle-count')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentTab === 'cycle-count'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>แผนผังตรวจนับ (Visual Map)</span>
          </button>

          <button
            onClick={() => setTab('approvals')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 relative ${
              currentTab === 'approvals'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>รออนุมัติตัดยอด</span>
            {pendingApprovalCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-white ml-0.5">
                {pendingApprovalCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('ledger')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentTab === 'ledger'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>ประวัติบัญชีสต็อก (Ledger)</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 min-h-0">
        {currentTab === 'onhand' && <InventoryDashboardTab />}
        {currentTab === 'cycle-count' && <CycleCountTab />}
        {currentTab === 'approvals' && <PendingApprovalsTab />}
        {currentTab === 'ledger' && <StockLedgerTab />}
      </div>
    </div>
  );
}
