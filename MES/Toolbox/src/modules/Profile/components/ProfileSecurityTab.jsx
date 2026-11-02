import React, { useState } from 'react';
import {
  Lock,
  Key,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Globe,
  Save,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { profileApi } from '../../../shared/services/profileApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';

export default function ProfileSecurityTab({ profile, onProfileUpdated }) {
  const [pwdForm, setPwdForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [themePref, setThemePref] = useState(
    profile?.theme_preference || localStorage.getItem('theme') || 'light'
  );
  const [langPref, setLangPref] = useState(profile?.preferred_lang || 'th');

  const [changingPwd, setChangingPwd] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const { showToast } = useToast();

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!pwdForm.old_password || !pwdForm.new_password || !pwdForm.confirm_password) {
      showToast('กรุณากรอกข้อมูลรหัสผ่านให้ครบทุกช่อง', 'warning');
      return;
    }

    if (pwdForm.new_password !== pwdForm.confirm_password) {
      showToast('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน', 'warning');
      return;
    }

    if (pwdForm.new_password.length < 6) {
      showToast('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'warning');
      return;
    }

    setChangingPwd(true);
    try {
      const res = await profileApi.changePassword(pwdForm);
      if (res && res.success) {
        showToast(res.message || 'เปลี่ยนรหัสผ่านสำเร็จ', 'success');
        setPwdForm({ old_password: '', new_password: '', confirm_password: '' });
      } else {
        showToast(res?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
      setChangingPwd(false);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      const res = await profileApi.updateMyInfo({
        theme_preference: themePref,
        preferred_lang: langPref,
      });

      if (res && res.success) {
        showToast('บันทึกการตั้งค่าระบบเรียบร้อย', 'success');
        localStorage.setItem('theme', themePref);
        if (themePref === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        onProfileUpdated?.();
      } else {
        showToast(res?.message || 'บันทึกการตั้งค่าไม่สำเร็จ', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Change Password Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Key className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            เปลี่ยนรหัสผ่าน (Change Password)
          </h3>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              รหัสผ่านปัจจุบัน (Current Password) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showOldPwd ? 'text' : 'password'}
                required
                placeholder="ระบุรหัสผ่านเดิม"
                value={pwdForm.old_password}
                onChange={(e) => setPwdForm({ ...pwdForm, old_password: e.target.value })}
                className="w-full px-3 py-2 pr-10 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowOldPwd(!showOldPwd)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showOldPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              รหัสผ่านใหม่ (New Password) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPwd ? 'text' : 'password'}
                required
                placeholder="ความยาวอย่างน้อย 6 ตัวอักษร"
                value={pwdForm.new_password}
                onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                className="w-full px-3 py-2 pr-10 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPwd(!showNewPwd)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              ยืนยันรหัสผ่านใหม่ (Confirm Password) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPwd ? 'text' : 'password'}
                required
                placeholder="ระบุรหัสผ่านใหม่อีกครั้ง"
                value={pwdForm.confirm_password}
                onChange={(e) => setPwdForm({ ...pwdForm, confirm_password: e.target.value })}
                className="w-full px-3 py-2 pr-10 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={changingPwd}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {changingPwd ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'อัปเดตรหัสผ่านใหม่'}
          </button>
        </form>
      </div>

      {/* Preferences & Session Security Card */}
      <div className="space-y-6">
        {/* Appearance & Language */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Globe className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              การตั้งค่าหน้าจอและภาษา (Display & Language)
            </h3>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                ธีมการแสดงผล (Color Theme)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setThemePref('light')}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                    themePref === 'light'
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-600 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Sun className="w-5 h-5 text-amber-500" />
                  <span className="text-xs">โหมดสว่าง (Light)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setThemePref('dark')}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                    themePref === 'dark'
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-600 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Moon className="w-5 h-5 text-indigo-400" />
                  <span className="text-xs">โหมดมืด (Dark)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                ภาษาที่ต้องการใช้งาน (Preferred Language)
              </label>
              <select
                value={langPref}
                onChange={(e) => setLangPref(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="th">ภาษาไทย (Thai)</option>
                <option value="en">English (US)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={savingPrefs}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingPrefs ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </button>
          </form>
        </div>

        {/* Security & Inactivity Notice */}
        <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
          <Clock className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
          <div className="text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              ความปลอดภัยของเซสชัน (Inactivity Auto-Logout)
            </p>
            <p>
              ระบบมีการตัดการเชื่อมต่ออัตโนมัติหากไม่มีการใช้งานเกิน 60 นาที เพื่อความปลอดภัยของข้อมูลโรงงานและป้องกันการเข้าถึงจากอุปกรณ์ภายนอก
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
