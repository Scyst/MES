import { useState, useEffect } from 'react';
import { UserCircle, Save, Sun, Moon, Building2, Phone, Briefcase, CheckCircle2, Lock } from 'lucide-react';
import { masterAPI, authAPI } from '../../services/api';

/**
 * ProfilePage — Employee self-service profile setup.
 * Integrates with MES SSO for identity (empId, name).
 * Stores additional preferences (phone, bu) locally or allows saving.
 */
const ProfilePage = () => {
  const [profile, setProfile] = useState({
    empId: '',
    name: '',
    bu: '',
    phone: '',
  });
  const [departments, setDepartments] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initProfile = async () => {
      try {
        const deptData = await masterAPI.getDepartments().catch(() => []);
        setDepartments(deptData || []);
        
        setProfile({
          empId: localStorage.getItem('passenger_empId') || '',
          name: localStorage.getItem('passenger_name') || '',
          bu: localStorage.getItem('passenger_bu') || '',
          phone: localStorage.getItem('passenger_phone') || '',
        });
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setLoading(false);
      }
    };
    initProfile();
  }, []);

  // Sync theme with document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('passenger_empId', profile.empId);
    localStorage.setItem('passenger_name', profile.name);
    localStorage.setItem('passenger_bu', profile.bu);
    localStorage.setItem('passenger_phone', profile.phone);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const isProfileComplete = profile.empId && profile.name && profile.bu;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="pt-6 pb-6 px-6 bg-white dark:bg-gray-800 rounded-b-3xl shadow-sm z-10 sticky top-0 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl shadow-sm ${
              isProfileComplete
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
            }`}>
              {profile.name ? profile.name.charAt(0) : <UserCircle size={32} />}
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-white mb-0.5">
                {profile.name || 'โปรไฟล์ของฉัน'}
              </h1>
              {profile.empId && (
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  รหัส: {profile.empId}
                </p>
              )}
              {!isProfileComplete && (
                <span className="inline-block mt-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full border border-amber-200/50 dark:border-amber-800/50">
                  ⚠ กรุณาตั้งค่าโปรไฟล์
                </span>
              )}
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-full bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="เปลี่ยนธีม"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      <div className="px-4 pb-6">
        {/* Profile Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 mb-4">
        <h2 className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">ข้อมูลส่วนตัว</h2>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Employee ID */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">รหัสพนักงาน <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Briefcase size={16} className="text-gray-400" />
              </div>
              <input
                required
                type="text"
                placeholder="เช่น 123456"
                value={profile.empId}
                onChange={e => setProfile({ ...profile, empId: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ชื่อ - นามสกุล <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <UserCircle size={16} className="text-gray-400" />
              </div>
              <input
                required
                type="text"
                placeholder="เช่น สมชาย ใจดี"
                value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">สังกัด (แผนก/ฝ่าย) <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Building2 size={16} className="text-gray-400" />
              </div>
              <select
                required
                value={profile.bu}
                onChange={e => setProfile({ ...profile, bu: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none"
              >
                <option value="" disabled>เลือกแผนก/ฝ่าย</option>
                {departments.length > 0 ? (
                  departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name} {d.code ? `(${d.code})` : ''}</option>
                  ))
                ) : (
                  ['Toolbox', 'OEM', 'Pipe', 'Sheet Metal', 'Plastic', 'Corporate'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">เบอร์โทรศัพท์ <span className="text-gray-400 font-normal">(ไม่บังคับ)</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Phone size={16} className="text-gray-400" />
              </div>
              <input
                type="tel"
                placeholder="เช่น 081-234-5678"
                value={profile.phone}
                onChange={e => setProfile({ ...profile, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className={`w-full py-3.5 font-bold text-base rounded-xl transition-all flex items-center justify-center gap-2 mt-2 ${
              saved
                ? 'bg-emerald-500 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
            }`}
          >
            {saved ? (
              <><CheckCircle2 size={20} /> บันทึกเรียบร้อยแล้ว</>
            ) : (
              <><Save size={20} /> บันทึกข้อมูล</>
            )}
          </button>
        </form>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
