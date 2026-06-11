import React, { useState } from 'react';

const NewDealModal = ({ isOpen, onClose, onDealCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    clientName: '',
    value: '',
    priority: 'low'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('./api/crm/create_deal.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        onDealCreated(); // Trigger refresh
        onClose(); // Close modal
        setFormData({ title: '', clientName: '', priority: 'low' }); // Reset form
      } else {
        throw new Error(result.message || 'Failed to create deal');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={overlayStyle}>
      <div className="modal-content animate-fade-in" style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Create New Deal</h2>
          <button onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>
        
        {error && <div style={{ color: 'red', marginBottom: '15px', fontSize: '0.9rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={labelStyle}>Deal Title</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              required 
              style={inputStyle}
              placeholder="e.g. Initial Site Visit - Zone A"
            />
          </div>
          <div>
            <label style={labelStyle}>Client Name</label>
            <input 
              type="text" 
              name="clientName" 
              value={formData.clientName} 
              onChange={handleChange} 
              required 
              style={inputStyle}
              placeholder="e.g. Toyota Tsusho"
            />
          </div>
          <div>
            <label style={labelStyle}>Deal Value (฿)</label>
            <input 
              type="number" 
              name="value" 
              value={formData.value} 
              onChange={handleChange} 
              style={inputStyle}
              placeholder="0.00"
              min="0"
              step="1000"
            />
          </div>
          <div>
            <label style={labelStyle}>Priority</label>
            <select 
              name="priority" 
              value={formData.priority} 
              onChange={handleChange} 
              style={inputStyle}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn" style={{ backgroundColor: '#e2e8f0', color: '#475569' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Inline styles for simplicity in demo
const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000
};

const modalStyle = {
  backgroundColor: 'white',
  padding: '30px',
  borderRadius: '12px',
  width: '100%',
  maxWidth: '500px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
};

const labelStyle = {
  display: 'block',
  marginBottom: '5px',
  fontSize: '0.9rem',
  fontWeight: '500',
  color: 'var(--text-secondary)'
};

const inputStyle = {
  width: '100%',
  padding: '10px',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  fontSize: '1rem',
  boxSizing: 'border-box'
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  fontSize: '1.5rem',
  cursor: 'pointer',
  color: 'var(--text-secondary)'
};

export default NewDealModal;
