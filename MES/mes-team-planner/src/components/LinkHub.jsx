import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { FiExternalLink, FiPlus, FiTrash2, FiSearch, FiX } from 'react-icons/fi';

export default function LinkHub() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Search state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({ title: '', url: '', category: 'General' });

  const fetchLinks = async () => {
    try {
      const res = await axios.get('/api/links');
      setLinks(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/links', { ...formData, createdBy: 'User' });
      setLinks([res.data, ...links]);
      setFormData({ title: '', url: '', category: 'General' });
      setIsModalOpen(false); // Close modal on success
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/links/${id}`);
      setLinks(links.filter(l => l.Id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  // Filter links by search query
  const filteredLinks = useMemo(() => {
    if (!searchQuery) return links;
    const q = searchQuery.toLowerCase();
    return links.filter(l => 
      l.Title.toLowerCase().includes(q) || 
      l.Url.toLowerCase().includes(q) || 
      l.Category.toLowerCase().includes(q)
    );
  }, [links, searchQuery]);

  // Group by category
  const groupedLinks = filteredLinks.reduce((acc, link) => {
    acc[link.Category] = acc[link.Category] || [];
    acc[link.Category].push(link);
    return acc;
  }, {});

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-600 dark:text-slate-400">Loading links...</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      
      {/* ═══ Header & Toolbar ═══ */}
      <div className="flex flex-col gap-3 mb-4 shrink-0">
        <div className="flex items-center justify-end md:justify-between">
          <h2 className="hidden md:flex text-lg md:text-xl font-bold text-slate-900 dark:text-white items-center gap-2">
            <span className="text-blue-400">🔗</span> คลังข้อมูล
          </h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white pl-3 pr-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-blue-900/20"
          >
            <FiPlus className="text-base" /> <span className="hidden sm:inline">เพิ่มลิงก์</span><span className="sm:hidden">เพิ่ม</span>
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อลิงก์, URL, หมวดหมู่..." 
            className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-10 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm placeholder-slate-500 shadow-sm" 
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <FiX />
            </button>
          )}
        </div>
      </div>

      {/* ═══ Links Display ═══ */}
      <div className="flex-1 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-300/50 dark:border-slate-700/50 p-4 shadow-lg overflow-y-auto min-h-0 custom-scrollbar">
        {Object.keys(groupedLinks).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
            <span className="text-3xl opacity-50">📂</span>
            {searchQuery ? 'ไม่พบลิงก์ที่ค้นหา' : 'ยังไม่มีข้อมูลลิงก์'}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedLinks).map(category => (
              <div key={category} className="animate-slide-up">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 border-b border-slate-300 dark:border-slate-700 pb-2">{category}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {groupedLinks[category].map(link => (
                    <div key={link.Id} className="bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 hover:border-blue-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all group relative shadow-sm hover:shadow-blue-900/20">
                      <button 
                        onClick={() => handleDelete(link.Id)} 
                        className="absolute top-2.5 right-2.5 text-slate-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-slate-100 dark:bg-slate-800 rounded-md shadow-sm"
                        title="ลบลิงก์"
                      >
                        <FiTrash2 className="text-sm" />
                      </button>
                      <h4 className="text-slate-800 dark:text-slate-200 font-medium text-sm mb-1.5 pr-8 truncate" title={link.Title}>{link.Title}</h4>
                      <a href={link.Url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:text-blue-300 hover:underline flex items-center gap-1.5 truncate w-full pr-4 transition-colors">
                        <FiExternalLink className="shrink-0 text-[11px]" /> {link.Url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Add Link Modal ═══ */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-300/80 dark:border-slate-700/80 shadow-2xl shadow-black/50 overflow-hidden animate-slide-up">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-800/80 to-slate-900/80">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-blue-400">🔗</span> เพิ่มลิงก์ใหม่
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700/80 transition-all active:scale-90"
              >
                <FiX className="text-lg" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">ชื่อลิงก์</label>
                <input 
                  required 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm placeholder-slate-500" 
                  placeholder="เช่น MES Production Server" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">URL</label>
                <input 
                  required 
                  type="url" 
                  value={formData.url} 
                  onChange={e => setFormData({...formData, url: e.target.value})} 
                  className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm placeholder-slate-500" 
                  placeholder="https://" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">หมวดหมู่</label>
                <input 
                  required 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm placeholder-slate-500" 
                  placeholder="เช่น Server, API, Design" 
                />
              </div>
              
              <div className="pt-2">
                <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-slate-900 dark:text-white px-4 py-3 rounded-xl font-semibold transition-all active:scale-95 shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 text-sm">
                  <FiPlus /> บันทึกลิงก์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
