import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Shield, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { userManageApi } from '../../../shared/services/userManageApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';

export default function ApproveUserModal({ isOpen, onClose, pendingUser, onApproved }) {
  const toast = useToast();
  const [role, setRole] = useState('operator');
  const [line, setLine] = useState('');
  const [expiryOption, setExpiryOption] = useState('30_days'); // 'no_expiry' | '14_days' | '30_days' | '90_days' | 'custom'
  const [customExpiry, setCustomExpiry] = useState('');
  const [permissions, setPermissions] = useState({
    all: [],
    rolePerms: [],
    userPerms: []
  });
  const [loading, setLoading] = useState(false);
  const [permLoading, setPermLoading] = useState(false);

  useEffect(() => {
    if (pendingUser) {
      setRole(pendingUser.role || 'operator');
      setLine(pendingUser.line || 'LINE 1');
      if (pendingUser.account_type === 'trainee') {
        setExpiryOption('30_days');
      } else if (pendingUser.account_type === 'contractor') {
        setExpiryOption('90_days');
      } else {
        setExpiryOption('no_expiry');
      }
      fetchPermissions(pendingUser.id, pendingUser.role || 'operator');
    }
  }, [pendingUser]);

  const fetchPermissions = async (userId, roleCode) => {
    setPermLoading(true);
    try {
      const res = await userManageApi.getPermissions(userId, roleCode);
      if (res && res.success) {
        const payload = res.data || res;
        setPermissions({
          all: payload.all || [],
          rolePerms: payload.role_perms || [],
          userPerms: payload.user_perms || []
        });
      }
    } catch (e) {
      console.error('Failed to load permissions', e);
    } finally {
      setPermLoading(false);
    }
  };

  useEffect(() => {
    if (role && pendingUser) {
      fetchPermissions(pendingUser.id, role);
    }
  }, [role]);

  if (!isOpen || !pendingUser) return null;

  const handleTogglePermission = (permCode) => {
    setPermissions(prev => {
      const isGranted = prev.userPerms.includes(permCode);
      let newUserPerms;
      if (isGranted) {
        newUserPerms = prev.userPerms.filter(p => p !== permCode);
      } else {
        newUserPerms = [...prev.userPerms, permCode];
      }
      return { ...prev, userPerms: newUserPerms };
    });
  };

  const calculateExpiresAt = () => {
    const now = new Date();
    if (expiryOption === '14_days') {
      now.setDate(now.getDate() + 14);
      return now.toISOString().slice(0, 19).replace('T', ' ');
    }
    if (expiryOption === '30_days') {
      now.setDate(now.getDate() + 30);
      return now.toISOString().slice(0, 19).replace('T', ' ');
    }
    if (expiryOption === '90_days') {
      now.setDate(now.getDate() + 90);
      return now.toISOString().slice(0, 19).replace('T', ' ');
    }
    if (expiryOption === 'custom' && customExpiry) {
      return `${customExpiry} 23:59:59`;
    }
    return null;
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const payload = {
        id: pendingUser.id,
        role,
        line,
        expires_at: calculateExpiresAt(),
        permissions: permissions.userPerms
      };

      const res = await userManageApi.approveUser(payload);
      if (res.success) {
        toast.success(res.message);
        onApproved();
        onClose();
      } else {
        toast.error(res.message || 'อนุมัติไม่สำเร็จ');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการอนุมัติ');
    } finally {
      setLoading(false);
    }
  };

  // Group permissions by module
  const groupedPerms = (permissions.all || []).reduce((acc, perm) => {
    const mod = perm.module_name || 'GENERAL';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(perm);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 dark:border-slate-800 my-8">

        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CheckCircle size={20} />
              พิจารณาอนุมัติคำขอเปิดใช้งานบัญชี (Review & Approve)
            </h2>
            <p className="text-emerald-100 text-xs mt-0.5">
              ผู้ใช้: <b>{pendingUser.fullname}</b> (@{pendingUser.username})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* User Request Summary Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-sm space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">ประเภทคำขอ:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 capitalize">{pendingUser.account_type}</span>
              </div>
              <div>
                <span className="text-slate-500 block">สังกัด / บริษัท:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{pendingUser.company_name || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">เบอร์โทรติดต่อ:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{pendingUser.phone || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">วันที่ยื่นคำขอ:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(pendingUser.created_at).toLocaleDateString('th-TH')}</span>
              </div>
            </div>

            {pendingUser.request_reason && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500 block font-medium">เหตุผล / สิทธิ์ที่ขอเพิ่มเติม:</span>
                <p className="text-slate-700 dark:text-slate-300 italic mt-0.5">{pendingUser.request_reason}</p>
              </div>
            )}
          </div>

          {/* Role and Line Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                กำหนด Role ประจำตัว *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="operator">OPERATOR (ฝ่ายผลิต/สัญญาจ้าง)</option>
                <option value="supervisor">SUPERVISOR (หัวหน้าไลน์)</option>
                <option value="qc">QC (ฝ่ายตรวจสอบคุณภาพ)</option>
                <option value="maintenance">MAINTENANCE (ช่างซ่อม/วิศวกร)</option>
                <option value="planner">PLANNER (วางแผนการผลิต)</option>
                <option value="trainee">TRAINEE (ผู้เข้าอบรม)</option>
                <option value="contractor">CONTRACTOR (ทีมงานภายนอก)</option>
                <option value="customer">CUSTOMER (ลูกค้าภายนอก)</option>
                <option value="executive">EXECUTIVE (ผู้บริหารส่วนกลาง)</option>
                <option value="admin">ADMIN (ผู้ดูแลระบบ)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                กำหนดไลน์ผลิต / พื้นที่
              </label>
              <select
                value={line}
                onChange={(e) => setLine(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
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
                กำหนดอายุการใช้งาน (Expiry)
              </label>
              <select
                value={expiryOption}
                onChange={(e) => setExpiryOption(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="no_expiry">ไม่มีวันหมดอายุ (Permanent)</option>
                <option value="14_days">14 วัน (คอร์สระยะสั้น)</option>
                <option value="30_days">30 วัน (ผู้เข้าอบรม 1 เดือน)</option>
                <option value="90_days">90 วัน (สัญญาจ้าง 3 เดือน)</option>
                <option value="custom">กำหนดวันที่เอง (Custom)</option>
              </select>
            </div>
          </div>

          {expiryOption === 'custom' && (
            <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
              <label className="block text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
                เลือกวันหมดอายุของบัญชี:
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={customExpiry}
                onChange={(e) => setCustomExpiry(e.target.value)}
                className="px-3 py-1.5 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-sm outline-none"
              />
            </div>
          )}

          {/* PBAC Permission Matrix Table */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Shield size={16} className="text-indigo-600" />
                ปรับแต่งสิทธิ์รายบุคคล (Individual PBAC Overrides)
              </h3>
              <span className="text-xs text-slate-500">
                สิทธิ์ที่ติ๊กและเป็นสีเทา = สิทธิ์มาตรฐานของ <b>{role.toUpperCase()}</b>
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              {permLoading ? (
                <div className="p-8 text-center text-slate-400">กำลังโหลดสิทธิ์...</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-2 w-10 text-center">สิทธิ์</th>
                      <th className="px-3 py-2 w-48">รหัสสิทธิ์ (Code)</th>
                      <th className="px-3 py-2">รายละเอียด (Description)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Object.keys(groupedPerms).map(module => (
                      <React.Fragment key={module}>
                        <tr className="bg-slate-100 dark:bg-slate-800/80">
                          <td colSpan={3} className="px-3 py-1.5 font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                            {module}
                          </td>
                        </tr>
                        {groupedPerms[module].map(p => {
                          const hasRolePerm = permissions.rolePerms.includes(p.perm_code);
                          const hasUserPerm = permissions.userPerms.includes(p.perm_code);
                          const isChecked = hasRolePerm || hasUserPerm;

                          return (
                            <tr key={p.perm_code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="px-3 py-1.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={hasRolePerm}
                                  onChange={() => handleTogglePermission(p.perm_code)}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                                />
                              </td>
                              <td className="px-3 py-1.5 font-mono text-slate-700 dark:text-slate-300">
                                {p.perm_code}
                              </td>
                              <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400">
                                {p.description}
                                {hasRolePerm && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-600">by Role</span>}
                                {hasUserPerm && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700 font-medium">Custom PBAC</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-100 transition-colors"
          >
            ยกเลิก (Cancel)
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleApprove}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <CheckCircle size={16} />
                <span>อนุมัติและเปิดใช้งานบัญชี</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
