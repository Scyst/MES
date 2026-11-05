import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FolderOpen, Search, Upload, FolderPlus, Trash2,
  RefreshCw, CheckCircle2, AlertCircle, X
} from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { documentCenterApi } from '../../../shared/services/documentCenterApi';
import BreadcrumbBar from '../components/BreadcrumbBar';
import DocumentTable from '../components/DocumentTable';
import UploadModal from '../components/UploadModal';
import NewFolderModal from '../components/NewFolderModal';
import RenameModal from '../components/RenameModal';
import MoveModal from '../components/MoveModal';
import ReviseModal from '../components/ReviseModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import DocumentPreviewModal from '../components/DocumentPreviewModal';

export default function DocumentCenterPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFolderPath = searchParams.get('folder') || '';

  // Permissions: admin, creator, qc, supervisor, or permission code manage_documents
  const canManage = Boolean(
    user?.role === 'admin' ||
    user?.role === 'creator' ||
    user?.role === 'qc' ||
    user?.role === 'supervisor' ||
    user?.permissions?.includes('manage_documents')
  );

  // Core Data States
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [folderTree, setFolderTree] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 30,
  });

  // Selection state for batch operations
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modal Visibility States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState({ isOpen: false, item: null });
  const [moveTarget, setMoveTarget] = useState({ isOpen: false, item: null });
  const [reviseTarget, setReviseTarget] = useState({ isOpen: false, item: null });
  const [deleteTarget, setDeleteTarget] = useState({ isOpen: false, items: [] });
  const [previewDoc, setPreviewDoc] = useState({ isOpen: false, doc: null });

  // Toast / Status Message
  const [toast, setToast] = useState(null);
  const searchDebounceRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Documents
  const loadDocuments = useCallback(async (page = 1, search = '', path = '') => {
    try {
      setLoading(true);
      const res = await documentCenterApi.getDocuments(page, 30, search, path);
      if (res.success) {
        setItems(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        showToast(res.message || 'ไม่สามารถโหลดข้อมูลเอกสารได้', 'error');
      }
    } catch (err) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการโหลดเอกสาร', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Folder Tree for dropdowns
  const loadFolderTree = useCallback(async () => {
    try {
      const res = await documentCenterApi.getFolderTree();
      if (res.success && Array.isArray(res.data)) {
        setFolderTree(res.data);
      }
    } catch (err) {
      console.warn('Could not load folder tree:', err);
    }
  }, []);

  // Initial Load of Folder Tree
  useEffect(() => {
    loadFolderTree();
  }, [loadFolderTree]);

  // Load documents whenever currentFolderPath in URL changes
  useEffect(() => {
    setSelectedIds(new Set());
    loadDocuments(1, searchTerm, currentFolderPath);
  }, [currentFolderPath, loadDocuments]);

  // Handle Search input change with 350ms debounce
  const handleSearchChange = (val) => {
    setSearchTerm(val);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setSelectedIds(new Set());
      loadDocuments(1, val, currentFolderPath);
    }, 350);
  };

  // Navigate into / out of folders (sync with URL Search Params for browser back/forward)
  const handleNavigateFolder = (newPath) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPath) {
        next.set('folder', newPath);
      } else {
        next.delete('folder');
      }
      return next;
    });
    setSearchTerm('');
    setSelectedIds(new Set());
  };

  // Page change
  const handlePageChange = (newPage) => {
    setSelectedIds(new Set());
    loadDocuments(newPage, searchTerm, currentFolderPath);
  };

  // Refresh current view
  const handleRefresh = () => {
    setSelectedIds(new Set());
    loadDocuments(pagination.currentPage, searchTerm, currentFolderPath);
    loadFolderTree();
  };

  // Selection handlers
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = items.map((it) => it.id).filter(Boolean);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Trigger batch delete
  const handleBatchDeleteClick = () => {
    const selectedItems = items.filter((it) => it.id && selectedIds.has(it.id));
    if (selectedItems.length > 0) {
      setDeleteTarget({ isOpen: true, items: selectedItems });
    }
  };

  return (
    <div className="mes-page-container flex flex-col h-full gap-3 overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200 border ${
            toast.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/90 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
              : 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Header section (Uses standard .mes-page-header tokens) */}
      <div className="mes-page-header mb-0">
        <div>
          <h1 className="mes-page-title">
            <FolderOpen className="text-blue-600 w-6 h-6" /> Document Center
            <span className="mes-badge bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              ⚡ SPA Ported
            </span>
          </h1>
          <p className="mes-page-subtitle">
            ศูนย์กลางจัดเก็บและจัดการเอกสารโรงงาน (WI, SOP, Drawing, 3D CAD Models) พร้อมระบบลายน้ำความปลอดภัย DLP
          </p>
        </div>

        {/* Action Buttons (Uses standard .mes-btn tokens) */}
        <div className="flex items-center gap-2 flex-wrap">
          {canManage && selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleBatchDeleteClick}
              className="mes-btn-danger"
            >
              <Trash2 size={14} />
              <span>ลบที่เลือก ({selectedIds.size})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            title="รีเฟรชข้อมูล"
            className="mes-btn-icon cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setIsNewFolderOpen(true)}
                className="mes-btn-secondary cursor-pointer"
              >
                <FolderPlus size={14} className="text-amber-500" />
                <span>+ โฟลเดอร์ใหม่</span>
              </button>

              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="mes-btn-primary cursor-pointer"
              >
                <Upload size={14} />
                <span>+ อัปโหลดเอกสาร</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Unified Toolbar (Uses standard .mes-filter-bar tokens) */}
      <div className="mes-filter-bar">
        <BreadcrumbBar
          currentFolderPath={currentFolderPath}
          onNavigate={handleNavigateFolder}
        />

        {/* Global Search Input */}
        <div className="relative w-full lg:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="ค้นหาชื่อไฟล์, คำอธิบาย, ผู้อัปโหลด..."
            className="mes-input pl-8 pr-7"
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          {searchTerm && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Document Table */}
      <DocumentTable
        items={items}
        loading={loading}
        canManage={canManage}
        currentFolderPath={currentFolderPath}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onNavigateFolder={handleNavigateFolder}
        onPreview={(doc) => setPreviewDoc({ isOpen: true, doc })}
        onDownload={(doc) => {
          window.location.href = documentCenterApi.getViewUrl(doc.id, true);
        }}
        onRename={(item) => setRenameTarget({ isOpen: true, item })}
        onMove={(item) => setMoveTarget({ isOpen: true, item })}
        onRevise={(item) => setReviseTarget({ isOpen: true, item })}
        onDelete={(item) => setDeleteTarget({ isOpen: true, items: [item] })}
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        currentFolderPath={currentFolderPath}
        folderTree={folderTree}
        onSuccess={(msg) => {
          showToast(msg, 'success');
          handleRefresh();
        }}
      />

      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        currentFolderPath={currentFolderPath}
        onSuccess={(msg) => {
          showToast(msg, 'success');
          handleRefresh();
        }}
      />

      <RenameModal
        item={renameTarget.item}
        isOpen={renameTarget.isOpen}
        onClose={() => setRenameTarget({ isOpen: false, item: null })}
        onSuccess={(msg) => {
          showToast(msg, 'success');
          handleRefresh();
        }}
      />

      <MoveModal
        item={moveTarget.item}
        isOpen={moveTarget.isOpen}
        folderTree={folderTree}
        onClose={() => setMoveTarget({ isOpen: false, item: null })}
        onSuccess={(msg) => {
          showToast(msg, 'success');
          handleRefresh();
        }}
      />

      <ReviseModal
        item={reviseTarget.item}
        isOpen={reviseTarget.isOpen}
        onClose={() => setReviseTarget({ isOpen: false, item: null })}
        onSuccess={(msg) => {
          showToast(msg, 'success');
          handleRefresh();
        }}
      />

      <DeleteConfirmModal
        items={deleteTarget.items}
        isOpen={deleteTarget.isOpen}
        onClose={() => setDeleteTarget({ isOpen: false, items: [] })}
        onSuccess={(msg) => {
          showToast(msg, 'success');
          handleRefresh();
        }}
      />

      <DocumentPreviewModal
        doc={previewDoc.doc}
        isOpen={previewDoc.isOpen}
        onClose={() => setPreviewDoc({ isOpen: false, doc: null })}
      />
    </div>
  );
}
