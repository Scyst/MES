import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  UserCheck,
  UserX,
  Edit,
  Shield,
  Users as UsersIcon,
  Key,
  History,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { userManageApi } from '../../../shared/services/userManageApi';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';
import DataTable from '../../../shared/components/DataTable';
import UserFormModal from '../components/UserFormModal';
import RolesPermissionsTab from '../components/RolesPermissionsTab';
import AuditLogsTab from '../components/AuditLogsTab';
import PendingApprovalsTab from '../components/PendingApprovalsTab';
import ApproveUserModal from '../components/ApproveUserModal';

const ROLE_BADGE_CLASSES = {
  admin: 'bg-purple-100 text-purple-700 border border-purple-200',
  supervisor: 'bg-blue-100 text-blue-700 border border-blue-200',
  operator: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  manager: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  qc: 'bg-orange-100 text-orange-700 border border-orange-200',
  maintenance: 'bg-slate-100 text-slate-700 border border-slate-200',
  planner: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
  trainee: 'bg-teal-100 text-teal-700 border border-teal-200',
  contractor: 'bg-amber-100 text-amber-700 border border-amber-200',
  customer: 'bg-sky-100 text-sky-700 border border-sky-200',
  executive: 'bg-rose-100 text-rose-700 border border-rose-200',
};

const TAB_BUTTON_BASE = 'mes-tab-btn';
const tabClasses = (isActive) =>
  `${TAB_BUTTON_BASE} ${isActive ? 'mes-tab-btn-active' : 'mes-tab-btn-inactive'}`;

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

function UserAvatar({ user }) {
  const [imgError, setImgError] = useState(false);
  const initial = (user.fullname || user.username || '?').charAt(0).toUpperCase();

  if (user.profile_picture && !imgError) {
    return (
      <img
        src={user.profile_picture}
        alt={user.username}
        onError={() => setImgError(true)}
        className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
      />
    );
  }

  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
        user.is_active == 1
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
          : 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
      }`}
    >
      {initial}
    </div>
  );
}

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

  // Pending Approvals State
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [approveModalUser, setApproveModalUser] = useState(null);

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

  const fetchPendingUsers = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await userManageApi.getPendingApprovals();
      if (res.success) {
        setPendingUsers(Array.isArray(res.data) ? res.data : []);
      }
    } catch (error) {
      console.error('Failed to load pending users:', error);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchPendingUsers();
  }, [fetchUsers, fetchPendingUsers]);

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

  const handleResetPassword = useCallback(async (user) => {
    const accepted = await confirm({
      title: 'รีเซ็ตรหัสผ่านเริ่มต้น',
      message: `คุณต้องการรีเซ็ตรหัสผ่านสำหรับผู้ใช้งาน @${user.username} (${user.fullname || user.emp_id || ''}) เป็นรหัสเริ่มต้น "123456" ใช่หรือไม่?`,
      danger: true,
    });
    if (!accepted) return;

    try {
      const result = await userManageApi.resetPasswordDefault(user.id);
      if (result.success) {
        toast.success(result.message || 'รีเซ็ตรหัสผ่านเป็น 123456 เรียบร้อยแล้ว');
        fetchUsers();
      } else {
        toast.error(result.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้');
      }
    } catch (error) {
      console.error('Reset password failed:', error);
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
    return [...new Set(users.map((u) => u.role).filter(Boolean))].sort();
  }, [users]);

  // Role/status filters are applied here; free-text search is handled by DataTable
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = roleFilter ? user.role === roleFilter : true;
      const matchesStatus =
        statusFilter === ''
          ? true
          : statusFilter === 'active'
            ? user.is_active == 1
            : user.is_active == 0;
      return matchesRole && matchesStatus;
    });
  }, [users, roleFilter, statusFilter]);

  const userColumns = useMemo(
    () => [
      {
        key: 'fullname',
        header: 'ผู้ใช้งาน (User)',
        accessor: (user) => `${user.fullname || ''} ${user.username || ''} ${user.emp_id || ''}`,
        render: (user) => (
          <div className="flex items-center gap-2.5">
            <UserAvatar user={user} />
            <div>
              <div className="font-semibold text-xs text-gray-900 dark:text-white leading-tight">
                {user.fullname || '-'}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                <span className="font-mono text-blue-600 dark:text-blue-400 font-medium">@{user.username}</span>
                <span>•</span>
                <span>รหัส: {user.emp_id || '-'}</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'ตำแหน่ง & ไลน์ (Role & Line)',
        accessor: (user) => `${user.role || ''} ${user.line || ''} ${user.team_group || ''}`,
        render: (user) => (
          <div>
            <div className="flex items-center gap-1 flex-wrap">
              <span
                className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${ROLE_BADGE_CLASSES[user.role] || 'bg-gray-100 text-gray-700'
                  }`}
              >
                {user.role ? user.role.toUpperCase() : 'UNKNOWN'}
              </span>
              {user.account_type && user.account_type !== 'employee' && (
                <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
                  {user.account_type}
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              {user.line || 'No Line'}
              {user.team_group ? ` • ${user.team_group}` : ''}
              {user.company_name ? ` • ${user.company_name}` : ''}
            </div>
          </div>
        ),
      },
      {
        key: 'security_activity',
        header: 'ความปลอดภัย & การเข้าใช้งาน',
        accessor: (user) =>
          `${user.pwd_changed_at || ''} ${user.last_login || ''} ${user.is_auto_generated == 1 ? 'System' : 'Manual'}`,
        render: (user) => (
          <div className="space-y-0.5 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium ${user.is_auto_generated == 1
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
              >
                {user.is_auto_generated == 1 ? 'System' : 'Manual'}
              </span>
              {user.pwd_changed_at ? (
                <span className="text-gray-500 flex items-center gap-1" title={`เปลี่ยนรหัสล่าสุด: ${user.pwd_changed_at}`}>
                  <Key size={10} className="text-gray-400" /> {formatDate(user.pwd_changed_at)}
                </span>
              ) : (
                <span className="text-amber-600 font-medium flex items-center gap-1" title="ยังไม่เคยเปลี่ยนรหัสผ่าน">
                  <AlertTriangle size={10} /> ยังไม่เปลี่ยนรหัส
                </span>
              )}
            </div>
            <div className="text-gray-400 flex items-center gap-1 text-[11px]">
              <Clock size={10} /> {user.last_login ? `ใช้งาน: ${formatDate(user.last_login)}` : 'ยังไม่เคยเข้าสู่ระบบ'}
            </div>
            {user.expires_at && (
              <div className="flex items-center gap-1 text-[11px] font-medium">
                {new Date(user.expires_at).getTime() < Date.now() ? (
                  <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                    <AlertTriangle size={10} /> หมดอายุแล้ว ({formatDate(user.expires_at)})
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Clock size={10} /> หมดอายุ: {formatDate(user.expires_at)}
                  </span>
                )}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'is_active',
        header: 'สถานะ (Status)',
        accessor: (user) => (user.is_active == 1 ? 'Active' : 'Inactive'),
        render: (user) =>
          user.is_active == 1 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <UserCheck size={12} /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <UserX size={12} /> Inactive
            </span>
          ),
      },
      {
        key: 'actions',
        header: 'จัดการ (Actions)',
        sortable: false,
        exportable: false,
        render: (user) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => openEditModal(user)}
              className="mes-btn-table-action bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"
              title="แก้ไขผู้ใช้งานและสิทธิ์"
              aria-label="แก้ไขผู้ใช้งานและสิทธิ์"
            >
              <Edit size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleResetPassword(user)}
              className="mes-btn-table-action bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
              title="รีเซ็ตรหัสผ่านเริ่มต้น (123456)"
              aria-label="รีเซ็ตรหัสผ่านเริ่มต้น"
            >
              <Key size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleToggleStatus(user.id, user.is_active == 1)}
              className={`mes-btn-table-action ${user.is_active == 1
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                }`}
              title={user.is_active == 1 ? 'ปิดการใช้งานผู้ใช้' : 'เปิดการใช้งานผู้ใช้'}
              aria-label={user.is_active == 1 ? 'ปิดการใช้งานผู้ใช้' : 'เปิดการใช้งานผู้ใช้'}
            >
              {user.is_active == 1 ? <UserX size={14} /> : <UserCheck size={14} />}
            </button>
          </div>
        ),
      },
    ],
    [openEditModal, handleToggleStatus, handleResetPassword]
  );

  return (
    <div className="mes-page-container">
      {/* Header section */}
      <div className="mes-page-header">
        <div>
          <h1 className="mes-page-title">
            <Shield className="text-blue-600 w-6 h-6" /> User & Access Management
          </h1>
          <p className="mes-page-subtitle">จัดการผู้ใช้งานและสิทธิ์การเข้าถึงระบบ</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={handleSyncManpower}
            disabled={syncing}
            className="mes-btn bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Manpower'}
          </button>

          <button
            onClick={openAddModal}
            className="mes-btn-primary"
          >
            <Plus size={14} />
            Add User
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mes-tab-nav">
        <button onClick={() => setActiveTab('users')} className={tabClasses(activeTab === 'users')}>
          <UsersIcon size={16} /> Users List
        </button>
        <button onClick={() => setActiveTab('pending')} className={tabClasses(activeTab === 'pending')}>
          <UserCheck size={16} />
          <span>คำขอรออนุมัติ (Pending)</span>
          {pendingUsers.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse">
              {pendingUsers.length}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab('roles')} className={tabClasses(activeTab === 'roles')}>
          <Key size={16} /> Roles & Permissions
        </button>
        <button onClick={() => setActiveTab('logs')} className={tabClasses(activeTab === 'logs')}>
          <History size={16} /> Audit Logs
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'roles' && <RolesPermissionsTab />}
        {activeTab === 'logs' && <AuditLogsTab />}
        {activeTab === 'pending' && (
          <PendingApprovalsTab
            pendingUsers={pendingUsers}
            loading={pendingLoading}
            onRefresh={fetchPendingUsers}
            onApproveClick={(u) => setApproveModalUser(u)}
          />
        )}

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
              <div className="flex gap-2">
                <select
                  className="mes-select min-w-[150px]"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  aria-label="กรองตามระดับผู้ใช้งาน"
                >
                  <option value="">ทุกระดับ (All Roles)</option>
                  {uniqueRoles.map((role) => (
                    <option key={role} value={role}>
                      {role.toUpperCase()}
                    </option>
                  ))}
                </select>
                <select
                  className="mes-select min-w-[150px]"
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

      {approveModalUser && (
        <ApproveUserModal
          isOpen={!!approveModalUser}
          onClose={() => setApproveModalUser(null)}
          pendingUser={approveModalUser}
          onApproved={() => {
            fetchPendingUsers();
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}
