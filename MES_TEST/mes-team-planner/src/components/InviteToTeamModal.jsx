import React, { useState, useEffect } from 'react';
import { FiX, FiSearch, FiUserPlus, FiUser, FiTrash2, FiShield } from 'react-icons/fi';
import axios from 'axios';

export default function InviteToTeamModal({ isOpen, onClose, space, members = [], onMemberUpdate }) {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('Member');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // We assume /api/users.php?action=list exists in the main system, or we fetch from some user endpoint.
      // In MES_TEST we have `check_views.php` or similar. Let's use `api/users.php` assuming it works, or adapt it.
      const res = await axios.get('/api/users.php?action=list');
      if (res.data && Array.isArray(res.data)) {
        setUsers(res.data);
      } else if (res.data && Array.isArray(res.data.users)) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      const res = await axios.post('/api/spaces.php?action=add_member', {
        space_id: space.Id || space.id,
        user_id: userId,
        role: selectedRole
      });
      if (res.data) {
        onMemberUpdate();
        setSearchQuery('');
      }
    } catch (err) {
      console.error('Add member failed', err);
      alert('Failed to add member.');
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    try {
      await axios.put(`/api/spaces.php?action=update_member&id=${memberId}`, { role: newRole });
      onMemberUpdate();
    } catch (err) {
      console.error('Update role failed', err);
      alert('Failed to update role.');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('คุณต้องการนำผู้ใช้นี้ออกจากทีมใช่หรือไม่?')) return;
    try {
      await axios.delete(`/api/spaces.php?action=remove_member&id=${memberId}`);
      onMemberUpdate();
    } catch (err) {
      console.error('Remove member failed', err);
      alert('Failed to remove member.');
    }
  };

  if (!isOpen || !space) return null;

  // Filter users not in team yet
  const memberIds = members.map(m => String(m.UserId || m.user_id || m.username));
  const availableUsers = users.filter(u => !memberIds.includes(String(u.username || u.user_id)));
  
  const searchResults = availableUsers.filter(u => 
    (u.fullname || u.Name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.username || u.user_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.aka || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FiUserPlus className="text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Invite to {space.Name}</h2>
              <p className="text-sm text-slate-500">จัดการสมาชิกและสิทธิ์การเข้าถึงพื้นที่ทำงาน</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          
          {/* Invite Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">เชิญสมาชิกใหม่</h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                  placeholder="ค้นหาชื่อผู้ใช้ หรือรหัสพนักงาน..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm outline-none dark:text-white"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="Admin">Admin</option>
                <option value="Member">Member</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
            
            {searchQuery && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden max-h-48 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">ไม่พบข้อมูลผู้ใช้ที่ตรงกัน หรือผู้ใช้นี้อยู่ในทีมแล้ว</div>
                ) : (
                  searchResults.map(u => (
                    <div key={u.username || u.user_id} className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                          {(u.fullname || u.Name) ? (u.fullname || u.Name).charAt(0) : <FiUser />}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{u.fullname || u.Name}</div>
                          <div className="text-xs text-slate-500">{u.username || u.user_id} {u.aka && `(${u.aka})`}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAddMember(u.username || u.user_id)}
                        className="px-3 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400 rounded text-xs font-bold transition-colors"
                      >
                        เพิ่มเข้าทีม
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Current Members Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              สมาชิกในทีมปัจจุบัน ({members.length})
            </h3>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              {members.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">ยังไม่มีสมาชิกในทีมนี้</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {members.map(member => (
                    <div key={member.Id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm uppercase border border-indigo-200 dark:border-indigo-700">
                          {(member.Name || member.fullname) ? (member.Name || member.fullname).charAt(0) : <FiUser />}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            {member.Name || member.fullname}
                            {member.Role === 'Admin' && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 rounded text-[10px] uppercase font-bold flex items-center gap-1"><FiShield /> Admin</span>}
                          </div>
                          <div className="text-xs text-slate-500">
                            {member.UserId || member.user_id || member.username} • เข้าร่วมเมื่อ {member.JoinedAt ? member.JoinedAt.substring(0, 10) : '-'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <select 
                          className="px-2 py-1 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded bg-transparent hover:bg-white dark:hover:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 outline-none cursor-pointer transition-colors"
                          value={member.Role}
                          onChange={(e) => handleUpdateRole(member.Id, e.target.value)}
                        >
                          <option value="Admin">Admin</option>
                          <option value="Member">Member</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                        <button 
                          onClick={() => handleRemoveMember(member.Id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded transition-colors"
                          title="นำออกจากทีม"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
