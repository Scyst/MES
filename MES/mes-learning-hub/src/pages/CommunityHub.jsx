import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FiEye, 
  FiClock, 
  FiAward, 
  FiX, 
  FiTrendingUp,
  FiCompass,
  FiBookOpen,
  FiStar,
  FiImage
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

  const rank = useMemo(() => calculateRank(currentUser.exp), [currentUser.exp]);

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
    <div className="learning-container">
      {/* User Gamification & Level Status Card */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 mb-8 shadow-lg shadow-black/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img 
                src={currentUser.avatar || DEFAULT_AVATAR} 
                alt={currentUser.name} 
                className="w-16 h-16 rounded-2xl object-cover border-2 border-fuchsia-500/50 shadow-md"
                onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
              />
              <span className="absolute -bottom-1 -right-1 text-xl" title={rank.name}>
                {rank.badge}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-bold text-lg">{currentUser.name}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${rank.color} border border-white/20 shadow-sm`}>
                  Lv.{rank.level} {rank.name}
                </span>
                {currentUser.isLoggedInReal && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    MES Live
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{currentUser.role} · {currentUser.emp_id}</p>
              
              {/* EXP Progress Bar */}
              <div className="mt-2.5 flex items-center gap-3">
                <div className="w-48 bg-slate-700/80 rounded-full h-2.5 overflow-hidden border border-slate-600">
                  <div 
                    className="bg-gradient-to-r from-fuchsia-500 to-amber-400 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${rank.progressPercent}%` }}
                  ></div>
                </div>
                <span className="text-[11px] font-mono font-bold text-amber-300">
                  {currentUser.exp} EXP
                  {rank.nextRank && <span className="text-slate-400 font-normal"> (ขาดอีก {rank.expNeeded} EXP สู่ Lv.{rank.nextRank.level})</span>}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/community/new')}
              className="px-5 py-3 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-fuchsia-600/30 inline-flex items-center gap-2 hover:-translate-y-0.5"
            >
              <FiPlus className="w-5 h-5" />
              <span>เขียนบทเรียน / แชร์ความรู้</span>
              <span className="bg-black/30 px-1.5 py-0.5 rounded text-[10px] text-amber-300 font-mono">+50 EXP</span>
            </button>

            <button
              onClick={() => navigate('/ranks')}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-colors inline-flex items-center gap-2"
              title="ดูทำเนียบยศและคะแนนพนักงาน"
            >
              <FiAward className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">ทำเนียบยศ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Header & Search */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-1">
              คลังความรู้ชุมชน &amp; ทริคหน้างาน
            </h2>
            <p className="text-sm text-slate-400">
              พื้นที่แลกเปลี่ยนประสบการณ์จริง คู่มือเครื่องจักร วิธีแก้ปัญหา และเทคนิคการทำงานจากเพื่อนร่วมงานทุกแผนก
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-400 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700/80 self-start md:self-auto">
            มีบทเรียนทั้งหมด <span className="text-fuchsia-400 font-bold">{posts.length}</span> เรื่อง
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xl mb-4">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาทริคหน้างาน, ชื่อเครื่องจักร, ปัญหาที่พบ, ผู้เขียน..."
            className="w-full bg-slate-800/90 border border-slate-700 text-slate-200 placeholder-slate-400 rounded-xl pl-12 pr-10 py-3 text-sm focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors shadow-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
          {COMMUNITY_CATEGORIES.map(category => {
            const count = category === 'ทั้งหมด' 
              ? posts.length 
              : posts.filter(p => p.category === category).length;
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none ${
                  isActive
                    ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-md shadow-fuchsia-500/20'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/80'
                }`}
              >
                <span>{category}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isActive ? 'bg-black/30 text-white' : 'bg-slate-700 text-slate-300'
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
                className="bg-slate-800/90 rounded-2xl overflow-hidden border border-slate-700 hover:border-fuchsia-500/50 transition-all cursor-pointer hover:shadow-xl hover:shadow-fuchsia-500/10 hover:-translate-y-1 flex flex-col justify-between group"
              >
                <div>
                  {/* Thumbnail / Cover Photo if present */}
                  {post.coverImage && (
                    <div className="relative h-44 overflow-hidden border-b border-slate-700 bg-slate-900">
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

                  <div className="p-6">
                    {/* Category & Date */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-bold text-fuchsia-400 bg-fuchsia-500/10 px-2.5 py-1 rounded-md border border-fuchsia-500/20 truncate">
                        {post.category}
                      </span>
                      <span className="text-[11px] text-slate-500 whitespace-nowrap flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {new Date(post.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-white mb-2 group-hover:text-fuchsia-300 transition-colors line-clamp-2 leading-snug">
                      {post.title}
                    </h3>

                    {/* Summary */}
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                      {post.summary}
                    </p>

                    {/* Steps preview badge */}
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-700/60 mb-2">
                      <FiBookOpen className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{post.steps?.length || 0} ขั้นตอนการปฏิบัติ</span>
                    </div>
                  </div>
                </div>

                {/* Footer: Author & Social Metrics */}
                <div className="px-6 pb-5 pt-3 border-t border-slate-700/80 flex items-center justify-between gap-3 bg-slate-800/40">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img 
                      src={post.author.avatar || DEFAULT_AVATAR} 
                      alt={post.author.name} 
                      className="w-8 h-8 rounded-full object-cover border border-slate-600 flex-shrink-0"
                      onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                    />
                    <div className="truncate text-xs">
                      <div className="text-slate-200 font-semibold truncate flex items-center gap-1">
                        <span>{post.author.name}</span>
                        <span title={authorRank.name}>{authorRank.badge}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{post.author.role}</div>
                    </div>
                  </div>

                  {/* Likes & Comments Count */}
                  <div className="flex items-center gap-3 text-xs text-slate-400 flex-shrink-0">
                    <span className="flex items-center gap-1 hover:text-rose-400 transition-colors">
                      <FiHeart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                      <span>{post.likesCount || 0}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <FiMessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>{post.comments?.length || 0}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-800/50 rounded-2xl border border-slate-700 my-8">
          <FiCompass className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-200 mb-1">ยังไม่พบบทเรียนในหมวดนี้</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
            เป็นคนแรกที่เริ่มแชร์ทริคหรือคู่มือการทำงานในหมวดนี้ และรับทันที +50 EXP!
          </p>
          <button 
            onClick={() => navigate('/community/new')}
            className="px-5 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" /> เริ่มเขียนบทเรียนแรก
          </button>
        </div>
      )}
    </div>
  );
}
