import React, { useState } from 'react';
import { X, GraduationCap, Building2, Key, CheckCircle, ArrowRight, BookOpen, Clock } from 'lucide-react';
import { userManageApi } from '../../../shared/services/userManageApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';

export default function RegisterModal({ isOpen, onClose, onRegisterSuccess }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('trainee'); // 'trainee' | 'workforce'
  const [loading, setLoading] = useState(false);
  const [registeredResult, setRegisteredResult] = useState(null);

  // Trainee Form
  const [traineeForm, setTraineeForm] = useState({
    username: '',
    password: '',
    fullname: '',
    phone: '',
    company_name: '',
    class_code: ''
  });

  // Workforce Form
  const [workforceForm, setWorkforceForm] = useState({
    username: '',
    password: '',
    fullname: '',
    phone: '',
    emp_id: '',
    account_type: 'employee',
    role: 'operator',
    line: 'LINE 1',
    company_name: '',
    request_reason: '',
    requested_permissions: []
  });

  if (!isOpen) return null;

  const handleTraineeChange = (e) => {
    const { name, value } = e.target;
    setTraineeForm(prev => ({ ...prev, [name]: value }));
  };

  const handleWorkforceChange = (e) => {
    const { name, value } = e.target;
    setWorkforceForm(prev => ({ ...prev, [name]: value }));
  };

  const handleTraineeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        username: traineeForm.username.trim(),
        password: traineeForm.password,
        fullname: traineeForm.fullname.trim(),
        phone: traineeForm.phone.trim(),
        account_type: 'trainee',
        role: 'trainee',
        company_name: traineeForm.company_name.trim(),
        class_code: traineeForm.class_code.trim()
      };

      const res = await userManageApi.register(payload);
      if (res.success) {
        setRegisteredResult(res);
        if (res.auto_approved) {
          toast.success(res.message);
        } else {
          toast.info(res.message);
        }
      } else {
        toast.error(res.message || 'การลงทะเบียนไม่สำเร็จ');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkforceSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        username: workforceForm.username.trim(),
        password: workforceForm.password,
        fullname: workforceForm.fullname.trim(),
        phone: workforceForm.phone.trim(),
        emp_id: workforceForm.emp_id.trim(),
        account_type: workforceForm.account_type,
        role: workforceForm.role,
        line: workforceForm.line,
        company_name: workforceForm.company_name.trim(),
        request_reason: workforceForm.request_reason.trim(),
        requested_permissions: workforceForm.requested_permissions
      };

      const res = await userManageApi.register(payload);
      if (res.success) {
        setRegisteredResult(res);
        toast.info(res.message);
      } else {
        toast.error(res.message || 'การยื่นคำขอไม่สำเร็จ');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการยื่นคำขอ');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRegisteredResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">
              ลงทะเบียนผู้ใช้งาน
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              ระบบศูนย์เรียนรู้และแพลตฟอร์มโรงงาน SNC Former B9
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Section */}
        {registeredResult ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle size={32} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {registeredResult.auto_approved ? 'ลงทะเบียนสำเร็จ' : 'ยื่นคำขอเรียบร้อย'}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-sm mx-auto">
                {registeredResult.message}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 text-left max-w-sm mx-auto space-y-2 border border-slate-200 dark:border-slate-700 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">ชื่อผู้ใช้:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{registeredResult.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ประเภท:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 capitalize">{registeredResult.account_type}</span>
              </div>
              {registeredResult.expires_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">อายุการใช้งาน:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">ถึง {new Date(registeredResult.expires_at).toLocaleDateString('th-TH')}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                handleClose();
                if (onRegisterSuccess) onRegisterSuccess(registeredResult.username);
              }}
              className="w-full max-w-sm mx-auto py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>เข้าสู่ระบบ</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div>
            {/* Tabs Switcher */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 m-5 mb-3 rounded-xl text-sm font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('trainee')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'trainee'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                <GraduationCap size={16} />
                <span>ผู้เข้าอบรม (Trainee)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('workforce')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'workforce'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                <Building2 size={16} />
                <span>พนักงาน / ผู้รับเหมา</span>
              </button>
            </div>

            {/* TAB 1: TRAINEE FORM */}
            {activeTab === 'trainee' && (
              <form onSubmit={handleTraineeSubmit} autoComplete="off" className="px-6 py-3 space-y-3.5">
                <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/30 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-900/40">
                  <BookOpen size={14} className="shrink-0 text-blue-600" />
                  <span>กรอกรหัสห้องเรียนที่ได้รับจากผู้สอนเพื่อเปิดใช้งานบัญชีทันที</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      ชื่อ-นามสกุล <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fullname"
                      required
                      value={traineeForm.fullname}
                      onChange={handleTraineeChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      เบอร์โทรศัพท์
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={traineeForm.phone}
                      onChange={handleTraineeChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      ชื่อผู้ใช้ (Username) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="username"
                      required
                      autoComplete="off"
                      value={traineeForm.username}
                      onChange={handleTraineeChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      รหัสผ่าน <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      autoComplete="new-password"
                      value={traineeForm.password}
                      onChange={handleTraineeChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      สถาบัน / หน่วยงาน
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      value={traineeForm.company_name}
                      onChange={handleTraineeChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                      <Key size={13} />
                      รหัสห้องเรียน (Class Code) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="class_code"
                      required
                      placeholder="ระบุรหัสที่ได้รับจากผู้สอน"
                      value={traineeForm.class_code}
                      onChange={handleTraineeChange}
                      className="w-full px-3 py-2 rounded-lg border-2 border-blue-400 dark:border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase font-bold placeholder:text-slate-400 placeholder:font-normal placeholder:text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <GraduationCap size={17} />
                        <span>ลงทะเบียนเข้าสู่ระบบ</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: FACTORY WORKFORCE & SPECIAL ACCESS FORM */}
            {activeTab === 'workforce' && (
              <form onSubmit={handleWorkforceSubmit} autoComplete="off" className="px-6 py-3 space-y-3.5">
                <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-900/40">
                  <Clock size={14} className="shrink-0 text-amber-600" />
                  <span>คำขอจะถูกส่งให้ผู้ดูแลระบบ (Admin) ตรวจสอบและอนุมัติสิทธิ์</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      ประเภทผู้ใช้งาน <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="account_type"
                      value={workforceForm.account_type}
                      onChange={handleWorkforceChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="employee">พนักงานโรงงาน / สัญญาจ้าง</option>
                      <option value="contractor">ผู้รับเหมา / QC ส่งตัว</option>
                      <option value="customer">ลูกค้า / ตรวจประเมิน</option>
                      <option value="executive">ผู้บริหารส่วนกลาง</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      บทบาท / หน้าที่ <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="role"
                      value={workforceForm.role}
                      onChange={handleWorkforceChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="operator">พนักงานฝ่ายผลิต (Operator)</option>
                      <option value="supervisor">หัวหน้าไลน์ (Supervisor)</option>
                      <option value="qc">ฝ่ายตรวจสอบคุณภาพ (QC)</option>
                      <option value="maintenance">ช่างซ่อมบำรุง / PE</option>
                      <option value="planner">เจ้าหน้าที่วางแผน (Planner)</option>
                      <option value="contractor">ผู้รับเหมา / ช่างเฉพาะกิจ</option>
                      <option value="customer">ลูกค้า / ผู้ตรวจประเมิน</option>
                      <option value="executive">ผู้บริหารส่วนกลาง</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      ชื่อ-นามสกุล <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fullname"
                      required
                      value={workforceForm.fullname}
                      onChange={handleWorkforceChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      รหัสพนักงาน (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      name="emp_id"
                      value={workforceForm.emp_id}
                      onChange={handleWorkforceChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      ไลน์ผลิต / พื้นที่
                    </label>
                    <select
                      name="line"
                      value={workforceForm.line}
                      onChange={handleWorkforceChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="LINE 1">LINE 1</option>
                      <option value="LINE 2">LINE 2</option>
                      <option value="LINE 3">LINE 3</option>
                      <option value="LINE 4">LINE 4</option>
                      <option value="LINE 5">LINE 5</option>
                      <option value="LINE 6">LINE 6</option>
                      <option value="STORE">WAREHOUSE / STORE</option>
                      <option value="MAINTENANCE">PE / MAINTENANCE</option>
                      <option value="ALL">ทุกไลน์ผลิต (All Lines)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      เบอร์โทรศัพท์
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={workforceForm.phone}
                      onChange={handleWorkforceChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      ชื่อผู้ใช้ (Username) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="username"
                      required
                      autoComplete="off"
                      value={workforceForm.username}
                      onChange={handleWorkforceChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      รหัสผ่าน <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      autoComplete="new-password"
                      value={workforceForm.password}
                      onChange={handleWorkforceChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    เหตุผลในการขอใช้งาน <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="request_reason"
                    rows={2}
                    required
                    placeholder="ระบุวัตถุประสงค์สั้นๆ เพื่อให้แอดมินพิจารณาอนุมัติ"
                    value={workforceForm.request_reason}
                    onChange={handleWorkforceChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder:text-slate-400 placeholder:text-xs"
                  ></textarea>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Building2 size={17} />
                        <span>ส่งคำขอเปิดใช้งานบัญชี</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
