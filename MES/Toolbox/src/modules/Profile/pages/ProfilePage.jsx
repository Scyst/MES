import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  User,
  Award,
  Shirt,
  Lock,
  History,
  Camera,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { profileApi } from '../../../shared/services/profileApi';
import { useAuth } from '../../../shared/contexts/AuthContext';
import Profile4DGradingTab from '../components/Profile4DGradingTab';
import ProfileWelfareTab from '../components/ProfileWelfareTab';
import ProfileSecurityTab from '../components/ProfileSecurityTab';
import ProfileActivityLogsTab from '../components/ProfileActivityLogsTab';
import AvatarUploadModal from '../components/AvatarUploadModal';

const TABS = [
  { id: 'grading', label: 'ผลประเมิน 4 มิติ (4D Performance)', icon: Award },
  { id: 'welfare', label: 'ข้อมูลส่วนตัวและสวัสดิการ (Personal & Welfare)', icon: Shirt },
  { id: 'security', label: 'ความปลอดภัยและการแสดงผล (Security & Display)', icon: Lock },
  { id: 'logs', label: 'ประวัติกิจกรรม (Activity Logs)', icon: History },
];

function calculateTenure(startDate) {
  if (!startDate) return null;
  try {
    const start = new Date(startDate);
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    if (years === 0 && months === 0) return 'เพิ่งเริ่มงานในเดือนนี้';
    if (years === 0) return `${months} เดือน`;
    return `${years} ปี ${months > 0 ? `${months} เดือน` : ''}`;
  } catch {
    return null;
  }
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'grading';

  const [profile, setProfile] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPerf, setLoadingPerf] = useState(true);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const res = await profileApi.getMyProfile();
      if (res && res.success) {
        setProfile(res.data);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const fetchPerformance = useCallback(async () => {
    setLoadingPerf(true);
    try {
      const res = await profileApi.getMyPerformance();
      if (res && res.success) {
        setPerformance(res.data);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoadingPerf(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchPerformance();
  }, [fetchProfile, fetchPerformance]);

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const tenure = calculateTenure(profile?.start_date);
  const initial = (profile?.fullname || profile?.username || user?.username || 'U').charAt(0).toUpperCase();
  const avatarUrl = profile?.profile_picture || user?.profile_picture;

  return (
    <div className="mes-page-container">
      {/* MES Standard Page Header */}
      <div className="mes-page-header">
        <div>
          <h1 className="mes-page-title">
            <User className="text-blue-600 w-6 h-6" /> โปรไฟล์พนักงานและผลการปฏิบัติงาน (My Profile & 4D Performance)
          </h1>
          <p className="mes-page-subtitle">
            ข้อมูลส่วนบุคคล สวัสดิการเครื่องแบบ ผลการประเมิน 4 มิติ และการรักษาความปลอดภัยบัญชีผู้ใช้งาน
          </p>
        </div>
      </div>

      {/* Hero Profile Summary Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5 mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Avatar & Identity Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            {/* Avatar with Camera Trigger */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 border-slate-200 dark:border-slate-750 shadow-xs overflow-hidden bg-white dark:bg-slate-800 flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profile?.fullname || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-2xl">
                    {initial}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setAvatarModalOpen(true)}
                className="absolute bottom-0 right-0 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-transform hover:scale-105"
                title="เปลี่ยนรูปโปรไฟล์"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Name, Role & Org Details */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {profile?.fullname || user?.fullname || user?.username}
                </h2>
                <span className="mes-badge-pill bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase text-[10px]">
                  {profile?.role || user?.role || 'User'}
                </span>
              </div>

              <p className="text-xs text-slate-500 font-mono">
                @{profile?.username || user?.username}{' '}
                {profile?.emp_id && `• รหัสพนักงาน: ${profile.emp_id}`}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-xs text-slate-600 dark:text-slate-400">
                {profile?.position && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    {profile.position}
                  </span>
                )}
                {profile?.department_api && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {profile.department_api}
                  </span>
                )}
                {tenure && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    อายุงาน: {tenure}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Overall 4D Grade Badge */}
          {performance?.has_data && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 justify-center shrink-0">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">เกรดประเมินรวม</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">
                  Ratio: {Number(performance?.income_ratio || 0).toFixed(2)}x
                </p>
              </div>
              <div className="w-11 h-11 rounded-lg bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-xl shadow-2xs">
                {performance?.grade_overall && performance.grade_overall !== '-'
                  ? performance.grade_overall
                  : (performance?.grade || '-')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Industrial Underline Navigation Tabs */}
      <div className="mes-tab-nav">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`mes-tab-btn ${isActive ? 'mes-tab-btn-active' : 'mes-tab-btn-inactive'}`}
            >
              <Icon size={17} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div>
        {currentTab === 'grading' && (
          <Profile4DGradingTab performance={performance} loading={loadingPerf} />
        )}
        {currentTab === 'welfare' && (
          <ProfileWelfareTab profile={profile} onProfileUpdated={fetchProfile} />
        )}
        {currentTab === 'security' && (
          <ProfileSecurityTab profile={profile} onProfileUpdated={fetchProfile} />
        )}
        {currentTab === 'logs' && <ProfileActivityLogsTab />}
      </div>

      {/* Avatar Upload Modal */}
      <AvatarUploadModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        currentAvatarUrl={avatarUrl}
        onAvatarUpdated={() => {
          fetchProfile();
        }}
      />
    </div>
  );
}
