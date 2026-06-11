import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import DealDetailsModal from './DealDetailsModal';

const KanbanBoard = ({ refreshTrigger, onDealUpdated }) => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for Deal Details Modal
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const response = await fetch('./api/crm/get_deals.php');
        if (!response.ok) throw new Error('Failed to fetch data');
        const result = await response.json();
        if (result.status === 'success') {
          // Sort deals by orderIndex locally just in case, though PHP should do it
          const sortedDeals = result.data.sort((a, b) => a.orderIndex - b.orderIndex);
          setDeals(sortedDeals);
        } else {
          throw new Error(result.message);
        }
      } catch (err) {
        console.warn(err);
        setError('Connected to fallback offline mode');
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, [refreshTrigger]);

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Clone deals
    const newDeals = Array.from(deals);
    
    // Find the item index in the main array
    const sourceItemIndex = newDeals.findIndex(d => d.id.toString() === draggableId);
    if (sourceItemIndex === -1) return;

    const [draggedItem] = newDeals.splice(sourceItemIndex, 1);
    
    // Update status if needed
    draggedItem.status = destination.droppableId;

    // We need to insert it at the correct index relative to the main newDeals array.
    // Let's find all items in the destination column
    const destItems = newDeals.filter(d => d.status === destination.droppableId);
    
    // Find the exact insertion point in the main array
    let insertIndex = newDeals.length; // default to end
    if (destination.index < destItems.length) {
      const itemAtDestIndex = destItems[destination.index];
      insertIndex = newDeals.findIndex(d => d.id === itemAtDestIndex.id);
    } else if (destItems.length > 0) {
      const lastItemInDest = destItems[destItems.length - 1];
      insertIndex = newDeals.findIndex(d => d.id === lastItemInDest.id) + 1;
    } else {
      insertIndex = newDeals.length; // Empty column, just push to the end
    }

    newDeals.splice(insertIndex, 0, draggedItem);

    // Recalculate orderIndex for ALL items in affected columns
    const columnsToUpdate = source.droppableId === destination.droppableId 
      ? [source.droppableId] 
      : [source.droppableId, destination.droppableId];

    let itemsToUpdate = [];
    columnsToUpdate.forEach(colId => {
      const itemsInCol = newDeals.filter(d => d.status === colId);
      itemsInCol.forEach((item, idx) => {
        item.orderIndex = idx;
        itemsToUpdate.push({ id: item.id, status: item.status, orderIndex: idx });
      });
    });

    // Optimistically set UI immediately
    setDeals(newDeals);

    // Send batch update asynchronously without awaiting in the main thread to prevent lag
    fetch('./api/crm/update_order.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: itemsToUpdate })
    }).then(res => res.json())
      .then(resData => {
        if (resData.status !== 'success') setError(resData.message);
      })
      .catch(err => {
        console.error('Failed to update order:', err);
        setError('Failed to save arrangement to database');
      });
  };

  const getColumnTasks = (status) => deals.filter(d => d.status === status);

  const columns = [
    { id: 'lead', title: 'Leads', className: 'col-lead', tasks: getColumnTasks('lead') },
    { id: 'viewing', title: 'Viewing', className: 'col-viewing', tasks: getColumnTasks('viewing') },
    { id: 'negotiation', title: 'Negotiation', className: 'col-negotiation', tasks: getColumnTasks('negotiation') },
    { id: 'transfer', title: 'Transfer', className: 'col-transfer', tasks: getColumnTasks('transfer') },
    { id: 'post_sale', title: 'Post-Sale', className: 'col-post', tasks: getColumnTasks('post_sale') }
  ];

  const getPriorityClass = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'high': return 'tag-high';
      case 'medium': return 'tag-medium';
      case 'low': return 'tag-low';
      default: return 'tag-low';
    }
  };

  if (loading) return <div style={{padding: 20}}>Loading Deals from Database...</div>;

  return (
    <div className="kanban-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {error && (
        <div style={{ width: '100%', padding: '12px 20px', backgroundColor: '#fef2f2', color: '#ef4444', marginBottom: '20px', borderRadius: '8px', border: '1px solid #fca5a5', fontWeight: '500' }}>
          ⚠️ {error}
          <div style={{ fontSize: '0.8rem', marginTop: '4px', color: '#b91c1c' }}>
            Note: The PHP API cannot run on the Vite dev server or file:// protocol. Please upload the 'dist' folder to your server to test.
          </div>
        </div>
      )}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-board">
          {columns.map(col => (
            <div key={col.id} className="kanban-column">
              <div className={`column-header ${col.className}`}>
                <span>{col.title}</span>
                <span className="task-count">{col.tasks.length}</span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div 
                    className="column-body"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{ 
                      minHeight: '200px',
                      backgroundColor: snapshot.isDraggingOver ? 'rgba(0,0,0,0.02)' : 'transparent',
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    {col.tasks.length === 0 && !snapshot.isDraggingOver && (
                      <div style={{color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0'}}>No deals</div>
                    )}
                    {col.tasks.map((task, index) => (
                      <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            className="task-card"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{ 
                              ...provided.draggableProps.style,
                              boxShadow: snapshot.isDragging ? '0 10px 20px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.05)'
                            }}
                          >
                            <div className="task-header">
                              <h4 className="task-title">{task.title}</h4>
                            </div>
                            <div className="task-client">
                              🏢 {task.clientName}
                            </div>
                            {task.value > 0 && (
                              <div style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: '500', marginTop: '5px' }}>
                                💰 ฿{parseFloat(task.value).toLocaleString()}
                              </div>
                            )}
                            <div className="task-tags">
                              <span className={`tag ${getPriorityClass(task.priority)}`}>
                                {(task.priority || 'low').toUpperCase()}
                              </span>
                            </div>
                            <div className="task-footer">
                              <div className="assignee">
                                {task.taskCount > 0 ? `${task.taskCount} Tasks` : 'No tasks'}
                              </div>
                              <button 
                                className="btn" 
                                style={{ fontSize: '0.75rem', padding: '4px 8px', backgroundColor: '#F1F5F9' }}
                                onClick={() => {
                                  setSelectedDeal(task);
                                  setIsDetailsModalOpen(true);
                                }}
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <DealDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        deal={selectedDeal}
        onDealUpdated={onDealUpdated}
      />
    </div>
  );
};

export default KanbanBoard;
