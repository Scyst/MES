import React, { useState } from 'react';
import {
  Folder, FileText, FileSpreadsheet, Image as ImageIcon, Box,
  Archive, File, MoreVertical, Eye, Download, Edit2,
  FolderInput, RefreshCw, Trash2, ChevronLeft, ChevronRight, User,
  CornerLeftUp
} from 'lucide-react';
import SecurityWatermark from '../../../shared/components/SecurityWatermark';

function getFileIcon(fileName, isFolder) {
  if (isFolder) {
    return <Folder size={18} className="text-amber-500 fill-amber-400/20 shrink-0" />;
  }
  const ext = fileName ? fileName.split('.').pop().toLowerCase() : '';
  if (ext === 'pdf') {
    return <FileText size={18} className="text-rose-500 shrink-0" />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileSpreadsheet size={18} className="text-emerald-500 shrink-0" />;
  }
  if (['step', 'stp', 'igs', 'iges', 'stl', 'obj', 'gltf', 'glb'].includes(ext)) {
    return <Box size={18} className="text-cyan-500 shrink-0" />;
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return <ImageIcon size={18} className="text-purple-500 shrink-0" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <Archive size={18} className="text-amber-600 shrink-0" />;
  }
  return <File size={18} className="text-slate-400 shrink-0" />;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function DocumentTable({
  items = [],
  loading = false,
  canManage = false,
  currentFolderPath = '',
  selectedIds = new Set(),
  onToggleSelect,
  onSelectAll,
  onNavigateFolder,
  onPreview,
  onDownload,
  onRename,
  onMove,
  onRevise,
  onDelete,
  pagination,
  onPageChange,
}) {
  const [activeMenuId, setActiveMenuId] = useState(null);

  React.useEffect(() => {
    const handleOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  const folderParts = currentFolderPath ? currentFolderPath.split('/').filter(Boolean) : [];
  const parentPath = folderParts.slice(0, -1).join('/');
  const parentName = folderParts.length > 1 ? folderParts[folderParts.length - 2] : 'All Files (ราก)';

  const selectableItems = items.filter((it) => it.id !== null);
  const allSelected = selectableItems.length > 0 && selectableItems.every((it) => selectedIds.has(it.id));

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden relative">
      {/* DLP Security Watermark on Document Grid */}
      <SecurityWatermark classification="DOCUMENT CENTER • RESTRICTED" />

      {/* Table Container */}
      <div className="flex-1 overflow-x-auto overflow-y-auto relative z-10">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 uppercase font-semibold text-[11px]">
            <tr>
              {canManage && (
                <th className="w-10 px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
                  />
                </th>
              )}
              <th className="px-3 py-2.5 min-w-[280px]">ชื่อไฟล์ / โฟลเดอร์ (File Name)</th>
              <th className="px-3 py-2.5 min-w-[180px]">คำอธิบาย (Description)</th>
              <th className="px-3 py-2.5 w-36">หมวดหมู่ (Folder)</th>
              <th className="px-3 py-2.5 w-24 text-right">ขนาด (Size)</th>
              <th className="px-3 py-2.5 w-44">ผู้อัปโหลด (Uploader)</th>
              <th className="px-3 py-2.5 w-28 text-center">วันที่ (Date)</th>
              <th className="px-3 py-2.5 w-14 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
            {/* Desktop Style '..' Parent Directory Navigation Row */}
            {!loading && folderParts.length > 0 && (
              <tr
                onClick={() => onNavigateFolder(parentPath)}
                className="bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/70 dark:hover:bg-amber-900/50 border-b border-amber-200/60 dark:border-amber-800/60 cursor-pointer transition-colors group select-none"
                title={`คลิกเพื่อย้อนกลับไปที่: ${parentName}`}
              >
                {canManage && (
                  <td className="px-3 py-2.5 text-center text-slate-300 dark:text-slate-600" onClick={(e) => e.stopPropagation()}>
                    -
                  </td>
                )}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-200/70 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <CornerLeftUp size={14} />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-amber-900 dark:text-amber-300 text-xs group-hover:underline">
                        .. [ย้อนกลับ 1 ระดับ]
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                        ({parentName})
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 italic text-[11px]">
                  กลับสู่โฟลเดอร์แม่ (Parent Folder)
                </td>
                <td className="px-3 py-2.5 text-slate-400 text-[10px]">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-semibold">
                    UP
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-slate-400 text-[11px]">-</td>
                <td className="px-3 py-2.5 text-slate-400 text-[11px]">-</td>
                <td className="px-3 py-2.5 text-center text-slate-400 text-[11px]">-</td>
                <td className="px-3 py-2.5 text-center text-slate-400 text-[11px]" onClick={(e) => e.stopPropagation()}>
                  <CornerLeftUp size={14} className="mx-auto text-amber-600 dark:text-amber-400 group-hover:scale-125 transition-transform" />
                </td>
              </tr>
            )}

            {loading ? (
              <tr>
                <td colSpan={canManage ? 8 : 7} className="py-20 text-center text-slate-400">
                  <div className="inline-flex items-center gap-2 font-medium">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>กำลังโหลดรายการเอกสาร...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 8 : 7} className="py-20 text-center text-slate-400">
                  <div className="max-w-xs mx-auto">
                    <Folder size={40} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">โฟลเดอร์นี้ยังไม่มีเอกสาร</p>
                    <p className="text-[11px] mt-0.5 text-slate-400">ท่านสามารถอัปโหลดเอกสารใหม่ หรือสร้างโฟลเดอร์ย่อยได้</p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const isFolder = item.is_folder || item.file_type === 'folder';
                const isSelected = item.id && selectedIds.has(item.id);
                const isMenuOpen = activeMenuId === (item.id || item.file_name);

                const handleRowClick = () => {
                  if (isFolder) {
                    const newPath = item.category
                      ? `${item.category}/${item.file_name}`
                      : item.file_name;
                    onNavigateFolder(newPath);
                  } else {
                    onPreview(item);
                  }
                };

                return (
                  <tr
                    key={item.id ? `doc-${item.id}` : `folder-${item.file_name}-${idx}`}
                    onClick={handleRowClick}
                    className={`cursor-pointer group hover:bg-blue-50/70 dark:hover:bg-slate-800/70 transition-colors select-none ${
                      isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    {canManage && (
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        {item.id ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelect(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
                          />
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                        )}
                      </td>
                    )}

                    {/* File Name & Icon */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(item.file_name, isFolder)}
                        <div className="min-w-0 flex-1">
                          {isFolder ? (
                            <span className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate block text-xs">
                              {item.file_name}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate text-xs">
                                {item.file_name}
                              </span>
                              {item.linked_3d_id && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPreview({
                                      id: item.linked_3d_id,
                                      file_name: item.linked_3d_name,
                                      category: item.category,
                                    });
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-cyan-100 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-200 transition-colors cursor-pointer"
                                  title="เปิดดู 3D Model ที่ผูกอยู่กับเอกสารนี้"
                                >
                                  <Box size={11} />
                                  <span>3D Model</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400 truncate max-w-[240px]">
                      {item.file_description || '-'}
                    </td>

                    {/* Category Folder */}
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400 truncate">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                        {item.category || 'Root'}
                      </span>
                    </td>

                    {/* File Size */}
                    <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                      {isFolder ? '-' : formatBytes(item.file_size)}
                    </td>

                    {/* Uploader */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {item.uploader_avatar ? (
                          <img
                            src={item.uploader_avatar}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0 text-[10px]">
                            <User size={11} />
                          </div>
                        )}
                        <span className="truncate text-slate-700 dark:text-slate-300 text-xs">
                          {item.uploaded_by || item.uploader_username || '-'}
                        </span>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {item.created_at ? item.created_at.slice(0, 10) : '-'}
                    </td>

                    {/* Actions Menu */}
                    <td className="px-3 py-2 text-center relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const key = item.id || item.file_name;
                          setActiveMenuId(activeMenuId === key ? null : key);
                        }}
                        className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div className="absolute right-2 top-8 z-30 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 text-left text-xs animate-in fade-in zoom-in-95 duration-100">
                          {!isFolder && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onPreview(item);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                              >
                                <Eye size={13} className="text-blue-500" />
                                <span>เปิดดูเอกสาร</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onDownload(item);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                              >
                                <Download size={13} className="text-emerald-500" />
                                <span>ดาวน์โหลด</span>
                              </button>
                            </>
                          )}

                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onRename(item);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                              >
                                <Edit2 size={13} className="text-indigo-500" />
                                <span>เปลี่ยนชื่อ</span>
                              </button>

                              {!isFolder && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onMove(item);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                  >
                                    <FolderInput size={13} className="text-teal-500" />
                                    <span>ย้ายโฟลเดอร์</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onRevise(item);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                  >
                                    <RefreshCw size={13} className="text-amber-500" />
                                    <span>อัปเดตเวอร์ชัน</span>
                                  </button>
                                </>
                              )}

                              <div className="border-t border-slate-100 dark:border-slate-700/60 my-1" />

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onDelete(item);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                                <span>ลบ{isFolder ? 'โฟลเดอร์' : 'เอกสาร'}</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between gap-4 text-xs relative z-10">
          <p className="text-slate-500 dark:text-slate-400">
            แสดงหน้า <span className="font-bold text-slate-800 dark:text-slate-200">{pagination.currentPage}</span> จาก{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">{pagination.totalPages}</span> (ทั้งหมด{' '}
            {pagination.totalRecords} รายการ)
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.currentPage <= 1}
              onClick={() => onPageChange(pagination.currentPage - 1)}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-mono font-bold text-slate-700 dark:text-slate-200">
              {pagination.currentPage} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => onPageChange(pagination.currentPage + 1)}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
