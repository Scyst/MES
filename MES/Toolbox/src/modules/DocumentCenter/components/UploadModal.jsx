import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Folder } from 'lucide-react';
import { documentCenterApi } from '../../../shared/services/documentCenterApi';

export default function UploadModal({ isOpen, onClose, currentFolderPath, folderTree = [], onSuccess }) {
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState(currentFolderPath || '');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Sync category when modal opens or path changes
  React.useEffect(() => {
    if (isOpen) {
      setCategory(currentFolderPath || '');
      setFile(null);
      setDescription('');
      setError('');
    }
  }, [isOpen, currentFolderPath]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('กรุณาเลือกไฟล์ที่ต้องการอัปโหลด');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('doc_file', file);
      formData.append('category', category.trim());
      formData.append('file_description', description.trim());

      const res = await documentCenterApi.uploadDocument(formData);
      if (res.success) {
        onSuccess(res.message || 'อัปโหลดเอกสารสำเร็จแล้ว');
        onClose();
      } else {
        setError(res.message || 'เกิดข้อผิดพลาดในการอัปโหลด');
      }
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการอัปโหลดเอกสาร');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Upload size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                อัปโหลดเอกสารใหม่ (Upload Document)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                รองรับไฟล์ PDF, Word, Excel, รูปภาพ, ZIP และไฟล์ 3D (STEP/STL) ขนาดสูงสุด 50MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <div className="flex items-center justify-center gap-3 text-slate-700 dark:text-slate-200">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold truncate max-w-[280px]">{file.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • คลิกเพื่อเปลี่ยนไฟล์
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2">
                  <Upload size={22} />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-0.5">
                  คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
                </p>
                <p className="text-[11px] text-slate-400">
                  PDF, DOCX, XLSX, STEP, STL, PNG, JPG (สูงสุด 50MB)
                </p>
              </div>
            )}
          </div>

          {/* Folder Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              โฟลเดอร์จัดเก็บ (Category / Folder Path)
            </label>
            <div className="relative">
              <input
                type="text"
                list="folderTreeList"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="เว้นว่างไว้เพื่อเก็บที่ราก (Root) หรือพิมพ์ชื่อโฟลเดอร์ย่อย"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100"
              />
              <datalist id="folderTreeList">
                {folderTree.map((f, idx) => (
                  <option key={idx} value={f} />
                ))}
              </datalist>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              สามารถระบุเส้นทางหลายชั้นได้ เช่น <code>WI/Assembly/Line1</code>
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              คำอธิบายเพิ่มเติม (Description)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ระบุวัตถุประสงค์ หรือหมายเหตุเอกสาร (ไม่บังคับ)"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>กำลังอัปโหลด...</span>
                </>
              ) : (
                <>
                  <Upload size={14} />
                  <span>บันทึกและอัปโหลด</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
