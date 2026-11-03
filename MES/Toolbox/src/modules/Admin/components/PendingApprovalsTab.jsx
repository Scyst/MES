import React from 'react';
import { UserCheck, UserX, Clock, Building, Phone, AlertCircle, RefreshCw } from 'lucide-react';
import DataTable from '../../../shared/components/DataTable';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import { userManageApi } from '../../../shared/services/userManageApi';

export default function PendingApprovalsTab({ pendingUsers, loading, onRefresh, onApproveClick }) {
  const confirm = useConfirm();
  const toast = useToast();

  const handleReject = async (user) => {
    const isConfirmed = await confirm({
      title: `ปฏิเสธคำขอของ ${user.fullname}?`,
      message: `คุณแน่ใจหรือไม่ว่าต้องการปฏิเสธคำขอเปิดใช้งานบัญชีของ '${user.username}'?`,
      confirmText: 'ปฏิเสธคำขอ',
      confirmVariant: 'danger'
    });

    if (!isConfirmed) return;

    try {
      const res = await userManageApi.rejectUser({ id: user.id, reason: 'ปฏิเสธโดยผู้ดูแลระบบ' });
      if (res.success) {
        toast.success(res.message);
        onRefresh();
      } else {
        toast.error(res.message || 'ไม่สามารถปฏิเสธคำขอได้');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการปฏิเสธ');
    }
  };

  const columns = [
    {
      key: 'applicant',
      header: 'ผู้ยื่นคำขอ (Applicant)',
      accessor: (u) => `${u.fullname} ${u.username}`,
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
            {(u.fullname || u.username || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">{u.fullname}</div>
            <div className="text-xs text-slate-400 font-mono">@{u.username}</div>
          </div>
        </div>
      )
    },
    {
      key: 'account_type',
      header: 'ประเภท / Role ที่ขอ',
      accessor: (u) => `${u.account_type} ${u.role}`,
      render: (u) => (
        <div className="space-y-1">
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {u.account_type}
          </span>
          <div className="text-xs text-slate-600 dark:text-slate-400 capitalize font-medium">
            ขอ: {u.role}
          </div>
        </div>
      )
    },
    {
      key: 'org_line',
      header: 'สังกัด / ไลน์ผลิต',
      accessor: (u) => `${u.company_name} ${u.line}`,
      render: (u) => (
        <div className="text-xs space-y-0.5">
          {u.company_name && (
            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
              <Building size={12} className="text-slate-400" /> {u.company_name}
            </div>
          )}
          {u.line && (
            <div className="text-slate-500">
              ไลน์: <span className="font-semibold text-slate-700 dark:text-slate-300">{u.line}</span>
            </div>
          )}
          {u.phone && (
            <div className="flex items-center gap-1 text-slate-400">
              <Phone size={11} /> {u.phone}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'request_reason',
      header: 'เหตุผล / วัตถุประสงค์',
      accessor: (u) => u.request_reason || '',
      render: (u) => (
        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-xs">
          {u.request_reason || '-'}
        </p>
      )
    },
    {
      key: 'created_at',
      header: 'วันที่ยื่นคำขอ',
      accessor: (u) => u.created_at,
      render: (u) => (
        <div className="text-xs text-slate-500 flex items-center gap-1">
          <Clock size={12} />
          {u.created_at ? new Date(u.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'ดำเนินการ (Actions)',
      sortable: false,
      exportable: false,
      render: (u) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onApproveClick(u)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors cursor-pointer border border-emerald-200"
            title="พิจารณาอนุมัติและปรับแต่งสิทธิ์"
          >
            <UserCheck size={14} />
            <span>พิจารณาอนุมัติ</span>
          </button>

          <button
            type="button"
            onClick={() => handleReject(u)}
            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs transition-colors cursor-pointer"
            title="ปฏิเสธคำขอ"
          >
            <UserX size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-3">
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-bold">มีคำขอสมัครสมาชิกรอการตรวจสอบจำนวน {pendingUsers.length} รายการ</span>
            <p className="text-[11px] mt-0.5 text-amber-700 dark:text-amber-400">
              กรุณากดปุ่ม <b>"พิจารณาอนุมัติ"</b> เพื่อตรวจสอบข้อมูล กำหนด Role, ไลน์ผลิต, วันหมดอายุ และเลือกสิทธิ์ PBAC ที่เหมาะสมก่อนเปิดใช้งาน
            </p>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={pendingUsers}
        rowKey={(u) => u.id}
        loading={loading}
        searchPlaceholder="ค้นหาชื่อผู้ยื่นคำขอ, สังกัด, วัตถุประสงค์..."
        emptyMessage="ไม่มีคำขอสมัครสมาชิกรอดำเนินการในขณะนี้"
        exportFileName="Pending_User_Requests"
        toolbar={
          <button
            type="button"
            onClick={onRefresh}
            className="mes-btn-secondary h-[34px]"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>รีเฟรชคำขอ</span>
          </button>
        }
      />
    </div>
  );
}
