import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { userManageApi } from '../../../shared/services/userManageApi';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';

export default function RolesPermissionsTab() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);

  // Form for new permission
  const [newPerm, setNewPerm] = useState({ code: '', desc: '', module: '' });
  const [adding, setAdding] = useState(false);

  const loadMatrix = async () => {
    setLoading(true);
    try {
      const res = await userManageApi.getPermissionMatrix();
      if (res.success) {
        // Map data to match UI expectations
        const mappedRoles = res.data.roles.map(r => r.role_code);
        const mappedPerms = res.data.permissions.map(p => {
          const grants = {};
          mappedRoles.forEach(r => {
            grants[r] = res.data.mappings[r]?.includes(p.perm_code) || false;
          });
          return { ...p, role_grants: grants };
        });
        setMatrixData({ roles: mappedRoles, permissions: mappedPerms });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, []);

  const handleToggle = async (roleCode, permCode, isCurrentlyGranted) => {
    if (roleCode === 'creator') {
      toast.warning("ไม่สามารถแก้ไขสิทธิ์ของ System Owner (creator) ได้");
      return;
    }
    
    // Optimistic UI update
    const newGrantedState = !isCurrentlyGranted;
    setMatrixData(prev => {
      const newMatrix = { ...prev };
      const roleIndex = newMatrix.roles.indexOf(roleCode);
      const permItem = newMatrix.permissions.find(p => p.perm_code === permCode);
      if (permItem && permItem.role_grants[roleCode] !== undefined) {
        permItem.role_grants[roleCode] = newGrantedState;
      }
      return newMatrix;
    });

    try {
      const res = await userManageApi.togglePermission(roleCode, permCode, newGrantedState);
      if (!res.success) {
        toast.error(res.message || 'ไม่สามารถบันทึกสิทธิ์ได้');
        loadMatrix(); // Revert on failure
      }
    } catch (e) {
      console.error(e);
      loadMatrix();
    }
  };

  const handleAddPerm = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await userManageApi.addPermission(newPerm.code, newPerm.desc, newPerm.module);
      if (res.success) {
        toast.success('เพิ่มสิทธิ์สำเร็จ');
        setNewPerm({ code: '', desc: '', module: '' });
        loadMatrix();
      } else {
        toast.error(res.message || 'ไม่สามารถเพิ่มสิทธิ์ได้');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  };

  const handleDeletePerm = async (permCode) => {
    const accepted = await confirm({
      title: 'ลบสิทธิ์การใช้งาน',
      message: `กรุณายืนยันการลบสิทธิ์ '${permCode}' การลบจะมีผลกับทุกบทบาทที่ได้รับสิทธิ์นี้`,
      confirmText: 'ลบสิทธิ์',
      danger: true,
    });
    if (!accepted) return;
    try {
      const res = await userManageApi.deletePermission(permCode);
      if (res.success) {
        toast.success('ลบสิทธิ์สำเร็จ');
        loadMatrix();
      } else {
        toast.error(res.message || 'ไม่สามารถลบสิทธิ์ได้');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && !matrixData) {
    return <div className="py-12 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div></div>;
  }
  if (!matrixData) return <div className="text-center py-4 text-red-500">Error: Could not load matrix data</div>;

  return (
    <div className="space-y-6">
      
      {/* Alert Banner */}
      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3 flex gap-2.5 items-start text-xs">
        <ShieldAlert className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" size={18} />
        <div>
          <h4 className="font-semibold text-blue-900 dark:text-blue-300">Permission Matrix (PBAC)</h4>
          <p className="text-blue-800 dark:text-blue-400 text-xs mt-0.5">กำหนดสิทธิ์พื้นฐานให้กับแต่ละบทบาท (Role) การเปลี่ยนแปลงจะมีผลกับผู้ใช้งานทุกคนที่อยู่ใน Role นั้นทันที</p>
          <p className="text-blue-600 dark:text-blue-400 text-[11px] mt-0.5">* สิทธิ์ระดับ System Owner (creator) ถูกล็อกไว้ไม่สามารถแก้ไขได้</p>
        </div>
        
        {user?.role === 'creator' && (
          <button 
            onClick={() => setIsMasterModalOpen(true)}
            className="ml-auto mes-btn-primary"
          >
            <Settings size={14} /> Manage Master
          </button>
        )}
      </div>

      {/* Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-max text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <th className="py-2.5 px-3 font-semibold bg-slate-100 dark:bg-slate-800 sticky left-0 z-10 w-64 border-r border-slate-200 dark:border-slate-700">สิทธิ์ (Permission)</th>
              <th className="py-2.5 px-3 font-semibold">รายละเอียด</th>
              {matrixData?.roles.map(role => (
                <th key={role} className="py-2.5 px-3 font-semibold text-center border-l border-slate-200 dark:border-slate-700">
                  {role.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {matrixData?.permissions.map(perm => (
              <tr key={perm.perm_code} className="hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors">
                <td className="py-2 px-3 bg-white dark:bg-slate-900 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-blue-900 dark:text-blue-300">
                  <div className="font-semibold">{perm.perm_code}</div>
                  <div className="text-[10px] text-slate-500 uppercase mt-0.5">{perm.module_name}</div>
                </td>
                <td className="py-2 px-3 text-xs text-slate-600 dark:text-slate-300">
                  {perm.description}
                </td>
                {matrixData.roles.map(role => (
                  <td key={role} className="py-2 px-3 text-center border-l border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-850/30">
                    <button
                      onClick={() => handleToggle(role, perm.perm_code, perm.role_grants[role])}
                      disabled={role === 'creator'}
                      className={`p-1 rounded-lg transition-all ${
                        role === 'creator' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'
                      }`}
                    >
                      {perm.role_grants[role] ? (
                        <CheckCircle size={18} className="text-emerald-500" />
                      ) : (
                        <XCircle size={18} className="text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Master Modal for Creators only */}
      {isMasterModalOpen && user?.role === 'creator' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">จัดการข้อมูล Master Permissions</h2>
              <button onClick={() => setIsMasterModalOpen(false)} className="text-gray-400 hover:text-red-500"><XCircle size={20}/></button>
            </div>
            
            <div className="p-6 space-y-6">
              <form onSubmit={handleAddPerm} className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium text-blue-800 mb-1">Perm Code</label>
                  <input required value={newPerm.code} onChange={e=>setNewPerm(p=>({...p, code:e.target.value}))}
                    className="w-full text-sm py-1.5 px-2 border rounded focus:ring-2 outline-none" placeholder="e.g. view_reports" />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium text-blue-800 mb-1">Module Name</label>
                  <input required value={newPerm.module} onChange={e=>setNewPerm(p=>({...p, module:e.target.value}))}
                    className="w-full text-sm py-1.5 px-2 border rounded focus:ring-2 outline-none" placeholder="e.g. REPORTS" />
                </div>
                <div className="flex-2 min-w-[200px]">
                  <label className="block text-xs font-medium text-blue-800 mb-1">Description</label>
                  <input required value={newPerm.desc} onChange={e=>setNewPerm(p=>({...p, desc:e.target.value}))}
                    className="w-full text-sm py-1.5 px-2 border rounded focus:ring-2 outline-none" placeholder="รายละเอียด..." />
                </div>
                <button type="submit" disabled={adding} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 flex items-center gap-1 h-[34px]">
                  <Plus size={16} /> Add
                </button>
              </form>

              <div className="max-h-[400px] overflow-y-auto border rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 font-medium">Code</th>
                      <th className="px-4 py-2 font-medium">Module</th>
                      <th className="px-4 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {matrixData?.permissions.map(p => (
                      <tr key={p.perm_code} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-blue-700">{p.perm_code}</td>
                        <td className="px-4 py-2 text-gray-500 text-xs">{p.module_name}</td>
                        <td className="px-4 py-2">
                          <button onClick={() => handleDeletePerm(p.perm_code)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                            <Trash2 size={16}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
