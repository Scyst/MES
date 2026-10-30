import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  X,
  User,
  Lock,
  History,
  Camera,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PROFILE_API = `${import.meta.env.BASE_URL}api/profile/api_profile.php`;
const AVATAR_UPLOAD_API = `${import.meta.env.BASE_URL}api/profile/api_avatar_upload.php`;

export default function AccountSettingsModal({ isOpen, onClose }) {
  const { user, checkAuth } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const [profileForm, setProfileForm] = useState({
    phone: '',
    bio: '',
    social_line_id: '',
    social_facebook: '',
    commute_method: '',
    vehicle_registration: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    current_address: '',
    shirt_size: '',
    shoe_size: '',
    preferred_lang: 'th',
    theme_preference: localStorage.getItem('theme') || 'light',
  });

  const [pwdForm, setPwdForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [activityLogs, setActivityLogs] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    setMessage(null);
    setError(null);
    setLoading(true);

    axios
      .get(`${PROFILE_API}?action=get_my_profile`, { withCredentials: true })
      .then((res) => {
        if (res.data?.success && res.data.data) {
          const d = res.data.data;
          setProfileForm({
            phone: d.phone || '',
            bio: d.bio || '',
            social_line_id: d.social_line_id || '',
            social_facebook: d.social_facebook || '',
            commute_method: d.commute_method || '',
            vehicle_registration: d.vehicle_registration || '',
            emergency_contact_name: d.emergency_contact_name || '',
            emergency_contact_phone: d.emergency_contact_phone || '',
            emergency_contact_relation: d.emergency_contact_relation || '',
            current_address: d.current_address || '',
            shirt_size: d.shirt_size || '',
            shoe_size: d.shoe_size || '',
            preferred_lang: d.preferred_lang || 'th',
            theme_preference: d.theme_preference || localStorage.getItem('theme') || 'light',
          });
        }
      })
      .catch(() => {
        // Ignore when running offline/mock
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'logs') return;
    axios
      .get(`${PROFILE_API}?action=get_activity_log`, { withCredentials: true })
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setActivityLogs(res.data.data);
        }
      })
      .catch(() => setActivityLogs([]));
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await axios.post(
        `${PROFILE_API}?action=update_my_info`,
        profileForm,
        { withCredentials: true }
      );
      if (res.data?.success) {
        setMessage(res.data.message || 'บันทึกข้อมูลส่วนตัวสำเร็จ');
        if (checkAuth) checkAuth({ silent: true });
      } else {
        setError(res.data?.message || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await axios.post(
        `${PROFILE_API}?action=change_password`,
        pwdForm,
        { withCredentials: true }
      );
      if (res.data?.success) {
        setMessage(res.data.message || 'เปลี่ยนรหัสผ่านสำเร็จ');
        setPwdForm({ old_password: '', new_password: '', confirm_password: '' });
      } else {
        setError(res.data?.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await axios.post(AVATAR_UPLOAD_API, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });
      if (res.data?.success) {
        setMessage('อัปโหลดรูปโปรไฟล์สำเร็จ');
        if (checkAuth) checkAuth({ silent: true });
      } else {
        setError(res.data?.message || 'อัปโหลดรูปโปรไฟล์ไม่สำเร็จ');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปโปรไฟล์');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const userInitial = (user?.fullname || user?.username || 'U').charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                {userInitial}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                title="เปลี่ยนรูปโปรไฟล์"
                className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 shadow-xs hover:bg-blue-50 cursor-pointer"
              >
                <Camera size={12} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                ตั้งค่าบัญชีผู้ใช้งาน (Account Settings)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.fullname || user?.username} ({user?.emp_id || user?.role})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 px-6 bg-white dark:bg-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setMessage(null);
              setError(null);
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <User size={16} /> ข้อมูลส่วนตัว
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setMessage(null);
              setError(null);
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'password'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Lock size={16} /> เปลี่ยนรหัสผ่าน
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('logs');
              setMessage(null);
              setError(null);
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <History size={16} /> ประวัติการใช้งาน
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {message && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{message}</span>
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex items-center justify-center text-slate-400 gap-2">
              <Loader2 className="animate-spin" size={20} /> กำลังโหลดข้อมูล...
            </div>
          ) : activeTab === 'profile' ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="08X-XXX-XXXX"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    LINE ID
                  </label>
                  <input
                    type="text"
                    value={profileForm.social_line_id}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, social_line_id: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    ผู้ติดต่อฉุกเฉิน
                  </label>
                  <input
                    type="text"
                    value={profileForm.emergency_contact_name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, emergency_contact_name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    เบอร์ติดต่อฉุกเฉิน
                  </label>
                  <input
                    type="text"
                    value={profileForm.emergency_contact_phone}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, emergency_contact_phone: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  แนะนำตัว / หมายเหตุ (Bio)
                </label>
                <textarea
                  rows={2}
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>บันทึกข้อมูล</span>
                </button>
              </div>
            </form>
          ) : activeTab === 'password' ? (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md mx-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  รหัสผ่านปัจจุบัน
                </label>
                <input
                  type="password"
                  required
                  value={pwdForm.old_password}
                  onChange={(e) => setPwdForm({ ...pwdForm, old_password: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={pwdForm.new_password}
                  onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  ยืนยันรหัสผ่านใหม่
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={pwdForm.confirm_password}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirm_password: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                  <span>ยืนยันการเปลี่ยนรหัสผ่าน</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              {activityLogs.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400">ไม่พบประวัติการใช้งานล่าสุด</p>
              ) : (
                activityLogs.map((log, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-blue-600 dark:text-blue-400 mr-2">
                        [{log.module || 'SYSTEM'}]
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {log.action}
                      </span>
                      {log.remark && (
                        <span className="text-slate-500 dark:text-slate-400 ml-2">
                          — {log.remark}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 tabular-nums">{log.created_at}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

