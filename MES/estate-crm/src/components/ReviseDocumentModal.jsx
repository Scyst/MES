import React, { useState, useRef } from 'react';

const ReviseDocumentModal = ({ isOpen, onClose, onReviseSuccess, documentToRevise }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);

  if (!isOpen || !documentToRevise) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a new file version.');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('documentId', documentToRevise.id);

    try {
      const response = await fetch('./api/crm/revise_document.php', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        setSelectedFile(null);
        onReviseSuccess();
        onClose();
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div className="animate-fade-in" style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Revise Document</h2>
          <button onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>

        <div style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>
          Uploading new version for:<br/>
          <strong style={{ color: 'var(--text-primary)' }}>{documentToRevise.fileName}</strong> (Currently v{documentToRevise.version || 1})
        </div>

        {error && <div style={{ color: '#ef4444', marginBottom: '15px', fontSize: '0.9rem', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '6px' }}>{error}</div>}

        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={labelStyle}>Select New File Version</label>
            <input 
              type="file" 
              onChange={handleFileChange} 
              ref={fileInputRef}
              style={{ width: '100%', padding: '10px', border: '1px dashed var(--border-color)', borderRadius: '6px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn" style={{ backgroundColor: '#f1f5f9', color: '#475569' }} disabled={uploading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!selectedFile || uploading}>
              {uploading ? 'Uploading...' : `Upload v${(documentToRevise.version || 1) + 1}`}
            </button>
          </div>
        </form>
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
  backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '450px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
};
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' };
const closeBtnStyle = { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' };

export default ReviseDocumentModal;
