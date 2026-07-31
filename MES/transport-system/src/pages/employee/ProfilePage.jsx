import { useState, useEffect } from 'react';
import { UserCircle, Save, Sun, Moon, Building2, Phone, Briefcase, CheckCircle2 } from 'lucide-react';

/**
 * ProfilePage — Employee self-service profile setup.
 * Stores empId, name, bu, theme preference in localStorage.
 * This is the primary way employees identify themselves in the prototype
 * before a proper auth system is built.
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

  useEffect(() => {
    // Load saved profile
    setProfile({
      empId: localStorage.getItem('passenger_empId') || '',
      name: localStorage.getItem('passenger_name') || '',
      bu: localStorage.getItem('passenger_bu') || '',
      phone: localStorage.getItem('passenger_phone') || '',
    });

    // Load departments from Master Data
    const savedDepts = JSON.parse(localStorage.getItem('departments')) || [];
    setDepartments(savedDepts);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-6 px-4 pb-8">

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl ${
          isProfileComplete
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
        }`}>
          {profile.name ? profile.name.charAt(0) : <UserCircle size={32} />}
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">
            {profile.name || 'ยังไม่ได้ตั้งค่าชื่อ'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {profile.empId ? `รหัส: ${profile.empId}` : 'กรุณากรอกข้อมูลด้านล่าง'}
          </p>
          {!isProfileComplete && (
            <span className="inline-block mt-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
              ⚠ โปรไฟล์ยังไม่สมบูรณ์
            </span>
          )}
        </div>
      </div>

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
                placeholder="เช่น 1096902163"
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

      {/* Theme Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 mb-4">
        <h2 className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">การแสดงผล</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900 dark:text-white">โหมดธีม</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {theme === 'dark' ? 'โหมดมืด (Dark)' : 'โหมดสว่าง (Light)'}
            </p>
          </div>
          <button
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
              theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 flex items-center justify-center ${
              theme === 'dark' ? 'left-8' : 'left-1'
            }`}>
              {theme === 'dark'
                ? <Moon size={10} className="text-blue-600" />
                : <Sun size={10} className="text-amber-500" />
              }
            </div>
          </button>
        </div>
      </div>

      {/* App Info */}
      <div className="text-center text-gray-400 dark:text-gray-500 text-xs space-y-1">
        <p className="font-bold">SNC Transport System</p>
        <p>SNC Former Public Company Limited</p>
        <p>v1.0 (Prototype — UI/UX Phase)</p>
      </div>
    </div>
  );
};

export default ProfilePage;
