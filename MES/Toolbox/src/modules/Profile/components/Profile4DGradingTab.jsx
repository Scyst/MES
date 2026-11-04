import React from 'react';
import {
  Coins,
  Sparkles,
  Clock,
  GraduationCap,
  TrendingUp,
  Award,
  ShieldAlert,
  Target,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const GRADE_STYLES = {
  A: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-600 text-white',
  },
  B: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-600 text-white',
  },
  C: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-600 text-white',
  },
  D: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800',
    badge: 'bg-rose-600 text-white',
  },
  '-': {
    bg: 'bg-slate-50 dark:bg-slate-800',
    text: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    badge: 'bg-slate-400 text-white',
  },
};

export default function Profile4DGradingTab({ performance, loading }) {
  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
        กำลังโหลดผลการประเมิน 4 มิติ...
      </div>
    );
  }

  // If user role is restricted from viewing performance
  if (performance?.restricted) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
        <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          ข้อมูลการประเมินถูกจำกัดสิทธิ์ (Confidential Evaluation)
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          ผลคะแนนและการประเมิน 4 มิติสงวนสิทธิ์การเข้าถึงเฉพาะระดับหัวหน้างานและผู้บริหารตามนโยบายความปลอดภัยขององค์กร
        </p>
      </div>
    );
  }

  const overallGrade = performance?.grade_overall && performance.grade_overall !== '-'
    ? performance.grade_overall
    : (performance?.grade && performance.grade !== '-' ? performance.grade : '-');

  const gradeConf = GRADE_STYLES[overallGrade] || GRADE_STYLES['-'];

  const trendData = (performance?.trend || []).map((t) => ({
    period: t.evaluation_period,
    ratio: Number(t.income_ratio || 0),
    grade: t.grade_overall || '-',
  }));

  const dimensions = [
    {
      title: 'IPH (Productivity)',
      sub: 'มูลค่าผลผลิตเทียบต้นทุนแรงงาน',
      grade: performance?.grade_iph || '-',
      icon: Coins,
      metric: `${Number(performance?.income_per_head || 0).toLocaleString()} THB`,
      ratio: `Ratio: ${Number(performance?.income_ratio || 0).toFixed(2)}x`,
    },
    {
      title: '5S (Workplace)',
      sub: 'มาตรฐาน 5ส และความสะอาดหน้างาน',
      grade: performance?.grade_5s || '-',
      icon: Sparkles,
      metric: 'เกณฑ์ 5 ส',
      ratio: 'ผ่านการตรวจมาตรฐาน',
    },
    {
      title: 'Attendance (เวลาทำงาน)',
      sub: 'การตรงต่อเวลาและระเบียบวินัย',
      grade: performance?.grade_attendance || '-',
      icon: Clock,
      metric: `สาย: ${performance?.late_days || 0} วัน`,
      ratio: `ขาด: ${performance?.absent_days || 0} วัน`,
    },
    {
      title: 'Learning Hub (ทักษะ)',
      sub: 'การพัฒนาทักษะและอบรมหลักสูตร',
      grade: performance?.grade_learning || '-',
      icon: GraduationCap,
      metric: `ผ่าน: ${performance?.passed_courses || 0} หลักสูตร`,
      ratio: `ทักษะ: ${performance?.skill_count || 0} ด้าน`,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Overall Score Banner */}
      <div className={`p-4 sm:p-5 rounded-xl border ${gradeConf.border} ${gradeConf.bg} shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4`}>
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-900 shadow-2xs border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall</span>
            <span className={`text-2xl font-extrabold font-mono ${gradeConf.text}`}>{overallGrade}</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5 justify-center md:justify-start">
              <Award className={`w-4 h-4 ${gradeConf.text}`} />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ระดับผลการปฏิบัติงานรวม (4D Evaluation Grade)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              การประเมินบูรณาการ 4 มิติ: ความคุ้มค่าผลผลิต (IPH), ระเบียบวินัยและความสะอาด (5S), วินัยเวลาการทำงาน (Attendance), และการพัฒนาทักษะ (Learning Hub)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Income Ratio</p>
            <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {Number(performance?.income_ratio || 0).toFixed(2)}x
            </p>
          </div>
          <div className="px-3.5 py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Skills Matrix</p>
            <p className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
              {performance?.skill_count || 0} ทักษะ
            </p>
          </div>
        </div>
      </div>

      {/* 4 Dimension Grade Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {dimensions.map((dim, idx) => {
          const Icon = dim.icon;
          const st = GRADE_STYLES[dim.grade] || GRADE_STYLES['-'];
          return (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{dim.title}</h4>
                    <p className="text-[10px] text-slate-400">{dim.sub}</p>
                  </div>
                </div>

                <span className={`w-7 h-7 rounded-md flex items-center justify-center font-bold font-mono text-sm ${st.badge}`}>
                  {dim.grade}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono text-[11px]">{dim.metric}</span>
                <span className="text-[11px] text-slate-400">{dim.ratio}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historical Trend Chart & Table (Expanded dynamic height to fill fullscreen) */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              แนวโน้มผลการปฏิบัติงานย้อนหลัง (Performance History & Trend)
            </h3>
          </div>
          <span className="text-xs text-slate-400">รอบการประเมินรายเดือน</span>
        </div>

        {trendData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
            {/* Dynamic Height Trend Chart */}
            <div className="lg:col-span-2 h-[320px] sm:h-[360px] lg:h-[390px] border border-slate-100 dark:border-slate-800 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-850">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 15, right: 25, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: '0.5rem',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ratio"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#2563eb' }}
                    activeDot={{ r: 6 }}
                    name="Income Ratio"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Matching Dynamic Height Trend Table */}
            <div className="lg:col-span-1 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden h-[320px] sm:h-[360px] lg:h-[390px] flex flex-col">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">รอบเดือน</th>
                    <th className="py-2.5 px-1.5 text-center font-semibold">IPH</th>
                    <th className="py-2.5 px-1.5 text-center font-semibold">5S</th>
                    <th className="py-2.5 px-1.5 text-center font-semibold">Attd</th>
                    <th className="py-2.5 px-1.5 text-center font-semibold">Lrn</th>
                    <th className="py-2.5 px-2.5 text-center font-bold">รวม</th>
                  </tr>
                </thead>
              </table>
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(performance?.trend || []).map((t, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors">
                        <td className="py-2 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                          {t.evaluation_period}
                        </td>
                        <td className="py-2 px-1.5 text-center font-bold text-amber-600">{t.grade_iph || '-'}</td>
                        <td className="py-2 px-1.5 text-center font-bold text-emerald-600">{t.grade_5s || '-'}</td>
                        <td className="py-2 px-1.5 text-center font-bold text-blue-600">{t.grade_attendance || '-'}</td>
                        <td className="py-2 px-1.5 text-center font-bold text-purple-600">{t.grade_learning || '-'}</td>
                        <td className="py-2 px-2.5 text-center font-bold font-mono text-slate-900 dark:text-white">
                          {t.grade_overall || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-slate-400">
            ยังไม่มีบันทึกประวัติผลการประเมินย้อนหลังในระบบ
          </div>
        )}
      </div>

      {/* 4D Criteria & Benchmark Breakdown (Fills vertical screen space on large monitors) */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              เกณฑ์การประเมินและน้ำหนักคะแนน 4 มิติ (4D Metric Benchmarks & Weights)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Total Weight: 100%</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* IPH */}
          <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" /> IPH Productivity
              </span>
              <span className="mes-badge bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                น้ำหนัก 35%
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              เป้าหมาย: Ratio &ge; 1.20x คำนวณจากมูลค่าผลผลิตสุทธิต่อต้นทุนแรงงานจริงในสายการผลิต
            </p>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-200/60 dark:border-slate-800 flex justify-between">
              <span>เกณฑ์ A: &ge; 1.50x</span>
              <span className="text-emerald-600 font-semibold">ปัจจุบัน: {Number(performance?.income_ratio || 0).toFixed(2)}x</span>
            </div>
          </div>

          {/* 5S */}
          <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> 5S Standards
              </span>
              <span className="mes-badge bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                น้ำหนัก 25%
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              เป้าหมาย: ผ่านเกณฑ์ 5 ส และความปลอดภัยหน้างาน &ge; 90% จากการตรวจสุ่มรายสัปดาห์
            </p>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-200/60 dark:border-slate-800 flex justify-between">
              <span>ตรวจประเมิน: รายสัปดาห์</span>
              <span className="text-emerald-600 font-semibold">เกรด: {performance?.grade_5s || '-'}</span>
            </div>
          </div>

          {/* Attendance */}
          <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Attendance
              </span>
              <span className="mes-badge bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                น้ำหนัก 20%
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              เป้าหมาย: ตรงต่อเวลา สาย 0 วัน ขาด 0 วัน เชื่อมต่อระบบสแกนใบหน้า Real-Time
            </p>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-200/60 dark:border-slate-800 flex justify-between">
              <span>สาย: {performance?.late_days || 0} วัน</span>
              <span className="text-blue-600 font-semibold">ขาด: {performance?.absent_days || 0} วัน</span>
            </div>
          </div>

          {/* Learning Hub */}
          <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" /> Learning Hub
              </span>
              <span className="mes-badge bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                น้ำหนัก 20%
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              เป้าหมาย: อบรมและสอบผ่านบทเรียนในศูนย์การเรียนรู้อย่างน้อย 3 หลักสูตร/รอบประเมิน
            </p>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-200/60 dark:border-slate-800 flex justify-between">
              <span>ผ่าน: {performance?.passed_courses || 0} หลักสูตร</span>
              <span className="text-purple-600 font-semibold">ทักษะ: {performance?.skill_count || 0} ด้าน</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
