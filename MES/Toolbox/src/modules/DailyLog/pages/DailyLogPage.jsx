import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  BookOpenCheck, Users, HeartPulse, Sun, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { dailyLogApi } from '../../../shared/services/dailyLogApi';
import MorningBriefModal from '../../Home/components/MorningBriefModal';
import MyShiftLogTab from '../components/MyShiftLogTab';
import TeamShiftLedgerTab from '../components/TeamShiftLedgerTab';
import MoodAnalyticsTab from '../components/MoodAnalyticsTab';
import {
  PrivacyPasswordModal,
  ReplyModal,
  UserHistoryModal,
  NegativeAlertsModal,
  MissingStaffModal
} from '../components/DailyLogModals';

export default function DailyLogPage() {
  const { user, hasPermission, hasRole } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const canViewMood = hasPermission('view_mood');
  const canViewBrief = hasRole(['admin', 'creator']);
  const isMoodRoute = location.pathname.includes('mood-report');

  const resolveInitialTab = () => {
    const qTab = searchParams.get('tab');
    if (qTab === 'mood' && canViewMood) return 'mood';
    if (qTab === 'team' && canViewMood) return 'team';
    if (qTab === 'my') return 'my';
    if (isMoodRoute && canViewMood) return 'mood';
    return canViewMood ? 'team' : 'my';
  };

  const [activeTab, setActiveTab] = useState(resolveInitialTab);
  const [lines, setLines] = useState([]);
  const [replyBadge, setReplyBadge] = useState(0);

  // Privacy Mode stays in memory only (true = masked until verified)
  const [isPrivacyMode, setIsPrivacyMode] = useState(true);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingActionAfterUnlock, setPendingActionAfterUnlock] = useState(null);

  // Supervisor Modals
  const [replyTarget, setReplyTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [negativeFilters, setNegativeFilters] = useState(null);
  const [missingFilters, setMissingFilters] = useState(null);
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  const [reloadSignal, setReloadSignal] = useState(0);

  useEffect(() => {
    const qTab = searchParams.get('tab');
    if (qTab === 'mood' && canViewMood) setActiveTab('mood');
    else if (qTab === 'team' && canViewMood) setActiveTab('team');
    else if (qTab === 'my') setActiveTab('my');
    else if (isMoodRoute && canViewMood) setActiveTab('mood');
  }, [location.pathname, searchParams, canViewMood, isMoodRoute]);

  useEffect(() => {
    if (!canViewMood) return;
    let active = true;
    dailyLogApi.getReportFilters()
      .then((res) => {
        if (active && res?.success && Array.isArray(res.data?.lines)) {
          setLines(res.data.lines);
        }
      })
      .catch((err) => console.error('Failed to load filter lines:', err));
    return () => { active = false; };
  }, [canViewMood]);

  const handleTabSwitch = (nextTab) => {
    setActiveTab(nextTab);
    setSearchParams({ tab: nextTab }, { replace: true });
  };

  const handleTogglePrivacy = () => {
    if (!isPrivacyMode) {
      setIsPrivacyMode(true);
    } else {
      setPendingActionAfterUnlock(null);
      setPasswordModalOpen(true);
    }
  };

  const handleOpenReply = useCallback((logRow) => {
    if (isPrivacyMode) {
      setPendingActionAfterUnlock(() => () => setReplyTarget(logRow));
      setPasswordModalOpen(true);
      return;
    }
    setReplyTarget(logRow);
  }, [isPrivacyMode]);

  const handleOpenHistory = useCallback((userGroup) => {
    if (isPrivacyMode) {
      setPendingActionAfterUnlock(() => () => setHistoryTarget(userGroup));
      setPasswordModalOpen(true);
      return;
    }
    setHistoryTarget(userGroup);
  }, [isPrivacyMode]);

  const handlePrivacyUnlocked = () => {
    setIsPrivacyMode(false);
    if (typeof pendingActionAfterUnlock === 'function') {
      pendingActionAfterUnlock();
      setPendingActionAfterUnlock(null);
    }
  };

  return (
    <div className="w-full min-h-full p-3 sm:p-6 space-y-5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-sm">
              {activeTab === 'mood' ? <HeartPulse className="w-5 h-5" /> : <BookOpenCheck className="w-5 h-5" />}
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                Daily Log & Mood Insight Center
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                สมุดบันทึกกะประจำวัน การส่งต่อกะ ระบบตอบกลับหัวหน้างาน และรายงานวิเคราะห์สุขภาพใจองค์กร
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canViewBrief && (
            <button
              type="button"
              onClick={() => setBriefModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            >
              <Sun className="w-4 h-4" />
              Morning Brief ({user?.team_group || 'ALL'})
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleTabSwitch('my')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'my'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpenCheck className="w-4 h-4" />
          <span>บันทึกกะของฉัน</span>
          {replyBadge > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
              {replyBadge}
            </span>
          )}
        </button>

        {canViewMood && (
          <>
            <button
              type="button"
              onClick={() => handleTabSwitch('team')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'team'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>สมุดบันทึกกะทีมงาน & ตอบกลับ</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch('mood')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'mood'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <HeartPulse className="w-4 h-4" />
              <span>Mood Insight Report</span>
            </button>
          </>
        )}
      </div>

      {/* Warning if user hit /mood-report without view_mood permission */}
      {isMoodRoute && !canViewMood && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>บัญชีของคุณไม่มีสิทธิ์ดูรายงานวิเคราะห์ภาพรวมทีม (แสดงผลเฉพาะสมุดบันทึกกะส่วนตัว)</span>
        </div>
      )}

      {/* Active Tab Content */}
      {activeTab === 'my' && (
        <MyShiftLogTab onReplyBadgeChange={setReplyBadge} />
      )}

      {activeTab === 'team' && canViewMood && (
        <TeamShiftLedgerTab
          lines={lines}
          isPrivacyMode={isPrivacyMode}
          onTogglePrivacyRequest={handleTogglePrivacy}
          onOpenReply={handleOpenReply}
          onOpenHistory={handleOpenHistory}
          reloadSignal={reloadSignal}
        />
      )}

      {activeTab === 'mood' && canViewMood && (
        <MoodAnalyticsTab
          lines={lines}
          isPrivacyMode={isPrivacyMode}
          onTogglePrivacyRequest={handleTogglePrivacy}
          onOpenReply={handleOpenReply}
          onOpenHistory={handleOpenHistory}
          onOpenNegativeModal={(f) => setNegativeFilters(f)}
          onOpenMissingModal={(f) => setMissingFilters(f)}
          reloadSignal={reloadSignal}
        />
      )}

      {/* Shared Modals */}
      <PrivacyPasswordModal
        isOpen={passwordModalOpen}
        onClose={() => { setPasswordModalOpen(false); setPendingActionAfterUnlock(null); }}
        onUnlocked={handlePrivacyUnlocked}
      />

      <ReplyModal
        isOpen={Boolean(replyTarget)}
        target={replyTarget}
        isPrivacyMode={isPrivacyMode}
        onClose={() => setReplyTarget(null)}
        onSaved={() => setReloadSignal((s) => s + 1)}
      />

      <UserHistoryModal
        isOpen={Boolean(historyTarget)}
        targetUser={historyTarget}
        isPrivacyMode={isPrivacyMode}
        onClose={() => setHistoryTarget(null)}
      />

      <NegativeAlertsModal
        isOpen={Boolean(negativeFilters)}
        filters={negativeFilters || {}}
        isPrivacyMode={isPrivacyMode}
        onClose={() => setNegativeFilters(null)}
        onReplyClick={(row) => {
          setNegativeFilters(null);
          handleOpenReply(row);
        }}
      />

      <MissingStaffModal
        isOpen={Boolean(missingFilters)}
        filters={missingFilters || {}}
        isPrivacyMode={isPrivacyMode}
        onClose={() => setMissingFilters(null)}
      />

      {canViewBrief && (
        <MorningBriefModal
          isOpen={briefModalOpen}
          onClose={() => setBriefModalOpen(false)}
          initialData={null}
        />
      )}
    </div>
  );
}
