import React, { useState } from 'react';

const SecureDeleteModal = ({ isOpen, onClose, onDeleteConfirm, itemToDelete }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !itemToDelete) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin) return;

    setLoading(true);
    await onDeleteConfirm(itemToDelete, pin);
    setLoading(false);
    setPin('');
  };

  return (
    <div style={overlayStyle}>
      <div className="animate-fade-in" style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#ef4444' }}>⚠️ Secure Delete</h2>
          <button onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>

        <div style={{ marginBottom: '15px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          You are about to permanently delete:<br/>
          <strong style={{ color: 'var(--text-primary)' }}>{itemToDelete.name}</strong>
        </div>

        <div style={{ backgroundColor: '#fff7ed', padding: '12px', borderRadius: '6px', border: '1px solid #fed7aa', marginBottom: '20px', fontSize: '0.9rem', color: '#9a3412' }}>
          This action cannot be undone. Please enter your Security PIN to confirm deletion.
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={labelStyle}>Security PIN</label>
            <input 
              type="password" 
              value={pin} 
              onChange={e => setPin(e.target.value)} 
              style={inputStyle}
              placeholder="Enter PIN"
              autoFocus
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn" style={{ backgroundColor: '#f1f5f9', color: '#475569' }} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn" style={{ backgroundColor: '#ef4444', color: 'white' }} disabled={!pin || loading}>
              {loading ? 'Deleting...' : 'Confirm Delete'}
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
  backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '400px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
};
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' };
const inputStyle = { width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.95rem', boxSizing: 'border-box', letterSpacing: '0.2rem', textAlign: 'center' };
const closeBtnStyle = { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' };

export default SecureDeleteModal;
