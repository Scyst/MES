import React, { useState, useEffect } from 'react';
import { X, Save, Search, Shield, Info } from 'lucide-react';
import { userManageApi } from '../../../shared/services/userManageApi';

export default function UserFormModal({ isOpen, onClose, userData }) {
  const isEditMode = !!userData;
  
  const [formData, setFormData] = useState({
    id: '',
    username: '',
    password: '',
    fullname: '',
    emp_id: '',
    role: 'operator',
    line: '',
    team_group: ''
  });

  const [permissions, setPermissions] = useState({
    all: [],
    rolePerms: [],
    userPerms: []
  });

  const [loading, setLoading] = useState(false);
  const [permLoading, setPermLoading] = useState(false);
  const [searchEmpId, setSearchEmpId] = useState('');

  // Setup initial form state
  useEffect(() => {
    if (userData) {
      setFormData({
        id: userData.id,
        username: userData.username || '',
        password: '', // blank on edit unless changing
        fullname: userData.fullname || '',
        emp_id: userData.emp_id || '',
        role: userData.role || 'operator',
        line: userData.line || '',
        team_group: userData.team_group || ''
      });
      fetchPermissions(userData.id, userData.role);
    } else {
      setFormData({
        id: '',
        username: '',
        password: '',
        fullname: '',
        emp_id: '',
        role: 'operator',
        line: '',
        team_group: ''
      });
      fetchPermissions(0, 'operator');
    }
  }, [userData]);

  const fetchPermissions = async (userId, roleCode) => {
    setPermLoading(true);
    try {
      const res = await userManageApi.getPermissions(userId, roleCode);
      if (res.success) {
        setPermissions({
          all: res.data.all || [],
          rolePerms: res.data.role_perms || [],
          userPerms: res.data.user_perms || []
        });
      }
    } catch (e) {
      console.error("Failed to load permissions", e);
    } finally {
      setPermLoading(false);
    }
  };

  // When role changes, refetch role perms
  useEffect(() => {
    if (formData.role && isOpen) {
      fetchPermissions(formData.id || 0, formData.role);
    }
  }, [formData.role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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

  const handleSearchEmp = async () => {
    if (!searchEmpId) return;
    try {
      const res = await userManageApi.getEmpInfo(searchEmpId);
      if (res.success) {
        setFormData(prev => ({
          ...prev,
          emp_id: searchEmpId,
          fullname: res.data.name_th || prev.fullname,
          line: res.data.line || prev.line,
          team_group: res.data.team_group || prev.team_group,
          username: prev.username || searchEmpId // Suggest username
        }));
      } else {
        alert("Employee not found in Manpower HR system");
      }
    } catch (e) {
      alert("Error searching employee");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Prepare payload
    const payload = {
      ...formData,
      permissions: permissions.userPerms // Send the PBAC overrides
    };

    try {
      let res;
      if (isEditMode) {
        res = await userManageApi.updateUser(payload);
      } else {
        res = await userManageApi.createUser(payload);
      }

      if (res.success) {
        onClose(true); // reload list
      } else {
        alert(res.message || 'Operation failed');
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Error connecting to API');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Group permissions by module
  const groupedPerms = permissions.all.reduce((acc, perm) => {
    const mod = perm.module_name || 'General';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(perm);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">
            {isEditMode ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
          </h2>
          <button onClick={() => onClose()} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body - 2 Columns */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="userForm" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Col: User Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2 text-blue-800">ข้อมูลพื้นฐาน</h3>
              
              {!isEditMode && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหาจากระบบ HR (Emp ID)</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={searchEmpId}
                      onChange={e => setSearchEmpId(e.target.value)}
                      placeholder="เช่น 12345"
                    />
                  </div>
                  <button type="button" onClick={handleSearchEmp} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg border hover:bg-slate-200 transition-colors">
                    <Search size={20} />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username <span className="text-red-500">*</span></label>
                  <input required name="username" value={formData.username} onChange={handleChange} readOnly={isEditMode}
                    className={`w-full px-3 py-2 border rounded-lg outline-none ${isEditMode ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {isEditMode && <span className="text-xs font-normal text-gray-500">(ปล่อยว่างถ้าไม่เปลี่ยน)</span>} {!isEditMode && <span className="text-red-500">*</span>}
                  </label>
                  <input type="password" required={!isEditMode} name="password" value={formData.password} onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล (Fullname)</label>
                <input type="text" name="fullname" value={formData.fullname} onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">รหัสพนักงาน (Emp ID)</label>
                  <input type="text" name="emp_id" value={formData.emp_id} onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">บทบาท (Role) <span className="text-red-500">*</span></label>
                  <select name="role" value={formData.role} onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value="operator">Operator</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="planner">Planner</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ไลน์ผลิต (Line)</label>
                  <input type="text" name="line" value={formData.line} onChange={handleChange} placeholder="เช่น L1, PRESS"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">กลุ่มทีม (Team Group)</label>
                  <input type="text" name="team_group" value={formData.team_group} onChange={handleChange} placeholder="เช่น A, B"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>

            {/* Right Col: Permissions (PBAC) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2 text-indigo-800 flex items-center gap-2">
                <Shield size={20} /> 
                สิทธิ์การเข้าถึง (PBAC Overrides)
              </h3>
              
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm text-indigo-700 flex gap-2 items-start">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p>สิทธิ์พื้นฐานจะถูกกำหนดโดย <b>Role</b> อัตโนมัติ (ช่องที่ติ๊กถูกและเป็นสีเทา) หากต้องการเพิ่มสิทธิ์เฉพาะบุคคล ให้ติ๊กเลือกเพิ่มเติมในตารางนี้</p>
              </div>

              <div className="bg-white border rounded-xl overflow-hidden h-[450px] overflow-y-auto">
                {permLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-2 border-b w-12 text-center">✓</th>
                        <th className="px-4 py-2 border-b">Permission (สิทธิ์)</th>
                        <th className="px-4 py-2 border-b">Description (รายละเอียด)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.keys(groupedPerms).length === 0 ? (
                        <tr><td colSpan="3" className="text-center py-4 text-gray-500">No permissions found in database.</td></tr>
                      ) : (
                        Object.keys(groupedPerms).map(module => (
                          <React.Fragment key={module}>
                            <tr className="bg-slate-50">
                              <td colSpan="3" className="px-4 py-2 font-bold text-slate-700 text-xs tracking-wider uppercase">
                                Module: {module}
                              </td>
                            </tr>
                            {groupedPerms[module].map(perm => {
                              const hasRolePerm = permissions.rolePerms.includes(perm.perm_code);
                              const hasUserPerm = permissions.userPerms.includes(perm.perm_code);
                              const isGranted = hasRolePerm || hasUserPerm;
                              
                              return (
                                <tr key={perm.perm_code} className="hover:bg-indigo-50/30 transition-colors">
                                  <td className="px-4 py-2 text-center">
                                    <input 
                                      type="checkbox" 
                                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 disabled:opacity-50"
                                      checked={isGranted}
                                      disabled={hasRolePerm} // cannot uncheck role perms here
                                      onChange={() => handleTogglePermission(perm.perm_code)}
                                    />
                                  </td>
                                  <td className="px-4 py-2 font-mono text-xs text-indigo-900 bg-indigo-50/50">
                                    {perm.perm_code}
                                  </td>
                                  <td className="px-4 py-2 text-gray-600">
                                    {perm.description}
                                    {hasRolePerm && <span className="ml-2 inline-block bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded">by Role</span>}
                                    {hasUserPerm && <span className="ml-2 inline-block bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded">by PBAC</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button type="button" onClick={() => onClose()} className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            ยกเลิก (Cancel)
          </button>
          <button 
            type="submit" 
            form="userForm"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70"
          >
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={18} />}
            {isEditMode ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้งาน'}
          </button>
        </div>

      </div>
    </div>
  );
}
