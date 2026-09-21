import React, { useState } from 'react';
import { FiX, FiUserPlus } from 'react-icons/fi';
import { resolveAssigneeName } from '../utils/userUtils';
import ConfirmDialog from './common/ConfirmDialog';

export default function InviteTeamModal({ isOpen, onClose, onSave, spaces = [], users = [], initialSpaceId = null }) {
  const [spaceId, setSpaceId] = useState(initialSpaceId || '');
  const [selectedUser, setSelectedUser] = useState('');
  const [role, setRole] = useState('Member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef(null);
  
  const [initialFormState, setInitialFormState] = useState(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUsers = React.useMemo(() => {
    if (!searchQuery && !selectedUser) return users.slice(0, 50);
    const q = searchQuery.toLowerCase();
    return users.filter(u => 
      (u.fullname && u.fullname.toLowerCase().includes(q)) || 
      (u.username && u.username.toLowerCase().includes(q)) || 
      (u.aka && u.aka.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [searchQuery, users, selectedUser]);

  React.useEffect(() => {
    if (isOpen) {
      const defaultSpaceId = initialSpaceId || (spaces.length > 0 ? spaces[0].Id : '');
      setSpaceId(defaultSpaceId);
      setSelectedUser('');
      setSearchQuery('');
      setRole('Member');
      setError(null);
      setInitialFormState(JSON.stringify({ spaceId: defaultSpaceId, selectedUser: '', role: 'Member' }));
    }
  }, [isOpen, initialSpaceId, spaces]);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    const currentFormState = JSON.stringify({ spaceId, selectedUser, role });
    if (initialFormState && currentFormState !== initialFormState) {
      setShowConfirmClose(true);
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!spaceId) {
      setError('กรุณาเลือกพื้นที่ทำงาน');
      return;
    }
    if (!selectedUser) {
      setError('กรุณาเลือกผู้ใช้งานจากรายการ (คลิกที่ชื่อผู้ใช้งาน)');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    const result = await onSave({ SpaceId: spaceId, UserId: selectedUser, Role: role });
    setIsSubmitting(false);
    
    if (result === true) {
      onClose();
    } else if (result && typeof result === 'string') {
      setError(result);
    }
  };

  return (
    <>
    <ConfirmDialog 
      isOpen={showConfirmClose}
      title="ละทิ้งการเปลี่ยนแปลง?"
      message="คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการปิดหน้าต่างนี้และละทิ้งการเปลี่ยนแปลงหรือไม่?"
      confirmText="ใช่, ปิดหน้าต่าง"
      cancelText="ยกเลิก"
      type="danger"
      onConfirm={() => {
        setShowConfirmClose(false);
        onClose();
      }}
      onCancel={() => setShowConfirmClose(false)}
    />
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={handleClose}></div>
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl animate-scale-up overflow-visible">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-500">
              <FiUserPlus />
            </div>
            เชิญสมาชิก
          </h3>
          <button type="button" onClick={handleClose} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-2 rounded-xl transition-colors">
            <FiX className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Select Space / Team</label>
            <select 
              required
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm outline-none dark:text-white"
            >
              <option value="" disabled>-- Select Space --</option>
              {spaces.map(s => (
                <option key={s.Id} value={s.Id}>{s.Name}</option>
              ))}
            </select>
          </div>

          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Select User</label>
            <input 
              type="text"
              placeholder="Search by name or AKA..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedUser('');
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm outline-none dark:text-white"
            />
            {isDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg custom-scrollbar">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(u => (
                    <div 
                      key={u.username}
                      onClick={() => {
                        setSelectedUser(u.username);
                        setSearchQuery(resolveAssigneeName(u.username, users));
                        setIsDropdownOpen(false);
                      }}
                      className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <div className="font-semibold">{resolveAssigneeName(u.username, users)}</div>
                      <div className="text-[10px] text-slate-500">{u.username}</div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500 text-center">ไม่พบผู้ใช้งาน</div>
                )}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
            <select 
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm outline-none dark:text-white"
            >
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm flex items-center gap-2">
              <FiUserPlus /> {isSubmitting ? 'Sending Invite...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
