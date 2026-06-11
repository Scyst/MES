import React, { useState, useEffect } from 'react';

const DealDetailsModal = ({ isOpen, onClose, deal, onDealUpdated }) => {
  const [formData, setFormData] = useState({
    title: '',
    clientName: '',
    value: '',
    priority: 'low'
  });
  
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Initialize form data when deal changes or modal opens
  useEffect(() => {
    if (deal && isOpen) {
      setFormData({
        title: deal.title || '',
        clientName: deal.clientName || '',
        value: deal.value || '',
        priority: deal.priority || 'low'
      });
      setError('');
      fetchTasks();
    }
  }, [deal, isOpen]);

  const fetchTasks = async () => {
    if (!deal) return;
    setLoadingTasks(true);
    try {
      const response = await fetch(`./api/crm/get_tasks.php?dealId=${deal.id}`);
      const result = await response.json();
      if (result.status === 'success') {
        setTasks(result.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTasks(false);
    }
  };

  if (!isOpen || !deal) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('./api/crm/update_deal.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deal.id, ...formData })
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        onDealUpdated();
        onClose();
      } else {
        throw new Error(result.message || 'Failed to update deal');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this deal? This action cannot be undone.')) return;
    
    setDeleting(true);
    setError('');

    try {
      const response = await fetch('./api/crm/delete_deal.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deal.id })
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        onDealUpdated();
        onClose();
      } else {
        throw new Error(result.message || 'Failed to delete deal');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Sub-tasks functions
  const handleAddTask = async (e) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      e.preventDefault();
      try {
        const response = await fetch('./api/crm/create_task.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dealId: deal.id, title: newTaskTitle.trim() })
        });
        const result = await response.json();
        if (result.status === 'success') {
          setNewTaskTitle('');
          fetchTasks();
          onDealUpdated(); // To update the task count on the board
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleTask = async (task) => {
    try {
      const response = await fetch('./api/crm/toggle_task.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, isCompleted: !task.isCompleted })
      });
      const result = await response.json();
      if (result.status === 'success') {
        fetchTasks();
        onDealUpdated(); // Refresh board count
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const response = await fetch('./api/crm/delete_task.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId })
      });
      const result = await response.json();
      if (result.status === 'success') {
        fetchTasks();
        onDealUpdated(); // Refresh board count
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" style={overlayStyle}>
      <div className="modal-content animate-fade-in" style={{...modalStyle, display: 'flex', maxWidth: '800px'}}>
        
        {/* LEFT PANEL - Form */}
        <div style={{ flex: 1, paddingRight: '20px', borderRight: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Deal Details</h2>
          </div>
          
          {error && <div style={{ color: 'red', marginBottom: '15px', fontSize: '0.9rem' }}>{error}</div>}
          
          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={labelStyle}>Deal Title</label>
              <input 
                type="text" 
                name="title" 
                value={formData.title} 
                onChange={handleChange} 
                required 
                style={inputStyle}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <button 
                type="button" 
                onClick={handleDelete} 
                className="btn" 
                style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}
                disabled={loading || deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Deal'}
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" disabled={loading || deleting}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* RIGHT PANEL - Subtasks */}
        <div style={{ flex: 1, paddingLeft: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Checklist / Sub-tasks</h3>
            <button onClick={onClose} style={closeBtnStyle}>&times;</button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px' }}>
            {loadingTasks ? (
              <div style={{ color: 'var(--text-secondary)' }}>Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No sub-tasks yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tasks.map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
                      <input 
                        type="checkbox" 
                        checked={task.isCompleted == 1} 
                        onChange={() => handleToggleTask(task)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ 
                        textDecoration: task.isCompleted == 1 ? 'line-through' : 'none',
                        color: task.isCompleted == 1 ? '#94a3b8' : 'var(--text-primary)',
                        fontSize: '0.95rem'
                      }}>
                        {task.title}
                      </span>
                    </label>
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}
                      title="Delete task"
                    >&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <input 
              type="text" 
              placeholder="Type new task and press Enter..." 
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleAddTask}
              style={{...inputStyle, backgroundColor: '#f1f5f9'}}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

// Inline styles
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
  color: 'var(--text-secondary)',
  marginTop: '-10px',
  marginRight: '-10px'
};

export default DealDetailsModal;
