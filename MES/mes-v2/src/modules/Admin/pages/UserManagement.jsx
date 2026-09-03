import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, RefreshCw, UserCheck, UserX, Edit, Shield, Users as UsersIcon, Key, History } from 'lucide-react';
import { userManageApi } from '../../../shared/services/userManageApi';
import UserFormModal from '../components/UserFormModal';
import RolesPermissionsTab from '../components/RolesPermissionsTab';
import AuditLogsTab from '../components/AuditLogsTab';

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const result = await userManageApi.getUsers();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSyncManpower = async () => {
    if (!window.confirm('Are you sure you want to sync users from the Manpower HR system?')) return;
    setSyncing(true);
    try {
      const result = await userManageApi.syncManpower();
      if (result.success) {
        alert(result.message);
        fetchUsers();
      } else {
        alert(result.message || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Error connecting to sync API.');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const actionStr = currentStatus ? 'Disable' : 'Enable';
    if (!window.confirm(`Are you sure you want to ${actionStr} this user?`)) return;
    
    try {
      const result = await userManageApi.toggleStatus(id);
      if (result.success) {
        fetchUsers();
      } else {
        alert(result.message || 'Failed to toggle status');
      }
    } catch (error) {
      alert('Error toggling status');
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const closeModal = (shouldReload = false) => {
    setIsModalOpen(false);
    setEditingUser(null);
    if (shouldReload) fetchUsers();
  };

  // Extract unique roles for the filter dropdown
  const uniqueRoles = useMemo(() => {
    return [...new Set(users.map(u => u.role).filter(Boolean))].sort();
  }, [users]);

  // Apply filters and search
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        (user.fullname && user.fullname.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.emp_id && user.emp_id.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesRole = roleFilter ? user.role === roleFilter : true;
      const matchesStatus = statusFilter === '' ? true : (statusFilter === 'active' ? user.is_active == 1 : user.is_active == 0);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="text-blue-600" /> User & Access Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">จัดการผู้ใช้งานและสิทธิ์การเข้าถึงระบบ</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={handleSyncManpower}
            disabled={syncing}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-medium border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
            {syncing ? 'Syncing...' : 'Sync Manpower'}
          </button>
          
          <button 
            onClick={openAddModal}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add User
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 gap-6">
        <button 
          onClick={() => setActiveTab('users')}
          className={`pb-3 flex items-center gap-2 font-medium transition-colors ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <UsersIcon size={18} /> Users List
        </button>
        <button 
          onClick={() => setActiveTab('roles')}
          className={`pb-3 flex items-center gap-2 font-medium transition-colors ${activeTab === 'roles' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Key size={18} /> Roles & Permissions
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`pb-3 flex items-center gap-2 font-medium transition-colors ${activeTab === 'logs' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <History size={18} /> Audit Logs
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'roles' && <RolesPermissionsTab />}
        {activeTab === 'logs' && <AuditLogsTab />}
        
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-gray-400" size={18} />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="ค้นหาชื่อ, รหัสพนักงาน, Username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-3 md:w-1/3">
          <select 
            className="w-full py-2 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">ทุกระดับ (All Roles)</option>
            {uniqueRoles.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
          </select>

          <select 
            className="w-full py-2 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">ทุกสถานะ (All Status)</option>
            <option value="active">Active (เปิดใช้งาน)</option>
            <option value="inactive">Inactive (ปิดใช้งาน)</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                <th className="py-3 px-4 font-semibold">User / ID</th>
                <th className="py-3 px-4 font-semibold">Name</th>
                <th className="py-3 px-4 font-semibold">Role / Team</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-500">Loading users...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-500">
                    ไม่พบผู้ใช้งานที่ค้นหา (No users found)
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{user.username}</div>
                      <div className="text-xs text-gray-500">Emp ID: {user.emp_id || '-'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-800">{user.fullname}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium 
                        ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' 
                        : user.role === 'supervisor' ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'}`}>
                        {user.role ? user.role.toUpperCase() : 'UNKNOWN'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {user.line || 'No Line'} {user.team_group ? `(${user.team_group})` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {user.is_active == 1 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-medium">
                          <UserCheck size={14} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-medium">
                          <UserX size={14} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(user)}
                          className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                          title="Edit User & Permissions"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(user.id, user.is_active == 1)}
                          className={`p-1.5 rounded transition-colors ${
                            user.is_active == 1 
                            ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                            : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                          title={user.is_active == 1 ? "Disable User" : "Enable User"}
                        >
                          {user.is_active == 1 ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 text-sm text-gray-500 flex justify-between">
          <span>แสดง {filteredUsers.length} รายการ</span>
          {/* Pagination could be added here if needed */}
        </div>
      </div>

      {isModalOpen && (
        <UserFormModal 
          isOpen={isModalOpen} 
          onClose={closeModal} 
          userData={editingUser} 
        />
      )}
          </div>
        )}
      </div>
    </div>
  );
}
