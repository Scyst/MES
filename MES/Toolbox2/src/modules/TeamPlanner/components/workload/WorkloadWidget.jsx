import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FiGithub, FiActivity, FiClock, FiCalendar, FiCode, FiLoader } from 'react-icons/fi';
import { parseISO, format } from 'date-fns';
const githubCache = {};

export default function WorkloadWidget({ user }) {
  const [data, setData] = useState(null);
  const [locData, setLocData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locLoading, setLocLoading] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!user || !user.username) return;

    setLoading(true);
    setLocData(null);
    setError(null);

    // Phase 1: Fast — commit counts + calendar + events list (no LOC)
    const cacheKeyBasic = `${user.username}_basic`;
    const cacheKeyLoc = `${user.username}_loc`;

    const fetchLoc = () => {
      if (githubCache[cacheKeyLoc] && (Date.now() - githubCache[cacheKeyLoc].time < 900000)) {
        setLocData(githubCache[cacheKeyLoc].data);
        return;
      }
      setLocLoading(true);
      axios.get(`/api/github.php?user=${user.username}&type=loc`)
        .then(locRes => {
          githubCache[cacheKeyLoc] = { data: locRes.data, time: Date.now() };
          setLocData(locRes.data);
          setLocLoading(false);
        })
        .catch(() => setLocLoading(false));
    };

    if (githubCache[cacheKeyBasic] && (Date.now() - githubCache[cacheKeyBasic].time < 900000)) {
      if (githubCache[cacheKeyBasic].data?.configured === false) {
        setError('not_configured');
        setLoading(false);
        return;
      }
      setData(githubCache[cacheKeyBasic].data);
      setLoading(false);
      fetchLoc();
      return;
    }

    axios.get(`/api/github.php?user=${user.username}&type=basic`)
      .then(res => {
        githubCache[cacheKeyBasic] = { data: res.data, time: Date.now() };
        if (res.data?.configured === false) {
          setError('not_configured');
          setLoading(false);
          return;
        }
        setData(res.data);
        setLoading(false);

        // Phase 2: Slow — LOC stats in background
        fetchLoc();
      })
      .catch(err => {
        if (err.response?.status !== 404) console.error(err);
        setError(err.response?.data?.error || 'ไม่สามารถดึงข้อมูล GitHub ได้');
        setLoading(false);
      });
  }, [user?.username]);

  // Scroll calendar to the right (latest)
  useEffect(() => {
    if (!loading && data && !error && containerRef.current) {
      setTimeout(() => {
        if (containerRef.current) containerRef.current.scrollLeft = containerRef.current.scrollWidth;
      }, 100);
    }
  }, [loading, data, error]);

  if (!user) return null;
  if (loading) return null;
  if (error || data?.configured === false) return null;
  if (!data || !data.stats) return null;

  const { stats, weeks, totalContributions } = data;

  const renderCalendar = () => {
    if (!weeks || weeks.length === 0) return null;
    let filteredWeeks = weeks;
    if (weeks.length > 52) filteredWeeks = weeks.slice(weeks.length - 52);
    let currentMonth = -1;

    return (
      <div className="flex flex-col text-xs mt-4 items-center">
        <div className="flex items-end gap-2 overflow-x-auto custom-scrollbar pb-2 pt-4 max-w-full" ref={containerRef}>
          <div className="flex flex-col gap-1 pr-2 text-slate-400 text-[10px] justify-between h-[150px]">
            <span className="mt-4">Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>
          <div className="flex flex-col relative">
            <div className="flex text-slate-400 text-[10px] h-4 mb-1 relative">
              {filteredWeeks.map((week, idx) => {
                const firstDay = week.contributionDays[0];
                if (!firstDay) return <div key={`empty-${idx}`} className="w-[18px] mr-1"></div>;
                const d = parseISO(firstDay.date);
                const m = d.getMonth();
                if (m !== currentMonth && idx < filteredWeeks.length - 1) {
                  currentMonth = m;
                  return (
                    <div key={`month-${idx}`} className="absolute" style={{ left: `${idx * 22}px` }}>
                      {format(d, 'MMM')}
                    </div>
                  );
                }
                return null;
              })}
            </div>
            <div className="flex">
              {filteredWeeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1 mr-1">
                  {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                    const day = week.contributionDays.find(d => parseISO(d.date).getDay() === dayIndex);
                    if (!day) return <div key={`empty-${wIdx}-${dayIndex}`} className="w-[18px] h-[18px] rounded-sm bg-transparent"></div>;

                    let bgColor = 'bg-slate-100 dark:bg-slate-800';
                    if (day.contributionCount > 0 && day.contributionCount <= 3) bgColor = 'bg-emerald-200 dark:bg-emerald-900/40';
                    else if (day.contributionCount > 3 && day.contributionCount <= 6) bgColor = 'bg-emerald-300 dark:bg-emerald-700/60';
                    else if (day.contributionCount > 6 && day.contributionCount <= 9) bgColor = 'bg-emerald-400 dark:bg-emerald-600/80';
                    else if (day.contributionCount > 9) bgColor = 'bg-emerald-500 dark:bg-emerald-500';

                    return (
                      <div
                        key={`${wIdx}-${dayIndex}`}
                        className={`w-[18px] h-[18px] rounded-sm ${bgColor} hover:ring-2 hover:ring-slate-400 transition-all cursor-pointer`}
                        title={`${day.contributionCount} contributions on ${day.date}`}
                      ></div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // LOC value display helper
  const LocValue = ({ value, loading }) => {
    if (loading) return <span className="animate-pulse text-slate-300 dark:text-slate-600">···</span>;
    return <>{value ?? 0}</>;
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col xl:flex-row gap-6">

        {/* Left Side: Profile & Stats */}
        <div className="flex-1 xl:max-w-md">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold shadow-sm shrink-0">
              {(user.fullname || user.username).charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {user.fullname || user.username}
                <FiGithub className="text-slate-400" />
              </h3>
              <p className="text-xs text-slate-500">{user.Role || 'Team Member'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-3">
            {/* Commit Cards */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl p-3">
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase flex items-center gap-1 mb-1"><FiActivity /> Today</div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{stats?.commitsToday || 0} <span className="text-xs font-normal text-emerald-600/70">commits</span></div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-3">
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase flex items-center gap-1 mb-1"><FiCalendar /> This Week</div>
              <div className="text-2xl font-black text-blue-700 dark:text-blue-300">{stats?.commitsWeek || 0} <span className="text-xs font-normal text-blue-600/70">commits</span></div>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-3">
              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase flex items-center gap-1 mb-1"><FiCalendar /> This Month</div>
              <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{stats?.commitsMonth || 0} <span className="text-xs font-normal text-indigo-600/70">commits</span></div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 rounded-xl p-3">
              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold uppercase flex items-center gap-1 mb-1"><FiActivity /> This Year</div>
              <div className="text-2xl font-black text-purple-700 dark:text-purple-300">{stats?.commitsYear || 0} <span className="text-xs font-normal text-purple-600/70">commits</span></div>
            </div>

            {/* LOC Cards — lazy loaded */}
            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-800/30 rounded-xl p-3">
              <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-semibold uppercase flex items-center gap-1 mb-1"><FiCode /> LOC Today</div>
              <div className="text-xl font-black font-mono flex items-center gap-3">
                <div className="text-emerald-600 dark:text-emerald-400 flex items-center"><span className="text-xs font-normal text-emerald-600/70">+</span><LocValue value={locData?.locToday?.add} loading={locLoading} /></div>
                <div className="text-rose-600 dark:text-rose-400 flex items-center"><span className="text-xs font-normal text-rose-600/70">-</span><LocValue value={locData?.locToday?.del} loading={locLoading} /></div>
              </div>
            </div>

            <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/30 rounded-xl p-3">
              <div className="text-[10px] text-blue-600/80 dark:text-blue-400/80 font-semibold uppercase flex items-center gap-1 mb-1"><FiCode /> LOC This Week</div>
              <div className="text-xl font-black font-mono flex items-center gap-3">
                <div className="text-emerald-600 dark:text-emerald-400 flex items-center"><span className="text-xs font-normal text-emerald-600/70">+</span><LocValue value={locData?.locWeek?.add} loading={locLoading} /></div>
                <div className="text-rose-600 dark:text-rose-400 flex items-center"><span className="text-xs font-normal text-rose-600/70">-</span><LocValue value={locData?.locWeek?.del} loading={locLoading} /></div>
              </div>
            </div>

            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-800/30 rounded-xl p-3">
              <div className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 font-semibold uppercase flex items-center gap-1 mb-1"><FiCode /> LOC This Month</div>
              <div className="text-xl font-black font-mono flex items-center gap-3">
                <div className="text-emerald-600 dark:text-emerald-400 flex items-center"><span className="text-xs font-normal text-emerald-600/70">+</span><LocValue value={locData?.locMonth?.add} loading={locLoading} /></div>
                <div className="text-rose-600 dark:text-rose-400 flex items-center"><span className="text-xs font-normal text-rose-600/70">-</span><LocValue value={locData?.locMonth?.del} loading={locLoading} /></div>
              </div>
            </div>

            <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100/50 dark:border-purple-800/30 rounded-xl p-3">
              <div className="text-[10px] text-purple-600/80 dark:text-purple-400/80 font-semibold uppercase flex items-center gap-1 mb-1"><FiCode /> LOC This Year</div>
              <div className="text-xl font-black font-mono flex items-center gap-3">
                <div className="text-emerald-600 dark:text-emerald-400 flex items-center"><span className="text-xs font-normal text-emerald-600/70">+</span><LocValue value={locData?.locYear?.add} loading={locLoading} /></div>
                <div className="text-rose-600 dark:text-rose-400 flex items-center"><span className="text-xs font-normal text-rose-600/70">-</span><LocValue value={locData?.locYear?.del} loading={locLoading} /></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Calendar & Recent */}
        <div className="flex-[2] flex flex-col border-t xl:border-t-0 xl:border-l border-slate-100 dark:border-slate-700/50 pt-5 xl:pt-0 xl:pl-6 min-w-0 min-h-0">
          <div className="shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"><FiGithub /> Contribution Calendar</h4>
              <span className="text-xs text-slate-500 font-medium">{totalContributions} contributions (Last Year)</span>
            </div>
            {renderCalendar()}
          </div>

          {stats?.commitLog?.length > 0 && (
            <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700 flex flex-col overflow-hidden" style={{ maxHeight: '200px' }}>
              <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1 shrink-0"><FiClock /> Recent Activity</h5>
              <div className="space-y-2 overflow-y-auto pr-2 pb-1 custom-scrollbar">
                {stats.commitLog.map((commit, idx) => (
                  <div key={idx} className="flex gap-2 text-xs text-slate-600 dark:text-slate-300 items-start">
                    <span className="text-slate-400 font-mono text-[10px] shrink-0 mt-0.5">{commit.time.substring(11, 16)}</span>
                    <a href={commit.url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-500 font-medium truncate flex-1" title={commit.message}>
                      {commit.message}
                    </a>
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 max-w-[80px] truncate shrink-0">{commit.repo.split('/')[1] || commit.repo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
