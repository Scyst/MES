import React, { useState } from 'react';
import { X, GraduationCap, Building2, User, Key, Phone, Shield, CheckCircle, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
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
    account_type: 'employee', // 'employee' | 'contractor' | 'customer' | 'executive'
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Shield size={22} className="text-blue-200" />
              ลงทะเบียนเข้าใช้งานระบบ (Register Account)
            </h2>
            <p className="text-blue-100 text-xs mt-0.5">
              ศูนย์การลงทะเบียนผู้เข้าอบรมและบุคลากรโรงงาน SNC Former B9
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Section */}
        {registeredResult ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle size={36} />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {registeredResult.auto_approved ? 'ลงทะเบียนสำเร็จ พร้อมเข้าใช้งาน!' : 'ยื่นคำขอลงทะเบียนสำเร็จ!'}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
                {registeredResult.message}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 text-left max-w-md mx-auto space-y-2 border border-slate-200 dark:border-slate-700 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">ชื่อผู้ใช้งาน (Username):</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{registeredResult.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ประเภทบัญชี:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 capitalize">{registeredResult.account_type}</span>
              </div>
              {registeredResult.expires_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">อายุการใช้งาน:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">30 วัน (ถึง {new Date(registeredResult.expires_at).toLocaleDateString('th-TH')})</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                handleClose();
                if (onRegisterSuccess) onRegisterSuccess(registeredResult.username);
              }}
              className="w-full max-w-md mx-auto py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>กลับสู่หน้าเข้าสู่ระบบ (Sign In)</span>
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div>
            {/* Tabs Switcher */}
            <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 m-4 rounded-xl text-sm font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('trainee')}
                className={`py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'trainee'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <GraduationCap size={18} />
                <span>ผู้เข้าอบรมคลาสเรียน (Trainee)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('workforce')}
                className={`py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'workforce'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Building2 size={18} />
                <span>บุคลากรโรงงาน / คำขอพิเศษ</span>
              </button>
            </div>

            {/* TAB 1: TRAINEE FORM */}
            {activeTab === 'trainee' && (
              <form onSubmit={handleTraineeSubmit} className="p-6 pt-2 space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3.5 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
                  <Sparkles size={18} className="shrink-0 text-blue-600 mt-0.5" />
                  <div>
                    <span className="font-semibold">ระบบเข้าเรียนทันที (Fast-Track):</span>
                    <p className="mt-0.5">
                      กรอก <b>"รหัสห้องเรียน (Class Code)"</b> ที่ได้รับจากผู้สอนเพื่อรับสิทธิ์เข้าเรียนใน Learning Hub ทันทีโดยไม่ต้องรออนุมัติ
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ชื่อ-นามสกุลจริง (Full Name) *
                    </label>
                    <input
                      type="text"
                      name="fullname"
                      required
                      placeholder="เช่น สมชาย ใจดี"
                      value={traineeForm.fullname}
                      onChange={handleTraineeChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      เบอร์โทรศัพท์ (Phone Number)
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="08X-XXX-XXXX"
                      value={traineeForm.phone}
                      onChange={handleTraineeChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ชื่อผู้ใช้งานที่ต้องการ (Username) *
                    </label>
                    <input
                      type="text"
                      name="username"
                      required
                      placeholder="ใช้อักษรภาษาอังกฤษหรือเบอร์โทร"
                      value={traineeForm.username}
                      onChange={handleTraineeChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      รหัสผ่าน (Password) *
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      value={traineeForm.password}
                      onChange={handleTraineeChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      สังกัด / สถาบัน / บริษัท (Organization)
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      placeholder="เช่น มหาวิทยาลัย / บริษัทภายนอก"
                      value={traineeForm.company_name}
                      onChange={handleTraineeChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1 font-semibold">
                      <Key size={13} />
                      รหัสห้องเรียน (Class Code) *
                    </label>
                    <input
                      type="text"
                      name="class_code"
                      required
                      placeholder="เช่น SNC-B9, SNC-LEARN"
                      value={traineeForm.class_code}
                      onChange={handleTraineeChange}
                      className="w-full px-3 py-2 rounded-lg border-2 border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase font-bold"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <GraduationCap size={18} />
                        <span>ลงทะเบียนและเริ่มเข้าเรียนทันที</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: FACTORY WORKFORCE & SPECIAL ACCESS FORM */}
            {activeTab === 'workforce' && (
              <form onSubmit={handleWorkforceSubmit} className="p-6 pt-2 space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <AlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-semibold">กระบวนการตรวจสอบสิทธิ์ (Approval Gate):</span>
                    <p className="mt-0.5">
                      คำขอสมัครสำหรับสายงานโรงงานจะถูกส่งต่อไปยังผู้ดูแลระบบ (Admin) เพื่ออนุมัติและผูกสิทธิ์ประจำไลน์ผลิต
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      กลุ่มผู้ใช้งาน (Account Type) *
                    </label>
                    <select
                      name="account_type"
                      value={workforceForm.account_type}
                      onChange={handleWorkforceChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="employee">พนักงานโรงงาน / สัญญาจ้าง (Factory Staff)</option>
                      <option value="contractor">ทีมงานภายนอก / ผู้รับเหมา / QC ส่งตัว (Contractor)</option>
                      <option value="customer">ลูกค้าภายนอก / ตรวจรับสินค้า (Customer)</option>
                      <option value="executive">ผู้บริหารส่วนกลาง (HQ Executive)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ตำแหน่งที่ขอ (Requested Role) *
                    </label>
                    <select
                      name="role"
                      value={workforceForm.role}
                      onChange={handleWorkforceChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="operator">พนักงานฝ่ายผลิต (Operator / Subcontract)</option>
                      <option value="supervisor">หัวหน้าไลน์ / ซุปเปอร์ไวเซอร์ (Supervisor)</option>
                      <option value="qc">ฝ่ายตรวจสอบคุณภาพ (Quality Control / QC)</option>
                      <option value="maintenance">ช่างซ่อมบำรุง / วิศวกร PE (Maintenance / PE)</option>
                      <option value="planner">เจ้าหน้าที่วางแผน (Production Planner)</option>
                      <option value="contractor">ผู้รับเหมา / ช่างเฉพาะกิจ (Contractor)</option>
                      <option value="customer">ลูกค้า / ผู้ตรวจประเมิน (Customer)</option>
                      <option value="executive">ผู้บริหารส่วนกลาง (HQ Executive)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ชื่อ-นามสกุลจริง *
                    </label>
                    <input
                      type="text"
                      name="fullname"
                      required
                      placeholder="เช่น นายธนากร มั่นคง"
                      value={workforceForm.fullname}
                      onChange={handleWorkforceChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      รหัสพนักงาน (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      name="emp_id"
                      placeholder="เช่น 109600123"
                      value={workforceForm.emp_id}
                      onChange={handleWorkforceChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ไลน์ผลิต / พื้นที่ปฏิบัติงาน
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
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      เบอร์โทรศัพท์ติดต่อ
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="08X-XXX-XXXX"
                      value={workforceForm.phone}
                      onChange={handleWorkforceChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ชื่อผู้ใช้งาน (Username) *
                    </label>
                    <input
                      type="text"
                      name="username"
                      required
                      placeholder="กรอกชื่อผู้ใช้สำหรับเข้าสู่ระบบ"
                      value={workforceForm.username}
                      onChange={handleWorkforceChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      รหัสผ่าน (Password) *
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      value={workforceForm.password}
                      onChange={handleWorkforceChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    เหตุผลและความจำเป็นในการขอเข้าใช้งาน (Purpose) *
                  </label>
                  <textarea
                    name="request_reason"
                    rows={2}
                    required
                    placeholder="เช่น เข้ามารับผิดชอบการตรวจสอบชิ้นส่วนไลน์ 3 ชั่วคราว / ขอสิทธิ์ดูรายงานตู้สินค้าสำหรับลูกค้า"
                    value={workforceForm.request_reason}
                    onChange={handleWorkforceChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  ></textarea>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Building2 size={18} />
                        <span>ส่งคำขอเปิดใช้งานบัญชี (Submit Request)</span>
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
