import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { 
  getCommunityPosts, 
  getCurrentUser, 
  calculateRank, 
  fetchRealUserSession 
} from '../data/communityStore';
import { DEFAULT_AVATAR, DEFAULT_COURSE_IMAGE } from '../data/offlineAssets';
import { 
  FiPlus, 
  FiSearch, 
  FiHeart, 
  FiMessageSquare, 
  FiClock, 
  FiX, 
  FiCompass,
  FiBookOpen,
  FiStar,
  FiUsers
} from 'react-icons/fi';

const COMMUNITY_CATEGORIES = [
  'ทั้งหมด',
  'เครื่องจักรและวิศวกรรมการผลิต',
  'โปรแกรมและระบบดิจิทัล',
  'ขั้นตอนการทำงานและระบบมาตรฐาน',
  'การตรวจโรงงานและเอกสารลูกค้า',
  'เทคนิคและการแก้ปัญหาหน้างาน'
];

export default function CommunityHub() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [posts, setPosts] = useState(() => getCommunityPosts());
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');

  // Proactively sync with live MES authentication session on mount
  useEffect(() => {
    fetchRealUserSession().then(user => {
      if (user) {
        setCurrentUser(user);
      }
    });
    setPosts(getCommunityPosts());
  }, []);

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchCat = selectedCategory === 'ทั้งหมด' || post.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        post.title.toLowerCase().includes(q) ||
        post.summary.toLowerCase().includes(q) ||
        post.author.name.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [posts, selectedCategory, searchQuery]);

  return (
    <div className="learning-container py-6 space-y-6">
      {/* Unified Page Header */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5 ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            <FiUsers className="text-cyan-500 flex-shrink-0" />
            <span>คลังความรู้ชุมชน &amp; ทริคหน้างาน (Community Hub)</span>
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            พื้นที่แลกเปลี่ยนประสบการณ์จริง คู่มือเครื่องจักร วิธีแก้ปัญหา และเทคนิคการทำงานจากเพื่อนร่วมงานทุกแผนก
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className={`text-xs font-semibold px-4 py-2 rounded-xl border ${
            isDark 
              ? 'text-slate-300 bg-slate-800/80 border-slate-700/80' 
              : 'text-slate-700 bg-white border-slate-200 shadow-sm'
          }`}>
            บทเรียนหน้างาน <strong className="text-fuchsia-500 font-black">{posts.length}</strong> เรื่อง
          </div>

          <button
            onClick={() => navigate('/community/new')}
            className="px-4 py-2.5 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-fuchsia-600/20 inline-flex items-center gap-2 hover:-translate-y-0.5"
          >
            <FiPlus className="w-4 h-4" />
            <span>เขียนบทเรียน / แชร์ความรู้</span>
            <span className="bg-black/30 px-1.5 py-0.5 rounded text-[10px] text-amber-300 font-mono">+50 EXP</span>
          </button>
        </div>
      </div>

      {/* Unified Search & Category Filter Bar */}
      <div className="space-y-3">
        <div className="relative max-w-xl">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาทริคหน้างาน, ชื่อเครื่องจักร, ปัญหาที่พบ, ผู้เขียน..."
            className={`w-full border rounded-xl pl-11 pr-10 py-2.5 text-sm focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors shadow-sm ${
              isDark 
                ? 'bg-slate-800/90 border-slate-700 text-slate-200 placeholder-slate-400' 
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="ล้างข้อความค้นหา"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
          {COMMUNITY_CATEGORIES.map(category => {
            const count = category === 'ทั้งหมด' 
              ? posts.length 
              : posts.filter(p => p.category === category).length;
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none border ${
                  isActive
                    ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-md shadow-fuchsia-500/20 border-transparent'
                    : (isDark 
                        ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border-slate-700/80' 
                        : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200 shadow-sm')
                }`}
              >
                <span>{category}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isActive 
                    ? 'bg-black/30 text-white' 
                    : (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700 font-semibold')
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Community Posts Grid */}
      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map(post => {
            const authorRank = calculateRank(post.author.exp || 0);
            return (
              <div 
                key={post.id}
                onClick={() => navigate(`/community/${post.id}`)}
                className={`rounded-2xl overflow-hidden border transition-all cursor-pointer hover:-translate-y-1 flex flex-col justify-between group ${
                  isDark 
                    ? 'bg-slate-800/90 border-slate-700 hover:border-fuchsia-500/50 hover:shadow-xl hover:shadow-fuchsia-500/10' 
                    : 'bg-white border-slate-200 hover:border-fuchsia-400 shadow-sm hover:shadow-md'
                }`}
              >
                <div>
                  {/* Thumbnail / Cover Photo if present */}
                  {post.coverImage && (
                    <div className={`relative h-44 overflow-hidden border-b ${
                      isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-100'
                    }`}>
                      <img 
                        src={post.coverImage || DEFAULT_COURSE_IMAGE} 
                        alt={post.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        onError={(e) => { e.currentTarget.src = DEFAULT_COURSE_IMAGE; }}
                      />
                      {post.isOfficial && (
                        <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 backdrop-blur-sm">
                          <FiStar className="w-3 h-3" /> หลักสูตรมาตรฐาน
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-5">
                    {/* Category & Date */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border truncate ${
                        isDark 
                          ? 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20' 
                          : 'text-fuchsia-800 bg-fuchsia-50 border-fuchsia-200'
                      }`}>
                        {post.category}
                      </span>
                      <span className={`text-[11px] whitespace-nowrap flex items-center gap-1 ${
                        isDark ? 'text-slate-500' : 'text-slate-500'
                      }`}>
                        <FiClock className="w-3 h-3" />
                        {new Date(post.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className={`text-base font-bold mb-2 transition-colors line-clamp-2 leading-snug ${
                      isDark ? 'text-white group-hover:text-fuchsia-300' : 'text-slate-900 group-hover:text-fuchsia-700'
                    }`}>
                      {post.title}
                    </h3>

                    {/* Summary */}
                    <p className={`text-xs mb-4 line-clamp-2 leading-relaxed ${
                      isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {post.summary}
                    </p>

                    {/* Steps preview badge */}
                    <div className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border ${
                      isDark 
                        ? 'text-slate-300 bg-slate-900/60 border-slate-700/60' 
                        : 'text-slate-700 bg-slate-100 border-slate-200'
                    }`}>
                      <FiBookOpen className="w-3.5 h-3.5 text-cyan-500" />
                      <span>{post.steps?.length || 0} ขั้นตอนการปฏิบัติ</span>
                    </div>
                  </div>
                </div>

                {/* Footer: Author & Social Metrics */}
                <div className={`px-5 pb-4 pt-3 border-t flex items-center justify-between gap-3 ${
                  isDark ? 'border-slate-700/80 bg-slate-800/40' : 'border-slate-100 bg-slate-50'
                }`}>
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${post.author.emp_id || post.author.id}`);
                    }}
                    className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity cursor-pointer group/author"
                    title={`ดูประวัติและสมรรถนะ: ${post.author.name}`}
                  >
                    <img 
                      src={post.author.avatar || DEFAULT_AVATAR} 
                      alt={post.author.name} 
                      className={`w-8 h-8 rounded-full object-cover border flex-shrink-0 transition-colors ${
                        isDark ? 'border-slate-600 group-hover/author:border-fuchsia-400' : 'border-slate-300 group-hover/author:border-fuchsia-500'
                      }`}
                      onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                    />
                    <div className="truncate text-xs">
                      <div className={`font-semibold truncate flex items-center gap-1 transition-colors ${
                        isDark ? 'text-slate-200 group-hover/author:text-fuchsia-300' : 'text-slate-900 group-hover/author:text-fuchsia-700'
                      }`}>
                        <span>{post.author.name}</span>
                        <span title={authorRank.name}>{authorRank.badge}</span>
                      </div>
                      <div className={`text-[10px] truncate ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>{post.author.role}</div>
                    </div>
                  </div>

                  {/* Likes & Comments Count */}
                  <div className={`flex items-center gap-3 text-xs flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className="flex items-center gap-1 hover:text-rose-500 transition-colors">
                      <FiHeart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                      <span>{post.likesCount || 0}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <FiMessageSquare className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                      <span>{post.comments?.length || 0}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`p-12 text-center rounded-2xl border my-8 ${
          isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <FiCompass className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>ยังไม่พบบทเรียนในหมวดนี้</h3>
          <p className={`text-sm max-w-md mx-auto mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            เป็นคนแรกที่เริ่มแชร์ทริคหรือคู่มือการทำงานในหมวดนี้ และรับทันที +50 EXP!
          </p>
          <button 
            onClick={() => navigate('/community/new')}
            className="px-5 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2 shadow-sm"
          >
            <FiPlus className="w-4 h-4" /> เริ่มเขียนบทเรียนแรก
          </button>
        </div>
      )}
    </div>
  );
}
