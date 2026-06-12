import React, { useState, useEffect } from 'react';
import UploadDocumentModal from './UploadDocumentModal';
import NewFolderModal from './NewFolderModal';
import MoveItemModal from './MoveItemModal';
import SecureDeleteModal from './SecureDeleteModal';
import ReviseDocumentModal from './ReviseDocumentModal';
import DocumentHistoryModal from './DocumentHistoryModal';

const DocumentManager = () => {
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Navigation State
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Home' }]);

  // Modals State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReviseModalOpen, setIsReviseModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchDeals();
  }, []);

  useEffect(() => {
    fetchData();
  }, [currentFolderId]);

  const fetchDeals = async () => {
    try {
      const res = await fetch('./api/crm/get_deals.php');
      const data = await res.json();
      if (data.status === 'success') setDeals(data.data);
    } catch (err) {
      console.warn("Could not load deals");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const folderParam = currentFolderId ? `?parentId=${currentFolderId}` : '';
      const docParam = currentFolderId ? `?folderId=${currentFolderId}` : '';

      const [docsRes, foldersRes] = await Promise.all([
        fetch(`./api/crm/get_documents.php${docParam}`),
        fetch(`./api/crm/get_folders.php${folderParam}`)
      ]);
      
      const docsData = await docsRes.json();
      const foldersData = await foldersRes.json();
      
      if (docsData.status === 'success') setDocuments(docsData.data);
      if (foldersData.status === 'success') setFolders(foldersData.data);
      
    } catch (err) {
      console.error(err);
      setError('Failed to load data. You might be in offline mode.');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index) => {
    const target = breadcrumbs[index];
    setCurrentFolderId(target.id);
    setBreadcrumbs(prev => prev.slice(0, index + 1));
  };

  const handleMoveClick = (item, type) => {
    setSelectedItem({ ...item, type });
    setIsMoveModalOpen(true);
  };

  const handleDeleteClick = (item, type) => {
    setSelectedItem({ ...item, type });
    setIsDeleteModalOpen(true);
  };

  const handleReviseClick = (doc) => {
    setSelectedItem(doc);
    setIsReviseModalOpen(true);
  };

  const handleHistoryClick = (doc) => {
    setSelectedItem(doc);
    setIsHistoryModalOpen(true);
  };

  const confirmSecureDelete = async (item, pin) => {
    const endpoint = item.type === 'folder' ? './api/crm/delete_folder.php' : './api/crm/delete_document.php';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, pin })
      });
      const result = await response.json();
      if (result.status === 'success') {
        setIsDeleteModalOpen(false);
        fetchData();
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred while deleting.');
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const filteredDocs = filterCategory === 'all' 
    ? documents 
    : documents.filter(d => d.category === filterCategory);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px' }}>
      {error && (
        <div style={{ width: '100%', padding: '12px 20px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px', border: '1px solid #fca5a5' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Header and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-color)', padding: '15px 20px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id || 'home'}>
              <span 
                onClick={() => handleBreadcrumbClick(idx)}
                style={{ 
                  cursor: 'pointer', 
                  color: idx === breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--primary-color)',
                  fontWeight: idx === breadcrumbs.length - 1 ? '600' : '400'
                }}
              >
                {crumb.name}
              </span>
              {idx < breadcrumbs.length - 1 && <span style={{ color: '#94a3b8' }}>/</span>}
            </React.Fragment>
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn" onClick={() => setIsNewFolderModalOpen(true)}>
            📁 + New Folder
          </button>
          <button className="btn btn-primary" onClick={() => setIsUploadModalOpen(true)}>
            📄 + Upload File
          </button>
        </div>
      </div>

      {/* Document and Folder List Section */}
      <div style={{ backgroundColor: 'var(--surface-color)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Contents</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Filter:</span>
            <select 
              value={filterCategory} 
              onChange={e => setFilterCategory(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid var(--border-color)', borderRadius: '6px' }}
            >
              <option value="all">All</option>
              <option value="general">General</option>
              <option value="contract">Contracts</option>
              <option value="quotation">Quotations</option>
              <option value="property">Properties</option>
              <option value="brochure">Brochures</option>
            </select>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Loading...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '10px', width: '35%' }}>Name</th>
                  <th style={{ padding: '10px', width: '15%' }}>Category</th>
                  <th style={{ padding: '10px', width: '20%' }}>Linked Deal</th>
                  <th style={{ padding: '10px', width: '10%' }}>Size</th>
                  <th style={{ padding: '10px', width: '10%' }}>Date</th>
                  <th style={{ padding: '10px', width: '10%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {folders.length === 0 && filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📁</div>
                      <div>This folder is empty</div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* Render Folders First */}
                    {folders.map(folder => (
                      <tr key={`folder-${folder.id}`} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', ':hover': {backgroundColor: '#f8fafc'} }}>
                        <td style={{ padding: '12px 10px', fontWeight: '500', cursor: 'pointer' }} onClick={() => handleFolderClick(folder)}>
                          <span style={{ color: '#F59E0B', marginRight: '8px', fontSize: '1.2rem' }}>📁</span>
                          {folder.name}
                        </td>
                        <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>-</td>
                        <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>-</td>
                        <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>-</td>
                        <td style={{ padding: '12px 10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {new Date(folder.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleMoveClick(folder, 'folder'); }}
                            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '1.2rem', marginRight: '10px' }}
                            title="Move folder"
                          >
                            ➡️
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(folder, 'folder'); }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }}
                            title="Delete folder"
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Render Documents */}
                    {filteredDocs.map(doc => (
                      <tr key={`doc-${doc.id}`} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', ':hover': {backgroundColor: '#f8fafc'} }}>
                        <td style={{ padding: '12px 10px', fontWeight: '500' }}>
                          <span style={{ color: 'var(--primary-color)', marginRight: '8px', fontSize: '1.2rem' }}>📄</span>
                          <a href={`./${doc.filePath}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>
                            {doc.fileName}
                          </a>
                          {doc.version > 1 && (
                            <span 
                              onClick={(e) => { e.stopPropagation(); handleHistoryClick(doc); }}
                              style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '12px', fontSize: '0.75rem', cursor: 'pointer', border: '1px solid #fde68a' }}
                              title="View Revision History"
                            >
                              v{doc.version}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ padding: '2px 8px', backgroundColor: '#e2e8f0', borderRadius: '4px', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            {doc.category}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          {doc.dealTitle ? (
                            <>
                              <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{doc.dealTitle}</div>
                              <div style={{ fontSize: '0.8rem' }}>{doc.clientName}</div>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {formatBytes(doc.fileSize)}
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleReviseClick(doc); }}
                            style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '1.2rem', marginRight: '10px' }}
                            title="Revise Document (Upload new version)"
                          >
                            🔄
                          </button>
                          <button 
                            onClick={() => handleMoveClick(doc, 'document')}
                            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '1.2rem', marginRight: '10px' }}
                            title="Move document"
                          >
                            ➡️
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(doc, 'document')}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }}
                            title="Delete document"
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <UploadDocumentModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        onUploadSuccess={fetchData}
        currentFolderId={currentFolderId}
        deals={deals}
      />

      <NewFolderModal 
        isOpen={isNewFolderModalOpen}
        onClose={() => setIsNewFolderModalOpen(false)}
        onFolderCreated={fetchData}
        currentFolderId={currentFolderId}
      />

      <MoveItemModal 
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onMoveSuccess={fetchData}
        itemToMove={selectedItem}
      />

      <SecureDeleteModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDeleteConfirm={confirmSecureDelete}
        itemToDelete={selectedItem}
      />

      <ReviseDocumentModal 
        isOpen={isReviseModalOpen}
        onClose={() => setIsReviseModalOpen(false)}
        onReviseSuccess={fetchData}
        documentToRevise={selectedItem}
      />

      <DocumentHistoryModal 
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        document={selectedItem}
      />
    </div>
  );
};

export default DocumentManager;
