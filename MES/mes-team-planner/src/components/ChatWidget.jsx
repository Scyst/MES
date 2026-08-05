import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { FiMessageSquare, FiX, FiChevronLeft, FiSend, FiPaperclip, FiBriefcase, FiUser, FiUsers, FiPlus, FiSearch } from 'react-icons/fi';
import AddTaskModal from './AddTaskModal';

export default function ChatWidget({ currentUser, tasks, onSaveTask, onDeleteTask, users = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const [isCreatingPrivate, setIsCreatingPrivate] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTaskForModal, setSelectedTaskForModal] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const handleOpenChat = async (e) => {
      const { type, referenceId } = e.detail;
      setIsOpen(true);
      if (type === 'task') {
        try {
          const res = await axios.get(`/api/chat.php?action=get_or_create_room&type=task&referenceId=${referenceId}`);
          if (res.data && res.data.Id) {
            handleOpenRoom(res.data);
          }
        } catch (err) {
          console.error('Failed to open task chat:', err);
        }
      }
    };
    window.addEventListener('open-chat-room', handleOpenChat);
    return () => window.removeEventListener('open-chat-room', handleOpenChat);
  }, []);

  // Poll for rooms/messages
  useEffect(() => {
    if (!isOpen || !currentUser) return;
    
    fetchRooms();
    const interval = setInterval(() => {
      fetchRooms();
      if (activeRoom) {
        fetchMessages(activeRoom.Id, false);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen, currentUser, activeRoom]);

  const fetchRooms = async () => {
    try {
      const res = await axios.get('/api/chat.php?action=rooms');
      if (res.data && Array.isArray(res.data)) {
        setRooms(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  };

  const fetchMessages = async (roomId, scrollToBottom = true) => {
    try {
      const res = await axios.get(`/api/chat.php?action=messages&roomId=${roomId}`);
      if (res.data && Array.isArray(res.data)) {
        setMessages(res.data);
        if (scrollToBottom) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const handleOpenRoom = (room) => {
    setActiveRoom(room);
    setMessages([]);
    fetchMessages(room.Id, true);
  };

  const handleBackToInbox = () => {
    setActiveRoom(null);
    setMessages([]);
    setIsCreatingPrivate(false);
    setSearchTerm('');
    setAttachments([]);
  };

  const handleStartPrivateChat = async (targetUser) => {
    try {
      const res = await axios.post('/api/chat.php?action=create_room', {
        type: 'private',
        targetUser: targetUser
      });
      if (res.data && res.data.roomId) {
        setIsCreatingPrivate(false);
        fetchRooms().then(() => {
          // Open the new room
          const newRoom = { Id: res.data.roomId, Type: 'private', DisplayName: targetUser };
          handleOpenRoom(newRoom);
        });
      }
    } catch (err) {
      console.error('Failed to start private chat:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || !activeRoom) return;

    setIsSending(true);
    try {
      await axios.post('/api/chat.php?action=send', {
        roomId: activeRoom.Id,
        message: inputText,
        attachments: attachments
      });
      setInputText('');
      setAttachments([]);
      fetchMessages(activeRoom.Id, true);
      fetchRooms();
    } catch (err) {
      console.error('Send failed:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleUploadAttachment = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('ขนาดไฟล์เกิน 50MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setIsUploading(true);

    try {
      const res = await axios.post('/api/upload_chat_attachment.php', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data && res.data.url) {
        setAttachments(prev => [...prev, res.data]);
      }
    } catch (err) {
      console.error(err);
      alert('อัปโหลดไฟล์ไม่สำเร็จ');
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const handleRemoveAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleOpenTask = () => {
    if (activeRoom && activeRoom.Type === 'task' && activeRoom.ReferenceId) {
      const taskObj = tasks.find(t => String(t.Id) === String(activeRoom.ReferenceId));
      if (taskObj) {
        setSelectedTaskForModal(taskObj);
      } else {
        alert("ไม่พบข้อมูลงาน (อาจถูกลบไปแล้ว)");
      }
    }
  };

  if (!currentUser) return null;

  return (
    <>
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[60] flex flex-col items-end">
        {isOpen ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-80 md:w-96 overflow-hidden animate-slide-up flex flex-col h-[500px] max-h-[75vh]">
            
            {/* Header */}
            <div className="bg-indigo-600 dark:bg-indigo-700 text-white p-3.5 flex justify-between items-center shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-2">
                {activeRoom ? (
                  <button onClick={handleBackToInbox} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                    <FiChevronLeft className="text-xl" />
                  </button>
                ) : (
                  <FiMessageSquare className="text-lg ml-1" />
                )}
                <h3 className="font-bold line-clamp-1 max-w-[200px]">
                  {activeRoom ? activeRoom.DisplayName : 'แชท & การแจ้งเตือน'}
                </h3>
              </div>
              
              <div className="flex items-center gap-1">
                {!activeRoom && !isCreatingPrivate && (
                  <button onClick={() => setIsCreatingPrivate(true)} title="แชทส่วนตัวใหม่" className="hover:bg-white/20 p-1.5 rounded-lg transition-colors text-indigo-100 hover:text-white">
                    <FiPlus className="text-lg" />
                  </button>
                )}
                {activeRoom && activeRoom.Type === 'task' && (
                  <button onClick={handleOpenTask} title="เปิดรายละเอียดงาน" className="hover:bg-white/20 p-1.5 rounded-lg transition-colors text-indigo-100 hover:text-white">
                    <FiBriefcase className="text-lg" />
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                  <FiX className="text-lg" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-900">
              {isCreatingPrivate ? (
                // NEW PRIVATE CHAT VIEW
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="ค้นหาชื่อพนักงาน..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
                    {users.filter(u => u.username !== currentUser.username && (u.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase()))).map(u => (
                      <div 
                        key={u.id}
                        onClick={() => handleStartPrivateChat(u.username)}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl cursor-pointer border border-slate-200/60 dark:border-slate-700/60 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 font-bold">
                          {(u.fullname || u.username).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{u.fullname || u.username}</p>
                          {u.roles && <p className="text-[11px] text-slate-500 truncate">{u.roles}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    <button 
                      onClick={() => { setIsCreatingPrivate(false); setSearchTerm(''); }}
                      className="w-full p-2 text-sm text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : !activeRoom ? (
                // INBOX VIEW
                <div className="overflow-y-auto custom-scrollbar flex-1 p-2">
                  {rooms.length > 0 ? (
                    <div className="space-y-1.5">
                      {rooms.map(room => (
                        <div 
                          key={room.Id} 
                          onClick={() => handleOpenRoom(room)}
                          className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl cursor-pointer border border-slate-200/60 dark:border-slate-700/60 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                            {room.Type === 'task' ? <FiBriefcase /> : room.Type === 'private' ? <FiUser /> : <FiUsers />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{room.DisplayName}</p>
                              {room.LastMessageTime && (
                                <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                                  {new Date(room.LastMessageTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">
                              {room.LastMessage ? room.LastMessage : (room.LastAttachments && room.LastAttachments !== '[]' && room.LastAttachments !== 'null' ? '📎 ส่งไฟล์แนบ' : <span className="italic">ยังไม่มีข้อความ</span>)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm p-6 text-center">
                      ไม่มีประวัติการแชท
                    </div>
                  )}
                </div>
              ) : (
                // CHAT VIEW
                <>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                    {messages.map(msg => {
                      const isMe = msg.Author === (currentUser.username || currentUser.fullname);
                      return (
                        <div key={msg.Id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {!isMe && <span className="text-[10px] text-slate-400 mb-1 ml-1">{msg.Author}</span>}
                          <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700'}`}>
                            {msg.Message && <div className="whitespace-pre-wrap mb-1">{msg.Message}</div>}
                            {msg.Attachments && msg.Attachments.length > 0 && (
                              <div className="flex flex-col gap-1 mt-1">
                                {msg.Attachments.map(att => {
                                  if (att.type?.startsWith('image/')) {
                                    return <a key={att.id} href={att.url} target="_blank" rel="noreferrer"><img src={att.url} alt={att.name} className="max-w-[150px] rounded-lg border border-white/20 hover:opacity-90" /></a>
                                  } else {
                                    return <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className={`flex items-center gap-1 text-[11px] underline ${isMe ? 'text-indigo-200 hover:text-white' : 'text-indigo-500 hover:text-indigo-600'}`}><FiPaperclip /> {att.name}</a>
                                  }
                                })}
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1 opacity-70">
                            {new Date(msg.CreatedAt).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Attachments Preview */}
                  {attachments.length > 0 && (
                    <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-2 overflow-x-auto custom-scrollbar">
                      {attachments.map(att => (
                        <div key={att.id} className="relative group shrink-0">
                          {att.type?.startsWith('image/') ? (
                            <img src={att.url} className="h-12 w-12 object-cover rounded-lg border border-slate-300 dark:border-slate-600" />
                          ) : (
                            <div className="h-12 w-12 bg-white dark:bg-slate-700 rounded-lg flex flex-col items-center justify-center text-[8px] text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600 overflow-hidden px-1">
                              <FiPaperclip className="text-sm mb-0.5"/>
                              <span className="truncate w-full text-center">{att.name}</span>
                            </div>
                          )}
                          <button onClick={() => handleRemoveAttachment(att.id)} className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 shadow-md hidden group-hover:block"><FiX className="text-[10px]"/></button>
                        </div>
                      ))}
                      {isUploading && <div className="h-12 w-12 flex items-center justify-center text-slate-400"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}
                    </div>
                  )}

                  {/* Chat Input */}
                  <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-2 items-end">
                    <label className="p-2 text-slate-400 hover:text-indigo-500 transition-colors shrink-0 cursor-pointer">
                      <FiPaperclip className="text-xl" />
                      <input type="file" className="hidden" ref={fileInputRef} onChange={handleUploadAttachment} disabled={isUploading} />
                    </label>
                    <textarea 
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder="พิมพ์ข้อความ..."
                      className="flex-1 max-h-24 min-h-[40px] bg-slate-100 dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 resize-none custom-scrollbar dark:text-white"
                      rows="1"
                    />
                    <button 
                      type="submit" 
                      disabled={(!inputText.trim() && attachments.length === 0) || isSending || isUploading}
                      className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <FiSend className="text-xl" />
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsOpen(true)}
            className="relative w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
          >
            <FiMessageSquare className="text-2xl" />
          </button>
        )}
      </div>

      {selectedTaskForModal && (
        <AddTaskModal 
          isOpen={true}
          onClose={() => setSelectedTaskForModal(null)}
          onSave={onSaveTask}
          onDelete={onDeleteTask}
          initialData={selectedTaskForModal}
          currentUser={currentUser}
          tasks={tasks}
          users={users}
        />
      )}
    </>
  );
}
