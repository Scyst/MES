import React, { useState, useEffect } from 'react';
import { FiX, FiUser, FiSave } from 'react-icons/fi';
import axios from 'axios';
import AvatarCropper from './AvatarCropper';
import ConfirmDialog from './common/ConfirmDialog';

export default function ProfileSettingsModal({ isOpen, onClose, currentUser, onSaved }) {
  const [akaInput, setAkaInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  
  const [initialAka, setInitialAka] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [initialGithub, setInitialGithub] = useState({ username: '', token: '' });
  
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const isDirty = akaInput !== initialAka || avatarFile !== null || githubUsername !== initialGithub.username || githubToken !== initialGithub.token;

  const handleClose = () => {
    if (isDirty) {
      setShowConfirmClose(true);
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setAvatarError(false);
      if (currentUser?.username) {
        setAvatarPreview(`api/uploads/avatars/${encodeURIComponent(currentUser.username)}.jpg?t=${Date.now()}`);
      }
      // Fetch current AKA and Github Settings when modal opens
      axios.get('/api/profile.php')
        .then(res => {
          if (res.data) {
            if (res.data.aka !== undefined) {
              setAkaInput(res.data.aka);
              setInitialAka(res.data.aka);
            }
            if (res.data.githubUsername !== undefined) {
              setGithubUsername(res.data.githubUsername);
              setGithubToken(res.data.githubToken);
              setInitialGithub({ username: res.data.githubUsername, token: res.data.githubToken });
            }
          }
        })
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    // Clean up input
    const newAkas = akaInput.split(',').map(s => s.trim()).filter(s => s);
    const formattedAka = newAkas.join(', ');

    try {
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        await axios.post('/api/upload_avatar.php', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        localStorage.setItem('avatar_ts', Date.now().toString());
      }

      await axios.post('/api/profile.php', { 
        aka: formattedAka,
        githubUsername: githubUsername.trim(),
        githubToken: githubToken.trim()
      });
      localStorage.setItem('user_akas', formattedAka);
      
      // Update global current user object if needed
      if (currentUser && avatarPreview) {
        // App.jsx will handle refreshing the UI based on timestamp or local storage
      }
      
      if (onSaved) onSaved();
      
      setInitialAka(formattedAka);
      setInitialGithub({ username: githubUsername.trim(), token: githubToken.trim() });
      setAvatarFile(null);
      
      onClose();
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        setError('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (.jpg, .png)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('ไฟล์ต้องมีขนาดไม่เกิน 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.addEventListener('load', () => setCropImageSrc(reader.result));
      reader.readAsDataURL(file);
      
      setError(null);
      e.target.value = null; // reset input
    }
  };

  const handleCropComplete = (croppedBlob) => {
    setAvatarFile(croppedBlob);
    setAvatarPreview(URL.createObjectURL(croppedBlob));
    setCropImageSrc(null);
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
    {cropImageSrc && (
      <AvatarCropper 
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
        onCancel={() => setCropImageSrc(null)}
      />
    )}
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={handleClose}></div>
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl animate-scale-up overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-500">
              <FiUser />
            </div>
            ตั้งค่าโปรไฟล์
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
          
          <div className="flex items-center gap-4 mb-4">
             <div className="relative group w-16 h-16 shrink-0 cursor-pointer" onClick={() => document.getElementById('avatarUpload').click()}>
                {avatarPreview && !avatarError ? (
                  <img src={avatarPreview} onError={() => setAvatarError(true)} alt="Avatar" className="w-16 h-16 rounded-full object-cover shadow-md" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
                    {(currentUser?.fullname || currentUser?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <FiUser className="text-white text-xl" />
                </div>
                <input id="avatarUpload" type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleAvatarChange} />
             </div>
             <div>
                <h4 className="text-lg font-bold text-slate-800 dark:text-white">{currentUser?.fullname || currentUser?.username}</h4>
                <p className="text-sm text-slate-500 capitalize">{currentUser?.role || 'User'}</p>
                <p className="text-xs text-indigo-500 mt-0.5 cursor-pointer hover:underline" onClick={() => document.getElementById('avatarUpload').click()}>เปลี่ยนรูปภาพ</p>
             </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">ชื่อเล่น / ชื่อเรียก (AKAs)</label>
            <input 
              type="text"
              placeholder="เช่น Oat, โอ๊ต (หากมีหลายชื่อให้คั่นด้วยลูกน้ำ)"
              value={akaInput}
              onChange={(e) => setAkaInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm outline-none dark:text-white"
            />
            <p className="text-xs text-slate-500 mt-2">
              ชื่อเล่นนี้จะช่วยให้ระบบค้นหาและแสดงชื่อจริงของคุณได้ถูกต้อง เมื่อเพื่อนร่วมทีมพิมพ์ชื่อเล่นของคุณในหน้าระบบ
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FiUser /> การเชื่อมต่อ GitHub
            </h4>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">GitHub Username</label>
              <input 
                type="text"
                placeholder="เช่น scyst, torvalds"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm outline-none dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Personal Access Token (PAT) <span className="text-slate-400 font-normal">(ใส่หรือไม่ใส่ก็ได้)</span></label>
              <input 
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm outline-none dark:text-white"
              />
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                * หากต้องการให้ระบบแสดงสถิติและจำนวน Commit จากโปรเจ็คที่เป็น Private Repository คุณต้องกรอก PAT ที่มีสิทธิ์ `repo` หรือ `read:user`
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={handleClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">ยกเลิก</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm flex items-center gap-2">
              <FiSave /> {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
