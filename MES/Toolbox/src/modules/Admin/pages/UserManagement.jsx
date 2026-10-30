import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, RefreshCw, UserCheck, UserX, Edit, Shield, Users as UsersIcon, Key, History } from 'lucide-react';
import { userManageApi } from '../../../shared/services/userManageApi';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';
import DataTable from '../../../shared/components/DataTable';
import UserFormModal from '../components/UserFormModal';
import RolesPermissionsTab from '../components/RolesPermissionsTab';
import AuditLogsTab from '../components/AuditLogsTab';

const ROLE_BADGE_CLASSES = {
  admin: 'bg-purple-100 text-purple-700',
  supervisor: 'bg-blue-100 text-blue-700',
};

const TAB_BUTTON_BASE = 'pb-3 flex items-center gap-2 font-medium transition-colors min-h-[44px]';
const tabClasses = (isActive) =>
  `${TAB_BUTTON_BASE} ${isActive ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`;

export default function UserManagement() {
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await userManageApi.getUsers();
      if (result.success) {
        setUsers(Array.isArray(result.data) ? result.data : []);
      } else {
        toast.error(result.message || 'ไม่สามารถโหลดรายชื่อผู้ใช้งานได้');
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSyncManpower = async () => {
    const accepted = await confirm({
      title: 'ซิงค์ข้อมูลผู้ใช้งาน',
      message: 'กรุณายืนยันการซิงค์ข้อมูลผู้ใช้งานจากระบบ Manpower HR',
    });
    if (!accepted) return;
    setSyncing(true);
    try {
      const result = await userManageApi.syncManpower();
      if (result.success) {
        toast.success(result.message || 'ซิงค์ข้อมูลสำเร็จ');
        fetchUsers();
      } else {
        toast.error(result.message || 'ซิงค์ข้อมูลไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleStatus = useCallback(async (id, currentStatus) => {
    const accepted = await confirm({
      title: currentStatus ? 'ปิดการใช้งานผู้ใช้' : 'เปิดการใช้งานผู้ใช้',
      message: currentStatus
        ? 'กรุณายืนยันการปิดการใช้งานผู้ใช้รายนี้'
        : 'กรุณายืนยันการเปิดการใช้งานผู้ใช้รายนี้',
      danger: currentStatus,
    });
    if (!accepted) return;

    try {
      const result = await userManageApi.toggleStatus(id);
      if (result.success) {
        toast.success('อัปเดตสถานะผู้ใช้งานสำเร็จ');
        fetchUsers();
      } else {
        toast.error(result.message || 'ไม่สามารถเปลี่ยนสถานะผู้ใช้งานได้');
      }
    } catch (error) {
      console.error('Toggle status failed:', error);
    }
  }, [confirm, toast, fetchUsers]);

  const openAddModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = useCallback((user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  }, []);

  const closeModal = (shouldReload = false) => {
    setIsModalOpen(false);
    setEditingUser(null);
    if (shouldReload) fetchUsers();
  };

  // Extract unique roles for the filter dropdown
  const uniqueRoles = useMemo(() => {
    return [...new Set(users.map(u => u.role).filter(Boolean))].sort();
  }, [users]);

  // Role/status filters are applied here; free-text search is handled by DataTable
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesRole = roleFilter ? user.role === roleFilter : true;
      const matchesStatus = statusFilter === '' ? true : (statusFilter === 'active' ? user.is_active == 1 : user.is_active == 0);
      return matchesRole && matchesStatus;
    });
  }, [users, roleFilter, statusFilter]);

  const userColumns = useMemo(() => [
    { key: 'username', header: 'Username', render: (user) => <span className="font-medium text-gray-900 dark:text-white">{user.username}</span> },
    { key: 'emp_id', header: 'Emp ID', accessor: (user) => user.emp_id || '-' },
    { key: 'fullname', header: 'Name' },
    {
      key: 'role',
      header: 'Role',
      accessor: (user) => (user.role ? user.role.toUpperCase() : 'UNKNOWN'),
      render: (user) => (
        <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${ROLE_BADGE_CLASSES[user.role] || 'bg-gray-100 text-gray-700'}`}>
          {user.role ? user.role.toUpperCase() : 'UNKNOWN'}
        </span>
      ),
    },
    {
      key: 'line',
      header: 'Line / Team',
      accessor: (user) => `${user.line || 'No Line'}${user.team_group ? ` (${user.team_group})` : ''}`,
    },
    {
      key: 'is_active',
      header: 'Status',
      accessor: (user) => (user.is_active == 1 ? 'Active' : 'Inactive'),
      render: (user) => user.is_active == 1 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600">
          <UserCheck size={14} /> Active
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-600">
          <UserX size={14} /> Inactive
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      exportable: false,
      render: (user) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openEditModal(user)}
            className="flex h-11 w-11 items-center justify-center rounded bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100"
            title="Edit User & Permissions"
            aria-label="แก้ไขผู้ใช้งานและสิทธิ์"
          >
            <Edit size={16} />
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(user.id, user.is_active == 1)}
            className={`flex h-11 w-11 items-center justify-center rounded transition-colors ${user.is_active == 1
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              }`}
            title={user.is_active == 1 ? 'Disable User' : 'Enable User'}
            aria-label={user.is_active == 1 ? 'ปิดการใช้งานผู้ใช้' : 'เปิดการใช้งานผู้ใช้'}
          >
            {user.is_active == 1 ? <UserX size={16} /> : <UserCheck size={16} />}
          </button>
        </div>
      ),
    },
  ], [openEditModal, handleToggleStatus]);

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
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 px-4 min-h-[44px] rounded-lg font-medium border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
            {syncing ? 'Syncing...' : 'Sync Manpower'}
          </button>

          <button
            onClick={openAddModal}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 min-h-[44px] rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add User
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 gap-6 overflow-x-auto">
        <button onClick={() => setActiveTab('users')} className={tabClasses(activeTab === 'users')}>
          <UsersIcon size={18} /> Users List
        </button>
        <button onClick={() => setActiveTab('roles')} className={tabClasses(activeTab === 'roles')}>
          <Key size={18} /> Roles & Permissions
        </button>
        <button onClick={() => setActiveTab('logs')} className={tabClasses(activeTab === 'logs')}>
          <History size={18} /> Audit Logs
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'roles' && <RolesPermissionsTab />}
        {activeTab === 'logs' && <AuditLogsTab />}

        {activeTab === 'users' && (
          <DataTable
            columns={userColumns}
            rows={filteredUsers}
            rowKey={(user) => user.id}
            loading={loading}
            searchPlaceholder="ค้นหาชื่อ, รหัสพนักงาน, Username..."
            emptyMessage="ไม่พบผู้ใช้งานที่ค้นหา"
            exportFileName="Users"
            toolbar={
              <div className="flex gap-3 md:w-1/3">
                <select
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  aria-label="กรองตามระดับผู้ใช้งาน"
                >
                  <option value="">ทุกระดับ (All Roles)</option>
                  {uniqueRoles.map((role) => <option key={role} value={role}>{role.toUpperCase()}</option>)}
                </select>
                <select
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="กรองตามสถานะ"
                >
                  <option value="">ทุกสถานะ (All Status)</option>
                  <option value="active">Active (เปิดใช้งาน)</option>
                  <option value="inactive">Inactive (ปิดใช้งาน)</option>
                </select>
              </div>
            }
          />
        )}
      </div>

      {isModalOpen && (
        <UserFormModal
          isOpen={isModalOpen}
          onClose={closeModal}
          userData={editingUser}
        />
      )}
    </div>
  );
}
