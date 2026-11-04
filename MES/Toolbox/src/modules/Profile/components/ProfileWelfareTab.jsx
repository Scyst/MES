import React, { useState, useEffect } from 'react';
import {
  Save,
  Phone,
  Home,
  MessageCircle,
  Truck,
  Heart,
  ShieldAlert,
  Shirt,
  Calendar,
  Users,
} from 'lucide-react';
import { profileApi } from '../../../shared/services/profileApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import { useAuth } from '../../../shared/contexts/AuthContext';

const COMMUTE_OPTIONS = [
  { value: 'รถรับส่งพนักงาน SNC', label: 'รถรับส่งพนักงาน SNC (Shuttle Bus)' },
  { value: 'รถยนต์ส่วนบุคคล', label: 'รถยนต์ส่วนบุคคล (Personal Car)' },
  { value: 'รถจักรยานยนต์', label: 'รถจักรยานยนต์ (Motorcycle)' },
  { value: 'เดิน / รถโดยสารสาธารณะ', label: 'เดิน / รถโดยสารสาธารณะ (Public/Walk)' },
];

const SHIRT_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
const SHOE_SIZES = Array.from({ length: 12 }, (_, i) => String(35 + i)); // 35 - 46

export default function ProfileWelfareTab({ profile, onProfileUpdated }) {
  const [formData, setFormData] = useState({
    phone: '',
    bio: '',
    social_line_id: '',
    social_facebook: '',
    current_address: '',
    date_of_birth: '',
    marital_status: 'single',
    children_count: 0,
    shirt_size: 'L',
    shoe_size: '41',
    commute_method: 'รถรับส่งพนักงาน SNC',
    vehicle_registration: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
  });

  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { checkAuth } = useAuth();

  useEffect(() => {
    if (profile) {
      setFormData({
        phone: profile.phone || '',
        bio: profile.bio || '',
        social_line_id: profile.social_line_id || '',
        social_facebook: profile.social_facebook || '',
        current_address: profile.current_address || '',
        date_of_birth: profile.date_of_birth ? profile.date_of_birth.substring(0, 10) : '',
        marital_status: profile.marital_status || 'single',
        children_count: profile.children_count !== undefined ? Number(profile.children_count) : 0,
        shirt_size: profile.shirt_size || 'L',
        shoe_size: profile.shoe_size || '41',
        commute_method: profile.commute_method || 'รถรับส่งพนักงาน SNC',
        vehicle_registration: profile.vehicle_registration || '',
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
        emergency_contact_relation: profile.emergency_contact_relation || '',
      });
    }
  }, [profile]);

  // Calculate age from date_of_birth
  const calculatedAge = formData.date_of_birth
    ? Math.floor((new Date() - new Date(formData.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await profileApi.updateMyInfo(formData);
      if (res && res.success) {
        showToast(res.message || 'บันทึกข้อมูลส่วนตัวและสวัสดิการเรียบร้อย', 'success');
        if (checkAuth) checkAuth({ silent: true });
        onProfileUpdated?.();
      } else {
        showToast(res?.message || 'บันทึกไม่สำเร็จ', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-16 sm:pb-20">
      {/* Section 1: Contact & Social */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              ข้อมูลการติดต่อและที่อยู่ (Contact & Address)
            </h3>
          </div>
          {/* Quick Save button in header */}
          <button
            type="submit"
            disabled={saving}
            className="mes-btn-primary px-3 py-1.5 text-xs sm:hidden"
            title="บันทึกข้อมูล"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'บันทึก...' : 'บันทึก'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              เบอร์โทรศัพท์ (Phone Number)
            </label>
            <input
              type="tel"
              placeholder="081-xxx-xxxx"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="mes-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Line ID
            </label>
            <input
              type="text"
              placeholder="ไอดีไลน์"
              value={formData.social_line_id}
              onChange={(e) => setFormData({ ...formData, social_line_id: e.target.value })}
              className="mes-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Facebook
            </label>
            <input
              type="text"
              placeholder="ชื่อโปรไฟล์เฟซบุ๊ก"
              value={formData.social_facebook}
              onChange={(e) => setFormData({ ...formData, social_facebook: e.target.value })}
              className="mes-input"
            />
          </div>

          <div className="sm:col-span-2 md:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              ที่อยู่ปัจจุบัน (Current Address)
            </label>
            <textarea
              rows="2"
              placeholder="ระบุที่อยู่ปัจจุบัน..."
              value={formData.current_address}
              onChange={(e) => setFormData({ ...formData, current_address: e.target.value })}
              className="mes-input"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Personal Details & Welfare Uniform */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <Shirt className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            ข้อมูลส่วนบุคคลและขนาดเครื่องแบบสวัสดิการ (Personal & Uniform)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              วันเกิด (Date of Birth) {calculatedAge !== null && `(อายุ ${calculatedAge} ปี)`}
            </label>
            <input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              className="mes-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              สถานภาพ (Marital Status)
            </label>
            <select
              value={formData.marital_status}
              onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
              className="mes-select w-full"
            >
              <option value="single">โสด (Single)</option>
              <option value="married">สมรส (Married)</option>
              <option value="divorced">หย่าร้าง (Divorced)</option>
              <option value="widowed">หม้าย (Widowed)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              จำนวนบุตร (Children Count)
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={formData.children_count}
              onChange={(e) => setFormData({ ...formData, children_count: Number(e.target.value) })}
              className="mes-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              ไซส์เสื้อยูนิฟอร์ม (Shirt Size)
            </label>
            <select
              value={formData.shirt_size}
              onChange={(e) => setFormData({ ...formData, shirt_size: e.target.value })}
              className="mes-select w-full"
            >
              {SHIRT_SIZES.map((sz) => (
                <option key={sz} value={sz}>
                  Size {sz}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              ไซส์รองเท้าเซฟตี้ (Safety Shoes EUR)
            </label>
            <select
              value={formData.shoe_size}
              onChange={(e) => setFormData({ ...formData, shoe_size: e.target.value })}
              className="mes-select w-full"
            >
              {SHOE_SIZES.map((sz) => (
                <option key={sz} value={sz}>
                  EUR {sz}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 md:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              คำแนะนำตัวสั้นๆ (Bio / Motto)
            </label>
            <input
              type="text"
              placeholder="คติประจำใจ หรือเป้าหมายการทำงาน..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="mes-input"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Commute & Transport */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <Truck className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            การเดินทางและการโดยสาร (Commute & Transportation)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              วิธีเดินทางมาทำงานหลัก (Commute Method)
            </label>
            <select
              value={formData.commute_method}
              onChange={(e) => setFormData({ ...formData, commute_method: e.target.value })}
              className="mes-select w-full"
            >
              {COMMUTE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              ทะเบียนรถยนต์/จักรยานยนต์ (Vehicle Plate)
            </label>
            <input
              type="text"
              placeholder="เช่น กข 1234 ระยอง (เว้นว่างได้)"
              value={formData.vehicle_registration}
              onChange={(e) => setFormData({ ...formData, vehicle_registration: e.target.value })}
              className="mes-input"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Emergency Contact */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            ผู้ติดต่อกรณีฉุกเฉิน (Emergency Contact)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              ชื่อ-นามสกุล ผู้ติดต่อฉุกเฉิน
            </label>
            <input
              type="text"
              placeholder="ระบุชื่อผู้ติดต่อ..."
              value={formData.emergency_contact_name}
              onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
              className="mes-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              เบอร์โทรศัพท์ฉุกเฉิน
            </label>
            <input
              type="tel"
              placeholder="08x-xxx-xxxx"
              value={formData.emergency_contact_phone}
              onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
              className="mes-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              ความสัมพันธ์ (Relationship)
            </label>
            <input
              type="text"
              placeholder="เช่น บิดา, มารดา, คู่สมรส, พี่น้อง"
              value={formData.emergency_contact_relation}
              onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
              className="mes-input"
            />
          </div>
        </div>
      </div>

      {/* Sticky Floating Save Bar (Floats comfortably above bottom screen edge) */}
      <div className="sticky bottom-4 z-30 flex justify-end">
        <div className="flex items-center gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-750 shadow-lg shadow-slate-200/50 dark:shadow-slate-950/60 transition-all">
          <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">
            ตรวจสอบข้อมูลส่วนตัวและสวัสดิการให้เรียบร้อย
          </span>
          <button
            type="submit"
            disabled={saving}
            className="mes-btn-primary px-5 py-2 text-xs shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'กำลังบันทึกข้อมูล...' : 'บันทึกข้อมูลส่วนตัวและสวัสดิการ'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
