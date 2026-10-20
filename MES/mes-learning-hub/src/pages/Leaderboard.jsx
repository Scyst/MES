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
  FiAward, 
  FiTrendingUp, 
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
    <div className="learning-container py-6 space-y-6">
      {/* Unified Page Header */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5 ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            <FiAward className="text-amber-500 flex-shrink-0" />
            <span>ทำเนียบเกียรติยศ (Knowledge Hall of Fame)</span>
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            ยกย่องพนักงานและหัวหน้างานผู้มีส่วนร่วมในการแบ่งปันประสบการณ์ เทคนิคหน้างาน และยกระดับมาตรฐานความรู้ของโรงงาน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border text-xs font-semibold ${
            isDark ? 'bg-slate-800/80 border-slate-700/80 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
          }`}>
            <span>ยศของคุณ:</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold text-white bg-gradient-to-r ${myRank.color}`}>
              {myRank.badge} Lv.{myRank.level} {myRank.name}
            </span>
            <span className={`font-mono font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
              ({currentUser.exp} EXP)
            </span>
          </div>
        </div>
      </div>

      {/* Rank Tiers & EXP Rules Combined Card */}
      <div className={`border rounded-2xl p-5 space-y-4 ${
        isDark ? 'bg-slate-800/40 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className={`text-sm font-bold flex items-center gap-2 ${
            isDark ? 'text-slate-200' : 'text-slate-900'
          }`}>
            <FiStar className="text-amber-500" />
            <span>ระดับยศและเกณฑ์คะแนนประสบการณ์ (EXP Tiers)</span>
          </h2>

          {/* Inline EXP Rules */}
          <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <span className="font-semibold flex items-center gap-1">
              <FiTrendingUp className="text-cyan-500" /> การได้รับคะแนน:
            </span>
            <span>เขียนบทเรียน/สอบผ่าน <strong className={isDark ? 'text-amber-300 font-mono' : 'text-amber-700 font-mono'}>+50 EXP</strong></span>
            <span>·</span>
            <span>ทักษะรับรอง <strong className={isDark ? 'text-amber-300 font-mono' : 'text-amber-700 font-mono'}>+30 EXP</strong></span>
            <span>·</span>
            <span>ได้รับถูกใจ/ความเห็น <strong className={isDark ? 'text-amber-300 font-mono' : 'text-amber-700 font-mono'}>+5 EXP</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {RANKS.map(r => {
            const isMyTier = myRank.level === r.level;
            return (
              <div 
                key={r.level} 
                className={`p-3.5 rounded-xl border transition-all ${
                  isMyTier 
                    ? (isDark 
                        ? 'bg-slate-800 border-fuchsia-500 shadow-md shadow-fuchsia-500/10 ring-1 ring-fuchsia-500' 
                        : 'bg-fuchsia-50/70 border-fuchsia-400 shadow-sm ring-1 ring-fuchsia-400')
                    : (isDark 
                        ? 'bg-slate-900/60 border-slate-800' 
                        : 'bg-slate-50/80 border-slate-200')
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl">{r.badge}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white bg-gradient-to-r ${r.color}`}>
                    Lv.{r.level}
                  </span>
                </div>
                <div className={`text-xs font-bold mb-0.5 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {r.name}
                </div>
                <div className={`text-[11px] font-mono font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {r.minExp} {r.maxExp < 99999 ? `- ${r.maxExp}` : '+'} EXP
                </div>
                {isMyTier && (
                  <div className={`mt-1.5 text-[10px] font-bold flex items-center gap-1 ${
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

      {/* Leaderboard Table */}
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${
        isDark ? 'bg-slate-800/90 border-slate-700 shadow-xl' : 'bg-white border-slate-200'
      }`}>
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-slate-700' : 'border-slate-200 bg-slate-50'
        }`}>
          <h3 className={`text-sm sm:text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            ตารางจัดอันดับผู้มีส่วนร่วมแบ่งปันความรู้ (Top Contributors)
          </h3>
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>คลิกที่รายชื่อเพื่อดูพาสปอร์ตสมรรถนะ</span>
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
