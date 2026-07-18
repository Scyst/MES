import React, { useState, useEffect } from 'react';

const MoveItemModal = ({ isOpen, onClose, onMoveSuccess, itemToMove }) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  
  // A simple flat list of all folders is fine for prototype.
  // In a massive system, we'd want a tree view, but flat is easier.
  useEffect(() => {
    if (isOpen) {
      fetchAllFolders();
    }
  }, [isOpen]);

  const fetchAllFolders = async () => {
    setFetching(true);
    try {
      // Get ALL folders (modify api later if needed, but right now we only fetch by parentId)
      // To get all folders, we need an endpoint, but since our current get_folders requires parentId, 
      // let's fetch ALL by calling get_folders.php without parentId if we change the API, 
      // or we can make a custom fetch. Wait, our `get_folders.php` currently filters by parentId if provided.
      // If we don't provide parentId, it only returns root folders. We need ALL folders to build a dropdown.
      // Let's call a new endpoint or pass `all=true` to get_folders.php.
      // Actually, I will modify get_folders.php to support `all=true`.
      // For now let's just assume we can fetch them.
      const res = await fetch('./api/crm/get_folders.php?all=true');
      const data = await res.json();
      if (data.status === 'success') {
        // Filter out the item being moved (if it's a folder) to prevent moving it into itself
        const validFolders = itemToMove.type === 'folder' 
          ? data.data.filter(f => f.id !== itemToMove.id)
          : data.data;
        setFolders(validFolders);
      }
    } catch (err) {
      console.warn("Failed to load folders for moving");
    } finally {
      setFetching(false);
    }
  };

  const handleMove = async (targetFolderId) => {
    setLoading(true);
    setError('');

    const endpoint = itemToMove.type === 'folder' ? './api/crm/move_folder.php' : './api/crm/move_document.php';
    const payload = itemToMove.type === 'folder' 
      ? { id: itemToMove.id, parentId: targetFolderId }
      : { id: itemToMove.id, folderId: targetFolderId };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        onMoveSuccess();
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

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div className="animate-fade-in" style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Move {itemToMove.type === 'folder' ? 'Folder' : 'File'}</h2>
          <button onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>

        {error && <div style={{ color: '#ef4444', marginBottom: '15px', fontSize: '0.9rem', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '6px' }}>{error}</div>}

        <div style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>
          Moving: <strong>{itemToMove.name}</strong>
        </div>

        <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto', padding: '10px' }}>
          {fetching ? (
            <div style={{ padding: '10px', color: '#94a3b8' }}>Loading folders...</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li 
                style={folderListItemStyle} 
                onClick={() => handleMove('null')}
              >
                🏠 Root Directory (Main View)
              </li>
              {folders.map(folder => (
                <li 
                  key={folder.id} 
                  style={folderListItemStyle}
                  onClick={() => handleMove(folder.id)}
                >
                  📁 {folder.name}
                </li>
              ))}
              {folders.length === 0 && <div style={{ padding: '10px', color: '#94a3b8' }}>No other folders available.</div>}
            </ul>
          )}
        </div>

        {loading && <div style={{ marginTop: '10px', color: 'var(--primary-color)' }}>Moving item...</div>}

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
  backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '400px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
};
const closeBtnStyle = { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' };
const folderListItemStyle = { padding: '10px 15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s', borderRadius: '6px' };

export default MoveItemModal;
