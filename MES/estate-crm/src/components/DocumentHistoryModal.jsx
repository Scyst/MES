import React, { useState, useEffect } from 'react';

const DocumentHistoryModal = ({ isOpen, onClose, document }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && document) {
      fetchVersions();
    }
  }, [isOpen, document]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`./api/crm/get_document_versions.php?documentId=${document.id}`);
      const data = await res.json();
      if (data.status === 'success') {
        setVersions(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  if (!isOpen || !document) return null;

  return (
    <div style={overlayStyle}>
      <div className="animate-fade-in" style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Revision History</h2>
          <button onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <strong>{document.fileName}</strong>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading history...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Latest Version (Current Document) */}
              <div style={{ ...versionCardStyle, borderLeft: '4px solid #10b981', backgroundColor: '#f0fdf4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontWeight: 'bold', color: '#10b981' }}>Version {document.version || 1} (Latest)</span>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {new Date(document.uploadedAt).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{formatBytes(document.fileSize)}</span>
                  <a href={`./${document.filePath}`} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '500' }}>
                    View File
                  </a>
                </div>
              </div>

              {/* Older Versions */}
              {versions.map(v => (
                <div key={v.id} style={versionCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Version {v.version}</span>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      {new Date(v.uploadedAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{v.fileName} • {formatBytes(v.fileSize)}</span>
                    <a href={`./${v.filePath}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>
                      View File
                    </a>
                  </div>
                </div>
              ))}

              {versions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.9rem' }}>
                  No previous versions found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Styles
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};
const modalStyle = {
  backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '500px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
};
const closeBtnStyle = { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' };
const versionCardStyle = {
  border: '1px solid var(--border-color)', borderRadius: '8px', padding: '15px', backgroundColor: '#f8fafc'
};

export default DocumentHistoryModal;
