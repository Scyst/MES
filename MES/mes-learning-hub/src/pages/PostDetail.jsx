import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  getCommunityPosts, 
  likeCommunityPost, 
  addPostComment, 
  calculateRank, 
  getCurrentUser, 
  promotePostToOfficialCourse 
} from '../data/communityStore';
import { DEFAULT_AVATAR, DEFAULT_COURSE_IMAGE } from '../data/offlineAssets';
import { 
  FiArrowLeft, 
  FiHeart, 
  FiMessageSquare, 
  FiClock, 
  FiEye, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiInfo, 
  FiSend,
  FiBookOpen,
  FiAward,
  FiStar,
  FiCheck,
  FiExternalLink,
  FiX,
  FiZoomIn
} from 'react-icons/fi';

const OFFICIAL_CATEGORIES = [
  'เครื่องจักรและวิศวกรรมการผลิต',
  'โปรแกรมและระบบดิจิทัล',
  'ขั้นตอนการทำงานและระบบมาตรฐาน',
  'การตรวจโรงงานและเอกสารลูกค้า',
  'กรณีศึกษาหน้างานจริง',
  'การบริหารและการเพิ่มผลผลิต'
];

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [currentUser] = useState(() => getCurrentUser());
  const [post, setPost] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Image Zoom Modal
  const [zoomedImage, setZoomedImage] = useState(null);

  // Promote Modal
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [promoteCategory, setPromoteCategory] = useState(OFFICIAL_CATEGORIES[0]);
  const [promoteDuration, setPromoteDuration] = useState('20 นาที');
  const [isPromoting, setIsPromoting] = useState(false);

  useEffect(() => {
    const posts = getCommunityPosts();
    const found = posts.find(p => p.id === postId);
    if (found) {
      setPost(found);
      setPromoteCategory(found.category || OFFICIAL_CATEGORIES[0]);
    }
  }, [postId]);

  if (!post) {
    return (
      <div className="learning-container text-center py-16">
        <h2 className="text-xl font-bold text-white mb-2">ไม่พบบทเรียนที่ระบุ</h2>
        <button 
          onClick={() => navigate('/community')}
          className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold"
        >
          กลับสู่คลังความรู้ชุมชน
        </button>
      </div>
    );
  }

  const authorRank = calculateRank(post.author.exp || 0);
  const isLiked = post.likedBy?.includes(currentUser.id);

  const handleLike = () => {
    const updated = likeCommunityPost(post.id);
    if (updated) {
      setPost({ ...updated });
      if (!isLiked) {
        setToastMsg('ขอบคุณที่ส่งกำลังใจ! (+5 EXP ให้ผู้เขียน)');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    }
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    addPostComment(post.id, commentText.trim());
    const posts = getCommunityPosts();
    const updated = posts.find(p => p.id === postId);
    if (updated) {
      setPost({ ...updated });
      setCommentText('');
      setToastMsg('ส่งความคิดเห็นสำเร็จ! (+5 EXP)');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handlePromoteConfirm = () => {
    setIsPromoting(true);
    try {
      const result = promotePostToOfficialCourse(post.id, {
        category: promoteCategory,
        duration: promoteDuration
      });

      if (result) {
        setPost({ ...result.post });
        setIsPromoteModalOpen(false);
        setToastMsg('🎉 ยกระดับเป็นหลักสูตรมาตรฐานโรงงานสำเร็จ! ผู้เขียนได้รับ +200 EXP');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการยกระดับหลักสูตร: ' + err.message);
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="learning-container max-w-4xl">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-fuchsia-400/30 animate-bounce">
          <FiCheckCircle className="w-5 h-5 text-amber-300" />
          <span className="text-sm font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Lightbox / Zoom Modal */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img 
              src={zoomedImage} 
              alt="Zoomed" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-slate-700" 
            />
            <button 
              onClick={() => setZoomedImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-slate-800 rounded-full"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Promote to Official Modal */}
      {isPromoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-3 mb-4 text-amber-400">
              <FiStar className="w-7 h-7" />
              <h3 className="text-lg font-bold text-white">ยกระดับเป็นหลักสูตรมาตรฐานโรงงาน</h3>
            </div>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              การอนุมัตินี้จะนำเนื้อหาและขั้นตอนของบทความนี้ไปแสดงใน <strong>"หลักสูตรมาตรฐาน (Standard Curriculum)"</strong> ของโรงงาน เพื่อให้พนักงานและช่างทุกคนใช้เรียนรู้ และจะมอบโบนัสเกียรติยศ <strong>+200 EXP</strong> ให้กับผู้เขียนบทความทันที
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  บรรจุเข้าหมวดหมู่หลักสูตร
                </label>
                <select
                  value={promoteCategory}
                  onChange={(e) => setPromoteCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  {OFFICIAL_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ระยะเวลาที่แนะนำในการศึกษา
                </label>
                <input 
                  type="text"
                  value={promoteDuration}
                  onChange={(e) => setPromoteDuration(e.target.value)}
                  placeholder="เช่น 15 นาที, 30 นาที"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPromoteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handlePromoteConfirm}
                disabled={isPromoting}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20 inline-flex items-center gap-2"
              >
                <FiCheck className="w-4 h-4" />
                <span>{isPromoting ? 'กำลังประมวลผล...' : 'ยืนยันยกระดับหลักสูตร (+200 EXP)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={() => navigate('/community')}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <FiArrowLeft /> กลับสู่คลังความรู้ชุมชน
        </button>

        <div className="flex items-center gap-2">
          {post.isOfficial ? (
            <Link
              to={`/course/c-promoted-${post.id}`}
              className="text-xs font-bold text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/30 flex items-center gap-1.5 hover:bg-amber-500/20 transition-colors"
            >
              <FiAward className="w-4 h-4 text-amber-400" />
              <span>หลักสูตรมาตรฐานโรงงาน</span>
              <FiExternalLink className="w-3 h-3 ml-0.5" />
            </Link>
          ) : (
            <button
              onClick={() => setIsPromoteModalOpen(true)}
              className="text-xs font-bold text-amber-300 hover:text-amber-200 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full border border-amber-500/40 flex items-center gap-1.5 transition-colors shadow-sm"
              title="อนุมัติยกระดับบทเรียนนี้เป็นหลักสูตรทางการ"
            >
              <FiStar className="w-3.5 h-3.5 text-amber-400" />
              <span>ยกระดับเป็นหลักสูตรทางการ</span>
            </button>
          )}

          <span className="text-xs font-semibold text-fuchsia-400 bg-fuchsia-500/10 px-3 py-1.5 rounded-full border border-fuchsia-500/20">
            {post.category}
          </span>
        </div>
      </div>

      {/* Promoted Golden Banner if Official */}
      {post.isOfficial && (
        <div className="p-4 mb-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/30 text-amber-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏅</span>
            <div>
              <h4 className="text-sm font-bold text-white">ได้รับการรับรองเป็นหลักสูตรมาตรฐานโรงงาน (Official Certified)</h4>
              <p className="text-xs text-amber-300/80">บทเรียนนี้ได้รับการคัดเลือกและยกระดับเข้าสู่ระบบหลักสูตรมาตรฐานเรียบร้อยแล้ว</p>
            </div>
          </div>
          <Link
            to={`/course/c-promoted-${post.id}`}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 flex-shrink-0"
          >
            <span>เปิดเรียนในโหมดหลักสูตร</span>
            <FiExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Main Post Content Card */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-xl mb-8">
        {/* Cover Photo */}
        {post.coverImage && (
          <div 
            onClick={() => setZoomedImage(post.coverImage)}
            className="relative mb-6 rounded-2xl overflow-hidden border border-slate-700 max-h-80 cursor-zoom-in group"
          >
            <img 
              src={post.coverImage} 
              alt={post.title} 
              onError={(e) => { e.currentTarget.src = DEFAULT_COURSE_IMAGE; }}
              className="w-full h-56 md:h-80 object-cover group-hover:scale-105 transition-transform duration-300" 
            />
            <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-[11px] text-white flex items-center gap-1.5">
              <FiZoomIn className="w-3.5 h-3.5" /> คลิกดูรูปขยาย
            </div>
          </div>
        )}

        {/* Post Title */}
        <h1 className="text-2xl md:text-3xl font-black text-white mb-4 leading-tight">
          {post.title}
        </h1>

        {/* Post Summary Callout */}
        <div className="p-4 bg-slate-900/80 rounded-xl border-l-4 border-fuchsia-500 mb-6 text-slate-300 text-sm leading-relaxed">
          {post.summary}
        </div>

        {/* Author Profile Strip */}
        <div className="flex items-center justify-between gap-4 py-4 border-y border-slate-700/80 mb-8">
          <div 
            onClick={() => navigate(`/profile/${post.author.emp_id || post.author.id}`)}
            className="flex items-center gap-3 cursor-pointer group/author hover:opacity-90 transition-opacity"
            title={`คลิกเพื่อดูประวัติและสมรรถนะของ ${post.author.name}`}
          >
            <img 
              src={post.author.avatar} 
              alt={post.author.name} 
              onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
              className="w-12 h-12 rounded-xl object-cover border-2 border-slate-600 group-hover/author:border-fuchsia-400 shadow transition-colors"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm group-hover/author:text-fuchsia-300 transition-colors flex items-center gap-1.5">
                  <span>{post.author.name}</span>
                  <FiExternalLink className="w-3.5 h-3.5 text-fuchsia-400 opacity-0 group-hover/author:opacity-100 transition-opacity" />
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${authorRank.color} border border-white/20`}>
                  {authorRank.badge} Lv.{authorRank.level} {authorRank.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{post.author.role}</p>
            </div>
          </div>

          <div className="text-right text-xs text-slate-400 flex flex-col items-end">
            <span className="flex items-center gap-1">
              <FiClock className="w-3.5 h-3.5" />
              {new Date(post.createdAt).toLocaleDateString('th-TH', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">{post.viewsCount || 1} ครั้งที่เปิดอ่าน</span>
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-6 mb-8">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FiBookOpen className="text-fuchsia-400" /> ขั้นตอนการปฏิบัติงาน
          </h2>

          {post.steps?.map((step, idx) => {
            return (
              <div 
                key={idx}
                className="bg-slate-900/70 border border-slate-700/80 rounded-2xl p-5 md:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-violet-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-md">
                    {step.number || idx + 1}
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="text-base font-bold text-white m-0">
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed m-0">
                      {step.desc}
                    </p>

                    {/* Step Image */}
                    {step.image && (
                      <div 
                        onClick={() => setZoomedImage(step.image)}
                        className="relative rounded-xl overflow-hidden border border-slate-700 max-w-lg mt-3 cursor-zoom-in group"
                      >
                        <img 
                          src={step.image} 
                          alt={step.title} 
                          className="w-full h-48 md:h-64 object-cover group-hover:scale-105 transition-transform" 
                        />
                        <div className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded text-[10px] text-white flex items-center gap-1">
                          <FiZoomIn className="w-3 h-3" /> แตะเพื่อดูรูปขยาย
                        </div>
                      </div>
                    )}

                    {/* Alert Box if present */}
                    {step.alertType && step.alertType !== 'none' && step.alertText && (
                      <div className={`p-3.5 rounded-xl text-xs leading-relaxed flex items-start gap-2.5 mt-2 ${
                        step.alertType === 'danger' 
                          ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300' 
                          : step.alertType === 'warning'
                          ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                          : step.alertType === 'success'
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                          : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300'
                      }`}>
                        {step.alertType === 'danger' && <FiAlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />}
                        {step.alertType === 'warning' && <FiAlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />}
                        {step.alertType === 'success' && <FiCheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />}
                        {step.alertType === 'info' && <FiInfo className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />}
                        <span><strong>{
                          step.alertType === 'danger' ? 'ข้อควรระวังความปลอดภัย: ' :
                          step.alertType === 'warning' ? 'จุดควรระวัง: ' :
                          step.alertType === 'success' ? 'เกณฑ์ยอมรับ: ' : 'ข้อแนะนำ: '
                        }</strong>{step.alertText}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Upvote & Interaction Toolbar */}
        <div className="pt-6 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={handleLike}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all inline-flex items-center gap-2 ${
              isLiked 
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' 
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
          >
            <FiHeart className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} />
            <span>{isLiked ? 'เป็นประโยชน์แล้ว' : 'เป็นประโยชน์ (+5 EXP)'}</span>
            <span className="bg-black/30 px-2 py-0.5 rounded-full text-xs font-mono ml-1">
              {post.likesCount || 0}
            </span>
          </button>

          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <FiEye className="w-4 h-4" />
            <span>{post.viewsCount || 1} ครั้งที่เปิดอ่าน</span>
          </div>
        </div>
      </div>

      {/* Comments & Discussion Section */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <FiMessageSquare className="text-fuchsia-400" /> 
          <span>แลกเปลี่ยนความคิดเห็น / สอบถาม ({post.comments?.length || 0})</span>
        </h2>

        {/* New Comment Box */}
        <form onSubmit={handleCommentSubmit} className="mb-8">
          <div className="flex gap-3">
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
              className="w-10 h-10 rounded-full object-cover border border-slate-600 flex-shrink-0"
            />
            <div className="flex-1 space-y-2">
              <textarea 
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="พิมพ์ข้อความแสดงความคิดเห็น หรือแชร์ทริคเพิ่มเติมที่จุดนี้ (+5 EXP)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2 disabled:opacity-40"
                >
                  <FiSend className="w-3.5 h-3.5" /> ส่งความเห็น
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Comments List */}
        {post.comments && post.comments.length > 0 ? (
          <div className="space-y-4">
            {post.comments.map(c => (
              <div key={c.id} className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{c.authorName}</span>
                    {c.authorBadge && (
                      <span className="text-[10px] text-amber-300 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                        {c.authorBadge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(c.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed m-0">
                  {c.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-4">
            ยังไม่มีความคิดเห็น เป็นคนแรกที่ร่วมแลกเปลี่ยนในหัวข้อนี้!
          </p>
        )}
      </div>
    </div>
  );
}
