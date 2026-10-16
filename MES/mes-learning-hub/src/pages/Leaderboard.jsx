import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getLeaderboardData, 
  getCurrentUser, 
  calculateRank, 
  RANKS 
} from '../data/communityStore';
import { DEFAULT_AVATAR } from '../data/offlineAssets';
import { 
  FiArrowLeft, 
  FiAward, 
  FiTrendingUp, 
  FiCheckCircle, 
  FiStar, 
  FiHeart, 
  FiBookOpen, 
  FiUserCheck,
  FiChevronRight
} from 'react-icons/fi';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => getCurrentUser());
  const leaderboard = useMemo(() => getLeaderboardData(), []);
  const myRank = useMemo(() => calculateRank(currentUser.exp), [currentUser.exp]);

  return (
    <div className="learning-container max-w-5xl">
      {/* Top Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={() => navigate('/community')}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <FiArrowLeft /> กลับสู่คลังความรู้ชุมชน
        </button>

        <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5">
          <FiAward className="w-3.5 h-3.5" /> ทำเนียบยศและคะแนนพนักงาน
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 md:p-8 mb-8 shadow-xl">
        <div className="max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-black text-white mb-2 flex items-center gap-2.5">
            <FiAward className="text-amber-400" /> ทำเนียบเกียรติยศ (Knowledge Hall of Fame)
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            ยกย่องพนักงานและหัวหน้างานผู้มีส่วนร่วมในการแบ่งปันประสบการณ์ เทคนิคหน้างาน และยกระดับมาตรฐานความรู้ของโรงงาน
          </p>
        </div>
      </div>

      {/* Rank Tiers Explanations */}
      <div className="mb-8">
        <h2 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
          <FiStar className="text-amber-400" /> ระดับยศและเกณฑ์คะแนนประสบการณ์ (EXP)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {RANKS.map(r => {
            const isMyTier = myRank.level === r.level;
            return (
              <div 
                key={r.level} 
                className={`p-4 rounded-xl border transition-all ${
                  isMyTier 
                    ? 'bg-slate-800/95 border-fuchsia-500 shadow-lg shadow-fuchsia-500/10 ring-1 ring-fuchsia-500' 
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{r.badge}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white bg-gradient-to-r ${r.color}`}>
                    Lv.{r.level}
                  </span>
                </div>
                <div className="text-sm font-bold text-white mb-1 truncate">{r.name}</div>
                <div className="text-xs font-mono text-slate-400">
                  {r.minExp} {r.maxExp < 99999 ? `- ${r.maxExp}` : '+'} EXP
                </div>
                {isMyTier && (
                  <div className="mt-2 text-[10px] font-bold text-fuchsia-400 flex items-center gap-1">
                    <FiUserCheck className="w-3 h-3" /> ยศปัจจุบันของคุณ
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rules for Earning EXP */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-300">
        <span className="font-bold text-white flex items-center gap-1.5 flex-shrink-0">
          <FiTrendingUp className="text-cyan-400 w-4 h-4" /> วิธีสะสมคะแนน EXP:
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-fuchsia-400"></span>
            เขียนบทเรียน/ทริคหน้างาน: <strong className="text-amber-300 font-mono">+50 EXP</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            ได้รับคะแนนเป็นประโยชน์: <strong className="text-amber-300 font-mono">+5 EXP</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            ร่วมแสดงความคิดเห็น: <strong className="text-amber-300 font-mono">+5 EXP</strong>
          </span>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">ตารางจัดอันดับพนักงาน (Top Contributors)</h3>
          <span className="text-xs text-slate-400">อัปเดตแบบเรียลไทม์</span>
        </div>

        <div className="divide-y divide-slate-700/60">
          {leaderboard.map((user, index) => {
            const isMe = user.id === currentUser.id;
            const rankInfo = user.rank;
            const position = index + 1;

            return (
              <div 
                key={user.id}
                onClick={() => navigate(`/profile/${user.emp_id || user.id}`)}
                className={`px-6 py-4 flex items-center justify-between gap-4 transition-all cursor-pointer group ${
                  isMe ? 'bg-fuchsia-950/20 hover:bg-fuchsia-950/40 border-l-4 border-fuchsia-500' : 'hover:bg-slate-750/70'
                }`}
                title="คลิกเพื่อดูประวัติการอบรมและสมรรถนะ (Competency Passport)"
              >
                {/* Position & User Details */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-8 text-center flex-shrink-0">
                    {position === 1 ? (
                      <span className="text-2xl" title="อันดับที่ 1">🥇</span>
                    ) : position === 2 ? (
                      <span className="text-2xl" title="อันดับที่ 2">🥈</span>
                    ) : position === 3 ? (
                      <span className="text-2xl" title="อันดับที่ 3">🥉</span>
                    ) : (
                      <span className="text-sm font-bold text-slate-500 font-mono">#{position}</span>
                    )}
                  </div>

                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                    className="w-11 h-11 rounded-xl object-cover border border-slate-600 flex-shrink-0 group-hover:scale-105 transition-transform"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white truncate group-hover:text-fuchsia-300 transition-colors">
                        {user.name}
                      </span>
                      {isMe && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                          คุณ
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">
                      {user.role}
                    </div>
                  </div>
                </div>

                {/* Rank Badge & Metrics */}
                <div className="flex items-center gap-6 flex-shrink-0">
                  {/* Contribution counts */}
                  <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1" title="จำนวนบทเรียนที่เผยแพร่">
                      <FiBookOpen className="w-3.5 h-3.5 text-slate-500" />
                      <span>{user.postsCount || 0} บทเรียน</span>
                    </span>
                    <span className="flex items-center gap-1" title="คะแนนเป็นประโยชน์ที่ได้รับ">
                      <FiHeart className="w-3.5 h-3.5 text-rose-500" />
                      <span>{user.likesReceived || 0}</span>
                    </span>
                  </div>

                  {/* Rank Badge */}
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5 mb-0.5">
                      <span className="text-sm">{rankInfo.badge}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold text-white bg-gradient-to-r ${rankInfo.color}`}>
                        Lv.{rankInfo.level} {rankInfo.name}
                      </span>
                    </div>
                    <div className="text-xs font-mono font-bold text-amber-300">
                      {user.exp} EXP
                    </div>
                  </div>

                  {/* Right Chevron */}
                  <div className="text-slate-500 group-hover:text-fuchsia-400 group-hover:translate-x-1 transition-all">
                    <FiChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
