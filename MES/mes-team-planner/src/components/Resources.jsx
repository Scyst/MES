import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  FiFolder, FiUploadCloud, FiSearch, FiGrid, FiList,
  FiDownload, FiTrash2, FiFile, FiFileText, FiImage,
  FiFilm, FiMusic, FiCode, FiX, FiCheck, FiPlus, FiTag,
  FiAlertCircle, FiLoader
} from 'react-icons/fi';

// ═══ Helpers ═══
const CATEGORIES = ['General', 'Document', 'Image', 'Spreadsheet', 'Drawing', 'Reference', 'Archive'];

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return dateStr; }
}

function getFileIcon(mimeType = '') {
  if (mimeType.startsWith('image/'))       return <FiImage className="text-emerald-500" />;
  if (mimeType.startsWith('video/'))       return <FiFilm className="text-purple-500" />;
  if (mimeType.startsWith('audio/'))       return <FiMusic className="text-pink-500" />;
  if (mimeType === 'application/pdf')      return <FiFileText className="text-rose-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
                                           return <FiFileText className="text-emerald-600" />;
  if (mimeType.includes('word') || mimeType.includes('document'))
                                           return <FiFileText className="text-blue-500" />;
  if (mimeType.startsWith('text/'))        return <FiCode className="text-amber-500" />;
  return <FiFile className="text-slate-500" />;
}

function getFileAccentColor(mimeType = '') {
  if (mimeType.startsWith('image/'))  return 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20';
  if (mimeType === 'application/pdf') return 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
                                      return 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20';
  if (mimeType.includes('word'))      return 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20';
  return 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
}

// ═══ Upload Modal ═══
function UploadModal({ onClose, onSuccess }) {
  const [file, setFile]           = useState(null);
  const [category, setCategory]   = useState('General');
  const [description, setDesc]    = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const [dragOver, setDragOver]   = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (f && f.size > 50 * 1024 * 1024) { setError('ขนาดไฟล์เกิน 50 MB'); return; }
    setFile(f);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('กรุณาเลือกไฟล์'); return; }
    setUploading(true); setError('');
    try {
      // Step 1: upload physical file
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await axios.post('/api/upload_attachment.php', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { name: storedName, url, size, type: mimeType } = uploadRes.data;

      // Step 2: register metadata
      const regRes = await axios.post('/api/resources.php', {
        name: file.name, storedName, url,
        mimeType: mimeType || file.type,
        sizeBytes: size || file.size,
        category, description
      });
      onSuccess(regRes.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'อัปโหลดล้มเหลว');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FiUploadCloud className="text-indigo-500" /> อัปโหลดไฟล์
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"><FiX /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
            {file ? (
              <div className="flex items-center justify-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span className="text-2xl">{getFileIcon(file.type)}</span>
                <div className="text-left">
                  <div className="font-medium truncate max-w-[280px]">{file.name}</div>
                  <div className="text-xs text-slate-400">{formatBytes(file.size)}</div>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="ml-auto p-1 rounded-full hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-500">
                  <FiX size={14} />
                </button>
              </div>
            ) : (
              <>
                <FiUploadCloud className="mx-auto text-4xl text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">คลิกหรือลากไฟล์มาวางที่นี่</p>
                <p className="text-xs text-slate-400 mt-1">PDF, Word, Excel, รูปภาพ — สูงสุด 50 MB</p>
              </>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">หมวดหมู่</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">คำอธิบาย (ไม่บังคับ)</label>
            <input value={description} onChange={(e) => setDesc(e.target.value)} placeholder="ระบุรายละเอียดไฟล์..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-sm bg-rose-50 dark:bg-rose-500/10 px-3 py-2 rounded-xl">
              <FiAlertCircle className="shrink-0" /> {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">ยกเลิก</button>
            <button type="submit" disabled={uploading} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {uploading ? <><FiLoader className="animate-spin" />กำลังอัปโหลด...</> : <><FiUploadCloud />อัปโหลด</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══ Main Component ═══
export default function Resources({ currentUser }) {
  const [files, setFiles]             = useState([]);
  const [categories, setCategories]   = useState([]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [search, setSearch]           = useState('');
  const [viewMode, setViewMode]       = useState('grid');
  const [loading, setLoading]         = useState(true);
  const [showUpload, setShowUpload]   = useState(false);
  const [deleting, setDeleting]       = useState(null);
  const [error, setError]             = useState('');

  const fetchFiles = useCallback(async () => {
    try {
      const res = await axios.get('/api/resources.php');
      if (res.data.success) {
        setFiles(res.data.data);
        setCategories(res.data.categories || []);
      }
    } catch (err) {
      setError('โหลดข้อมูลล้มเหลว');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleDelete = async (file) => {
    if (!window.confirm(`ต้องการลบ "${file.Name}" ใช่หรือไม่?`)) return;
    setDeleting(file.Id);
    try {
      await axios.delete(`/api/resources.php?id=${file.Id}`);
      setFiles(prev => prev.filter(f => f.Id !== file.Id));
    } catch (err) {
      alert(err.response?.data?.message || 'ลบไม่สำเร็จ');
    } finally {
      setDeleting(null);
    }
  };

  const handleUploadSuccess = (newFile) => {
    setFiles(prev => [newFile, ...prev]);
    if (newFile.Category && !categories.includes(newFile.Category)) {
      setCategories(prev => [...prev, newFile.Category].sort());
    }
  };

  const filtered = files.filter(f => {
    const matchCat = selectedCat === 'all' || f.Category === selectedCat;
    const matchSearch = !search || f.Name.toLowerCase().includes(search.toLowerCase()) ||
                        (f.Description || '').toLowerCase().includes(search.toLowerCase()) ||
                        (f.UploadedBy || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const catCounts = files.reduce((acc, f) => {
    acc[f.Category] = (acc[f.Category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="text-indigo-500"><FiFolder /></span>
          คลังข้อมูล
          <span className="text-sm font-normal text-slate-400 ml-1">({files.length} ไฟล์)</span>
        </h2>
        <button onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors active:scale-95">
          <FiUploadCloud /> อัปโหลดไฟล์
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาไฟล์..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
          <button onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
            <FiGrid size={16} />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
            <FiList size={16} />
          </button>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Sidebar categories */}
        <div className="w-44 shrink-0 flex flex-col gap-1">
          <button onClick={() => setSelectedCat('all')}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${selectedCat === 'all' ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <span className="flex items-center gap-2"><FiFolder size={14} />ทั้งหมด</span>
            <span className="text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{files.length}</span>
          </button>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setSelectedCat(cat)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${selectedCat === cat ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <span className="flex items-center gap-2"><FiTag size={13} />{cat}</span>
              {catCounts[cat] ? <span className="text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{catCounts[cat]}</span> : null}
            </button>
          ))}
        </div>

        {/* File area */}
        <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400">
              <FiLoader className="animate-spin mr-2" /> กำลังโหลด...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-40 text-rose-500 gap-2"><FiAlertCircle />{error}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
              <FiFolder size={40} className="opacity-30" />
              <div className="text-sm">{search ? 'ไม่พบไฟล์ที่ค้นหา' : 'ยังไม่มีไฟล์ในหมวดนี้'}</div>
              {!search && <button onClick={() => setShowUpload(true)} className="flex items-center gap-1.5 text-indigo-500 text-sm hover:text-indigo-600 font-medium"><FiPlus size={14} />อัปโหลดไฟล์แรก</button>}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(file => (
                <div key={file.Id} className={`group relative border rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md transition-all ${getFileAccentColor(file.MimeType)}`}>
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900/50 shadow-sm flex items-center justify-center text-xl">
                      {getFileIcon(file.MimeType)}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={`/${file.Url}`} download={file.Name} target="_blank" rel="noreferrer"
                        className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 text-emerald-600 hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-colors">
                        <FiDownload size={13} />
                      </a>
                      <button onClick={() => handleDelete(file)} disabled={deleting === file.Id}
                        className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 text-rose-500 hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-colors disabled:opacity-50">
                        {deleting === file.Id ? <FiLoader size={13} className="animate-spin" /> : <FiTrash2 size={13} />}
                      </button>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={file.Name}>{file.Name}</div>
                    {file.Description && <div className="text-[11px] text-slate-500 truncate mt-0.5">{file.Description}</div>}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-auto">
                    <span>{formatBytes(file.SizeBytes)}</span>
                    <span>{formatDate(file.CreatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // List view
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 font-bold">ชื่อไฟล์</th>
                    <th className="px-4 py-3 font-bold hidden md:table-cell">หมวดหมู่</th>
                    <th className="px-4 py-3 font-bold hidden md:table-cell">ขนาด</th>
                    <th className="px-4 py-3 font-bold hidden lg:table-cell">อัปโหลดโดย</th>
                    <th className="px-4 py-3 font-bold hidden lg:table-cell">วันที่</th>
                    <th className="px-4 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filtered.map(file => (
                    <tr key={file.Id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 group transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">{getFileIcon(file.MimeType)}</div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{file.Name}</div>
                            {file.Description && <div className="text-xs text-slate-400 truncate max-w-[180px]">{file.Description}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full font-medium">{file.Category}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{formatBytes(file.SizeBytes)}</td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{file.UploadedBy}</td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{formatDate(file.CreatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={`/${file.Url}`} download={file.Name} target="_blank" rel="noreferrer"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">
                            <FiDownload size={15} />
                          </a>
                          <button onClick={() => handleDelete(file)} disabled={deleting === file.Id}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors disabled:opacity-50">
                            {deleting === file.Id ? <FiLoader size={15} className="animate-spin" /> : <FiTrash2 size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={handleUploadSuccess} />}
    </div>
  );
}
