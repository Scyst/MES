import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
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
  const { isDark } = useTheme();
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
          className={`inline-flex items-center gap-2 text-sm transition-colors ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FiArrowLeft /> กลับสู่คลังความรู้ชุมชน
        </button>

        <span className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
          isDark ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-amber-800 bg-amber-50 border-amber-300'
        }`}>
          <FiAward className="w-3.5 h-3.5 text-amber-500" /> ทำเนียบยศและคะแนนพนักงาน
        </span>
      </div>

      {/* Header Banner */}
      <div className={`border rounded-2xl p-6 md:p-8 mb-8 shadow-sm ${
        isDark 
          ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-slate-700/80 shadow-xl' 
          : 'bg-gradient-to-r from-amber-50/50 via-white to-slate-50 border-slate-200 text-slate-800'
      }`}>
        <div className="max-w-2xl">
          <h1 className={`text-2xl md:text-3xl font-black mb-2 flex items-center gap-2.5 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            <FiAward className="text-amber-500" /> ทำเนียบเกียรติยศ (Knowledge Hall of Fame)
          </h1>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            ยกย่องพนักงานและหัวหน้างานผู้มีส่วนร่วมในการแบ่งปันประสบการณ์ เทคนิคหน้างาน และยกระดับมาตรฐานความรู้ของโรงงาน
          </p>
        </div>
      </div>

      {/* Rank Tiers Explanations */}
      <div className="mb-8">
        <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${
          isDark ? 'text-slate-200' : 'text-slate-900'
        }`}>
          <FiStar className="text-amber-500" /> ระดับยศและเกณฑ์คะแนนประสบการณ์ (EXP)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {RANKS.map(r => {
            const isMyTier = myRank.level === r.level;
            return (
              <div 
                key={r.level} 
                className={`p-4 rounded-xl border transition-all ${
                  isMyTier 
                    ? (isDark 
                        ? 'bg-slate-800/95 border-fuchsia-500 shadow-lg shadow-fuchsia-500/10 ring-1 ring-fuchsia-500' 
                        : 'bg-fuchsia-50/70 border-fuchsia-400 shadow-md ring-1 ring-fuchsia-400')
                    : (isDark 
                        ? 'bg-slate-900/60 border-slate-800' 
                        : 'bg-white border-slate-200 shadow-sm')
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{r.badge}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white bg-gradient-to-r ${r.color}`}>
                    Lv.{r.level}
                  </span>
                </div>
                <div className={`text-sm font-bold mb-1 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {r.name}
                </div>
                <div className={`text-xs font-mono font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {r.minExp} {r.maxExp < 99999 ? `- ${r.maxExp}` : '+'} EXP
                </div>
                {isMyTier && (
                  <div className={`mt-2 text-[10px] font-bold flex items-center gap-1 ${
                    isDark ? 'text-fuchsia-400' : 'text-fuchsia-700'
                  }`}>
                    <FiUserCheck className="w-3 h-3" /> ยศปัจจุบันของคุณ
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rules for Earning EXP */}
      <div className={`border rounded-xl p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs ${
        isDark 
          ? 'bg-slate-800/60 border-slate-700/60 text-slate-300' 
          : 'bg-slate-50 border-slate-200 text-slate-700 shadow-sm'
      }`}>
        <span className={`font-bold flex items-center gap-1.5 flex-shrink-0 ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}>
          <FiTrendingUp className="text-cyan-500 w-4 h-4" /> วิธีสะสมคะแนน EXP:
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span>
            <span>เขียนบทเรียน/ทริคหน้างาน:</span> <strong className={`font-mono ${isDark ? 'text-amber-300' : 'text-amber-700 font-bold'}`}>+50 EXP</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>ได้รับคะแนนเป็นประโยชน์:</span> <strong className={`font-mono ${isDark ? 'text-amber-300' : 'text-amber-700 font-bold'}`}>+5 EXP</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>ร่วมแสดงความคิดเห็น:</span> <strong className={`font-mono ${isDark ? 'text-amber-300' : 'text-amber-700 font-bold'}`}>+5 EXP</strong>
          </span>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${
        isDark ? 'bg-slate-800/90 border-slate-700 shadow-xl' : 'bg-white border-slate-200'
      }`}>
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-slate-700' : 'border-slate-200 bg-slate-50'
        }`}>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            ตารางจัดอันดับพนักงาน (Top Contributors)
          </h3>
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>อัปเดตแบบเรียลไทม์</span>
        </div>

        <div className={`divide-y ${isDark ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
          {leaderboard.map((user, index) => {
            const isMe = user.id === currentUser.id;
            const rankInfo = user.rank;
            const position = index + 1;

            return (
              <div 
                key={user.id}
                onClick={() => navigate(`/profile/${user.emp_id || user.id}`)}
                className={`px-6 py-4 flex items-center justify-between gap-4 transition-all cursor-pointer group ${
                  isMe 
                    ? (isDark ? 'bg-fuchsia-950/20 hover:bg-fuchsia-950/40 border-l-4 border-fuchsia-500' : 'bg-fuchsia-50/50 hover:bg-fuchsia-50/80 border-l-4 border-fuchsia-500') 
                    : (isDark ? 'hover:bg-slate-750/70' : 'hover:bg-slate-50')
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
                      <span className={`text-sm font-bold font-mono ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>#{position}</span>
                    )}
                  </div>

                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                    className={`w-11 h-11 rounded-xl object-cover border flex-shrink-0 group-hover:scale-105 transition-transform ${
                      isDark ? 'border-slate-600' : 'border-slate-300'
                    }`}
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold truncate transition-colors ${
                        isDark ? 'text-white group-hover:text-fuchsia-300' : 'text-slate-900 group-hover:text-fuchsia-700'
                      }`}>
                        {user.name}
                      </span>
                      {isMe && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isDark ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' : 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-300'
                        }`}>
                          คุณ
                        </span>
                      )}
                    </div>
                    <div className={`text-xs truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {user.role}
                    </div>
                  </div>
                </div>

                {/* Rank Badge & Metrics */}
                <div className="flex items-center gap-6 flex-shrink-0">
                  {/* Contribution counts */}
                  <div className={`hidden sm:flex items-center gap-4 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className="flex items-center gap-1" title="จำนวนบทเรียนที่เผยแพร่">
                      <FiBookOpen className={`w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
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
                    <div className={`text-xs font-mono font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                      {user.exp} EXP
                    </div>
                  </div>

                  {/* Right Chevron */}
                  <div className={`${isDark ? 'text-slate-500' : 'text-slate-400'} group-hover:text-fuchsia-500 group-hover:translate-x-1 transition-all`}>
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
