import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Boxes, MapPin, ShieldAlert, FileText, ShoppingCart, PackagePlus,
  ClipboardList, AlertTriangle
} from 'lucide-react';
import InventoryDashboardTab from './components/InventoryDashboardTab';
import MaterialRequisitionTab from './components/MaterialRequisitionTab';
import RmReceivingTab from './components/RmReceivingTab';
import CycleCountTab from './components/CycleCountTab';
import PendingApprovalsTab from './components/PendingApprovalsTab';
import StockLedgerTab from './components/StockLedgerTab';
import StoreKdsQueueTab from './components/StoreKdsQueueTab';
import ScrapReplacementTab from './components/ScrapReplacementTab';
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
        if (res.success) {
          const records = res.pending_counts || res.data || [];
          setPendingApprovalCount(records.length);
        }
      })
      .catch(() => {});
  }, [currentTab]);

  return (
    <div className="mes-page-container flex flex-col h-full gap-2 sm:gap-3 overflow-hidden">
      {/* Header section (Uses standard .mes-page-header tokens) */}
      <div className="mes-page-header mb-0 flex-col md:flex-row gap-2 sm:gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
            <Boxes className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-sm sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                Store & Warehouse Management
              </h1>
              <span className="mes-badge bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] sm:text-xs px-1.5 py-0.2">
                ⚡ SPA Ported
              </span>
            </div>
          </div>
        </div>

        {/* Tab Switcher Pills - Horizontal scrolling on mobile without wrap */}
        <div className="flex items-center gap-1 p-0.5 sm:p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap w-full md:w-auto flex-nowrap flex-shrink-0">
          <button
            type="button"
            onClick={() => setTab('onhand')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap cursor-pointer touch-manipulation min-h-[30px] sm:min-h-[34px] ${
              currentTab === 'onhand'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <span>สต็อกคงเหลือ <span className="hidden sm:inline">(Onhand)</span></span>
          </button>

          <button
            type="button"
            onClick={() => setTab('requisition')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap cursor-pointer touch-manipulation min-h-[30px] sm:min-h-[34px] ${
              currentTab === 'requisition'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
            <span>เบิกพัสดุ <span className="hidden sm:inline">(Requisition)</span></span>
          </button>

          <button
            type="button"
            onClick={() => setTab('kds')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap cursor-pointer touch-manipulation min-h-[30px] sm:min-h-[34px] ${
              currentTab === 'kds'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
            <span>จ่ายพัสดุ KDS & รับคืน</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('receiving')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap cursor-pointer touch-manipulation min-h-[30px] sm:min-h-[34px] ${
              currentTab === 'receiving'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <PackagePlus className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
            <span>รับเข้า & แท็ก <span className="hidden sm:inline">(Receiving)</span></span>
          </button>

          <button
            type="button"
            onClick={() => setTab('scrap')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap cursor-pointer touch-manipulation min-h-[30px] sm:min-h-[34px] ${
              currentTab === 'scrap'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            <span>ของเสีย & ทดแทน <span className="hidden sm:inline">(Scrap)</span></span>
          </button>

          <button
            type="button"
            onClick={() => setTab('cycle-count')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap cursor-pointer touch-manipulation min-h-[30px] sm:min-h-[34px] ${
              currentTab === 'cycle-count'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span>แผนผังตรวจนับ <span className="hidden sm:inline">(Map)</span></span>
          </button>

          <button
            type="button"
            onClick={() => setTab('approvals')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap cursor-pointer touch-manipulation min-h-[30px] sm:min-h-[34px] relative ${
              currentTab === 'approvals'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span>รออนุมัติตัดยอด</span>
            {pendingApprovalCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-white ml-0.5">
                {pendingApprovalCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('ledger')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap cursor-pointer touch-manipulation min-h-[30px] sm:min-h-[34px] ${
              currentTab === 'ledger'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
            <span>ประวัติบัญชีสต็อก <span className="hidden sm:inline">(Ledger)</span></span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {currentTab === 'onhand' && <InventoryDashboardTab onNavigateTab={setTab} />}
        {currentTab === 'requisition' && <MaterialRequisitionTab onNavigateTab={setTab} />}
        {currentTab === 'kds' && <StoreKdsQueueTab />}
        {currentTab === 'receiving' && <RmReceivingTab />}
        {currentTab === 'scrap' && <ScrapReplacementTab />}
        {currentTab === 'cycle-count' && <CycleCountTab onNavigateTab={setTab} />}
        {currentTab === 'approvals' && <PendingApprovalsTab />}
        {currentTab === 'ledger' && <StockLedgerTab />}
      </div>
    </div>
  );
}
