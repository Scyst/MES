import React, { useState } from 'react';

const NewFolderModal = ({ isOpen, onClose, onFolderCreated, currentFolderId }) => {
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError('Folder name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('./api/crm/create_folder.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: folderName.trim(), 
          parentId: currentFolderId || 'null' 
        })
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        setFolderName('');
        onFolderCreated();
        onClose();
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div className="animate-fade-in" style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>New Folder</h2>
          <button onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>

        {error && <div style={{ color: '#ef4444', marginBottom: '15px', fontSize: '0.9rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={labelStyle}>Folder Name</label>
            <input 
              type="text" 
              value={folderName} 
              onChange={e => setFolderName(e.target.value)} 
              style={inputStyle}
              placeholder="e.g. Contracts, Invoices..."
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn" style={{ backgroundColor: '#f1f5f9', color: '#475569' }} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!folderName.trim() || loading}>
              {loading ? 'Creating...' : 'Create Folder'}
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
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 1000
};

const modalStyle = {
  backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '400px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
};

const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' };
const inputStyle = { width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.95rem', boxSizing: 'border-box' };
const closeBtnStyle = { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' };

export default NewFolderModal;
