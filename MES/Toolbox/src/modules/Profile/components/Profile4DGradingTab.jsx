import React from 'react';
import {
  Coins,
  Sparkles,
  Clock,
  GraduationCap,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Calendar,
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
      <div className="py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        กำลังโหลดผลการประเมิน 4 มิติ...
      </div>
    );
  }

  // If user role is restricted from viewing performance
  if (performance?.restricted) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          ข้อมูลการประเมินถูกจำกัดสิทธิ์ (Confidential Evaluation)
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
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
      color: 'amber',
    },
    {
      title: '5S (Workplace)',
      sub: 'มาตรฐาน 5ส และความสะอาดหน้างาน',
      grade: performance?.grade_5s || '-',
      icon: Sparkles,
      metric: 'เกณฑ์ 5 ส',
      ratio: 'ผ่านการตรวจมาตรฐาน',
      color: 'emerald',
    },
    {
      title: 'Attendance (เวลาทำงาน)',
      sub: 'การตรงต่อเวลาและระเบียบวินัย',
      grade: performance?.grade_attendance || '-',
      icon: Clock,
      metric: `สาย: ${performance?.late_days || 0} วัน`,
      ratio: `ขาด: ${performance?.absent_days || 0} วัน`,
      color: 'blue',
    },
    {
      title: 'Learning Hub (ทักษะ)',
      sub: 'การพัฒนาทักษะและอบรมหลักสูตร',
      grade: performance?.grade_learning || '-',
      icon: GraduationCap,
      metric: `ผ่าน: ${performance?.passed_courses || 0} หลักสูตร`,
      ratio: `ทักษะ: ${performance?.skill_count || 0} ด้าน`,
      color: 'purple',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overall Score Banner */}
      <div className={`p-6 rounded-2xl border ${gradeConf.border} ${gradeConf.bg} shadow-sm flex flex-col md:flex-row items-center justify-between gap-6`}>
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall</span>
            <span className={`text-3xl font-extrabold font-mono ${gradeConf.text}`}>{overallGrade}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <Award className={`w-5 h-5 ${gradeConf.text}`} />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                ระดับผลการปฏิบัติงานรวม (4D Evaluation Grade)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              การประเมินบูรณาการ 4 มิติ: ความคุ้มค่าผลผลิต (IPH), ระเบียบวินัยและความสะอาด (5S), วินัยเวลาการทำงาน (Attendance), และการพัฒนาทักษะ (Learning Hub)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Income Ratio</p>
            <p className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {Number(performance?.income_ratio || 0).toFixed(2)}x
            </p>
          </div>
          <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Skills Matrix</p>
            <p className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
              {performance?.skill_count || 0} ทักษะ
            </p>
          </div>
        </div>
      </div>

      {/* 4 Dimension Grade Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dimensions.map((dim, idx) => {
          const Icon = dim.icon;
          const st = GRADE_STYLES[dim.grade] || GRADE_STYLES['-'];
          return (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{dim.title}</h4>
                    <p className="text-[10px] text-slate-400">{dim.sub}</p>
                  </div>
                </div>

                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-base ${st.badge}`}>
                  {dim.grade}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{dim.metric}</span>
                <span className="text-[11px] text-slate-400">{dim.ratio}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historical Trend Chart & Table */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              แนวโน้มผลการปฏิบัติงานย้อนหลัง (Performance History & Trend)
            </h3>
          </div>
          <span className="text-xs text-slate-400">รอบการประเมินรายเดือน</span>
        </div>

        {trendData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            {/* Trend Chart */}
            <div className="lg:col-span-2 h-64 border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-850">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ratio"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#2563eb' }}
                    activeDot={{ r: 6 }}
                    name="Income Ratio"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Trend Table */}
            <div className="lg:col-span-1 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">รอบเดือน</th>
                    <th className="py-2 px-2 text-center">IPH</th>
                    <th className="py-2 px-2 text-center">5S</th>
                    <th className="py-2 px-2 text-center">Attd</th>
                    <th className="py-2 px-2 text-center">Lrn</th>
                    <th className="py-2 px-2 text-center font-bold">รวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(performance?.trend || []).map((t, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                      <td className="py-2 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {t.evaluation_period}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-amber-600">{t.grade_iph || '-'}</td>
                      <td className="py-2 px-2 text-center font-bold text-emerald-600">{t.grade_5s || '-'}</td>
                      <td className="py-2 px-2 text-center font-bold text-blue-600">{t.grade_attendance || '-'}</td>
                      <td className="py-2 px-2 text-center font-bold text-purple-600">{t.grade_learning || '-'}</td>
                      <td className="py-2 px-2 text-center font-bold font-mono text-slate-900 dark:text-white">
                        {t.grade_overall || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            ยังไม่มีบันทึกประวัติผลการประเมินย้อนหลังในระบบ
          </div>
        )}
      </div>
    </div>
  );
}
