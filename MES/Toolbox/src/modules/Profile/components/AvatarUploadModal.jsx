import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Check, AlertCircle } from 'lucide-react';
import { profileApi } from '../../../shared/services/profileApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import { useAuth } from '../../../shared/contexts/AuthContext';

export default function AvatarUploadModal({ isOpen, onClose, currentAvatarUrl, onAvatarUpdated }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const { showToast } = useToast();
  const { checkAuth } = useAuth();

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('กรุณาเลือกไฟล์รูปภาพเท่านั้น (.jpg, .png, .webp)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('ขนาดไฟล์ต้องไม่เกิน 5 MB');
      return;
    }

    setSelectedFile(file);
    setErrorMsg('');
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('avatar', selectedFile);

      const res = await profileApi.uploadAvatar(formData);
      if (res && res.success) {
        showToast(res.message || 'อัปเดตรูปโปรไฟล์สำเร็จ', 'success');
        if (checkAuth) checkAuth({ silent: true });
        onAvatarUpdated?.(res.data?.profile_picture || res.data?.avatar_url);
        onClose();
      } else {
        setErrorMsg(res?.message || 'ไม่สามารถอัปโหลดรูปภาพได้');
      }
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการอัปโหลด: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold">เปลี่ยนรูปโปรไฟล์ (Change Avatar)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center space-y-4">
          {errorMsg && (
            <div className="w-full p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Avatar Preview */}
          <div className="relative group">
            <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center bg-slate-100 dark:bg-slate-800">
              {previewUrl || currentAvatarUrl ? (
                <img
                  src={previewUrl || currentAvatarUrl}
                  alt="Avatar Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-12 h-12 text-slate-400" />
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-transform hover:scale-110"
              title="เลือกรูปภาพใหม่"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            รองรับไฟล์ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB<br />
            (แนะนำรูปสัดส่วน 1:1 หรือสี่เหลี่ยมจัตุรัส)
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-750 hover:bg-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {uploading ? 'กำลังบันทึก...' : 'บันทึกรูปโปรไฟล์'}
          </button>
        </div>
      </div>
    </div>
  );
}
