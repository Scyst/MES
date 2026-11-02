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
  Clock,
  ChevronRight,
  ShieldCheck,
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
  { id: 'grading', label: '4D Performance', icon: Award, desc: 'ผลการประเมิน 4 มิติและทักษะ' },
  { id: 'welfare', label: 'Personal & Welfare', icon: Shirt, desc: 'ข้อมูลส่วนตัว สวัสดิการ และการเดินทาง' },
  { id: 'security', label: 'Security & Display', icon: Lock, desc: 'รหัสผ่าน ธีม และภาษา' },
  { id: 'logs', label: 'Activity Logs', icon: History, desc: 'ประวัติการเข้าใช้งานระบบ' },
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
    <div className="w-full space-y-6">
      {/* Hero Profile Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Banner strip */}
        <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 relative">
          <div className="absolute top-4 left-6 flex items-center gap-2 text-xs font-semibold text-white/80">
            <span>Home</span>
            <ChevronRight className="w-3.5 h-3.5 text-white/50" />
            <span className="text-white">Employee Profile</span>
          </div>
        </div>

        {/* Profile Card Info */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-12">
            {/* Avatar & Main Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
              {/* Avatar with Camera Trigger */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-slate-900 shadow-lg overflow-hidden bg-white dark:bg-slate-800 flex items-center justify-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile?.fullname || 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-extrabold text-3xl">
                      {initial}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(true)}
                  className="absolute bottom-1 right-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-transform hover:scale-110"
                  title="เปลี่ยนรูปโปรไฟล์"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Name & Credentials */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {profile?.fullname || user?.fullname || user?.username}
                  </h1>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                    {profile?.role || user?.role || 'User'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 font-mono">
                  @{profile?.username || user?.username}{' '}
                  {profile?.emp_id && `• รหัสพนักงาน: ${profile.emp_id}`}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-xs text-slate-600 dark:text-slate-400">
                  {profile?.position && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      {profile.position}
                    </span>
                  )}
                  {profile?.department_api && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {profile.department_api}
                    </span>
                  )}
                  {tenure && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      อายุงาน: {tenure}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Overall Grade Pill (if evaluated) */}
            {performance?.has_data && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 justify-center">
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">เกรดประเมินล่าสุด</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Ratio: {Number(performance?.income_ratio || 0).toFixed(2)}x
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-2xl shadow-sm">
                  {performance?.grade_overall && performance.grade_overall !== '-'
                    ? performance.grade_overall
                    : (performance?.grade || '-')}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pt-6 border-t border-slate-100 dark:border-slate-800 mt-6 no-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[44px] ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content Panels */}
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

      {/* Avatar Modal */}
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
