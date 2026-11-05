import React from 'react';
import { X, Download, ExternalLink, FileText, Image as ImageIcon, Box } from 'lucide-react';
import { documentCenterApi } from '../../../shared/services/documentCenterApi';

export default function DocumentPreviewModal({ doc, isOpen, onClose }) {
  if (!isOpen || !doc) return null;

  const ext = doc.file_name ? doc.file_name.split('.').pop().toLowerCase() : '';
  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  const is3D = ['step', 'stp', 'igs', 'iges', 'stl', 'obj', 'gltf', 'glb'].includes(ext);

  const viewUrl = documentCenterApi.getViewUrl(doc.id, false);
  const downloadUrl = documentCenterApi.getViewUrl(doc.id, true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              {isPdf && <FileText size={18} />}
              {isImage && <ImageIcon size={18} />}
              {is3D && <Box size={18} />}
              {!isPdf && !isImage && !is3D && <FileText size={18} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                {doc.file_name}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {doc.category ? `โฟลเดอร์: ${doc.category}` : 'All Files'} •{' '}
                {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
            >
              <Download size={13} />
              <span>ดาวน์โหลด</span>
            </a>
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <ExternalLink size={13} />
              <span>เปิดเต็มจอ</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Preview Area */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center">
          {isPdf && (
            <iframe
              src={viewUrl}
              title={doc.file_name}
              className="w-full h-full border-none"
            />
          )}

          {isImage && (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img
                src={viewUrl}
                alt={doc.file_name}
                className="max-w-full max-h-full object-contain rounded-lg shadow-md"
              />
            </div>
          )}

          {is3D && (
            <div className="text-center p-8 max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
              <div className="w-16 h-16 rounded-2xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-4">
                <Box size={32} />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">
                3D CAD Model ({ext.toUpperCase()})
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                ไฟล์โมเดล 3 มิติสำหรับเครื่องจักรและชิ้นงาน ท่านสามารถดาวน์โหลดไฟล์ไปเปิดในซอฟต์แวร์ CAD (SolidWorks, AutoCAD) ได้โดยตรง
              </p>
              <a
                href={downloadUrl}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 shadow-md hover:from-cyan-500 hover:to-blue-500 transition-all"
              >
                <Download size={16} />
                <span>ดาวน์โหลดไฟล์ 3D ({ext.toUpperCase()})</span>
              </a>
            </div>
          )}

          {!isPdf && !isImage && !is3D && (
            <div className="text-center p-8 max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center mx-auto mb-4">
                <FileText size={32} />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">
                เอกสารประเภท {ext ? `.${ext.toUpperCase()}` : 'ไฟล์'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                เบราว์เซอร์ไม่รองรับการแสดงตัวอย่างไฟล์ประเภทนี้โดยตรง กรุณาดาวน์โหลดเพื่อเปิดดูด้วยโปรแกรมที่เกี่ยวข้อง
              </p>
              <a
                href={downloadUrl}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all"
              >
                <Download size={16} />
                <span>ดาวน์โหลดไฟล์</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
