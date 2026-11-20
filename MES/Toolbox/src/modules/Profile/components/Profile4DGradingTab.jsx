import React from 'react';
import { Link } from 'react-router-dom';
import {
  Coins,
  Sparkles,
  Clock,
  GraduationCap,
  TrendingUp,
  Award,
  ShieldAlert,
  Info,
  CheckCircle2,
  AlertTriangle,
  Users,
  BookOpen,
  ShieldCheck,
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

const GRADE_POINTS = { A: 4.0, B: 3.0, C: 2.0, D: 1.0 };

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
  'N/A': {
    bg: 'bg-slate-50 dark:bg-slate-800',
    text: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    badge: 'bg-slate-500 text-white',
  },
  '-': {
    bg: 'bg-slate-50 dark:bg-slate-800',
    text: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    badge: 'bg-slate-400 text-white',
  },
};

function computeRowGpa(row, weights) {
  const dims = [
    { g: row.grade_iph, w: Number(weights?.iph ?? 25) },
    { g: row.grade_5s, w: Number(weights?.s5 ?? 25) },
    { g: row.grade_attendance, w: Number(weights?.attendance ?? 25) },
    { g: row.grade_learning, w: Number(weights?.learning ?? 25) },
  ];
  let sum = 0;
  let totalW = 0;
  for (const d of dims) {
    const pt = GRADE_POINTS[String(d.g || '').toUpperCase()];
    if (pt !== undefined && d.w > 0) {
      sum += pt * d.w;
      totalW += d.w;
    }
  }
  return totalW > 0 ? Number((sum / totalW).toFixed(2)) : 0;
}

export default function Profile4DGradingTab({ performance, loading }) {
  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
        กำลังโหลดผลการประเมิน 4 มิติ...
      </div>
    );
  }

  if (performance?.restricted) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
        <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          ข้อมูลการประเมินถูกจำกัดสิทธิ์ (Confidential Evaluation)
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          ไม่พบสิทธิ์เข้าถึงข้อมูลการประเมินส่วนบุคคล กรุณาติดต่อผู้ดูแลระบบ
        </p>
      </div>
    );
  }

  const weights = performance?.weights || { iph: 25, s5: 25, attendance: 25, learning: 25 };
  const learnEval = performance?.learning_eval || null;
  const audit5s = performance?.audit_5s || null;
  const wageMasked = Boolean(performance?.wage_masked);

  const overallGrade = performance?.grade_overall && performance.grade_overall !== '-'
    ? performance.grade_overall
    : (performance?.grade && performance.grade !== '-' ? performance.grade : '-');

  const gradeConf = GRADE_STYLES[overallGrade] || GRADE_STYLES['-'];

  const trendData = (performance?.trend || []).map((t) => ({
    period: t.evaluation_period,
    gpa: computeRowGpa(t, weights),
    grade: t.grade_overall || '-',
  }));

  const criteria = performance?.criteria || {};
  const thA = criteria.threshold_a ?? 2.0;
  const thB = criteria.threshold_b ?? 1.5;
  const thC = criteria.threshold_c ?? 1.0;

  const dimensions = [
    {
      title: 'IPH (Productivity)',
      sub: 'ความคุ้มค่าผลผลิตเทียบต้นทุนแรงงาน',
      weight: `${weights.iph}%`,
      grade: performance?.grade_iph || '-',
      icon: Coins,
      metric: wageMasked
        ? 'ซ่อนตัวเลขบาท (HR Policy)'
        : `${Number(performance?.income_per_head || 0).toLocaleString()} THB`,
      ratio: `Ratio: ${Number(performance?.income_ratio || 0).toFixed(2)}x`,
      tooltip: {
        title: `IPH Productivity (น้ำหนัก ${weights.iph}%)`,
        desc: 'วัดความคุ้มค่าผลผลิตสุทธิต่อต้นทุนแรงงานจริงในสายการผลิต',
        formula: 'มูลค่าผลผลิตสุทธิต่อคน / ค่าแรงจริง (ปกติ+OT)',
        benchmark: `เกณฑ์ A ≥ ${thA}x | B ≥ ${thB}x | C ≥ ${thC}x`,
      },
    },
    {
      title: '5S (Workplace)',
      sub: 'ตรวจ 5ส โดยคณะกรรมการ 3–5 คน (หารเท่า)',
      weight: `${weights.s5}%`,
      grade: performance?.grade_5s || '-',
      icon: Sparkles,
      metric: performance?.score_5s !== null && performance?.score_5s !== undefined
        ? `คะแนนเฉลี่ย ${Number(performance.score_5s).toFixed(1)}/100`
        : 'รอตรวจรอบเดือนนี้',
      ratio: audit5s
        ? `กรรมการส่งผล ${audit5s.submitted_count}/${audit5s.required_auditors} คน`
        : 'ประเมินแบบ Blind Peer Audit',
      tooltip: {
        title: `5S Committee Consensus (น้ำหนัก ${weights.s5}%)`,
        desc: 'คำนวณค่าเฉลี่ยแบบหารเท่าจากคณะกรรมการตรวจ 5ส (3–5 คน) พร้อมภาพถ่ายหลักฐาน',
        formula: 'ผลรวมคะแนนกรรมการทุกคน ÷ จำนวนกรรมการที่ส่งผล',
        benchmark: 'เกณฑ์ A ≥ 85 | B ≥ 70 | C ≥ 55 (เต็ม 100)',
      },
    },
    {
      title: 'Attendance (เวลาทำงาน)',
      sub: 'การตรงต่อเวลาและระเบียบวินัย',
      weight: `${weights.attendance}%`,
      grade: performance?.grade_attendance || '-',
      icon: Clock,
      metric: `สาย: ${performance?.late_days || 0} วัน`,
      ratio: `ขาด: ${performance?.absent_days || 0} วัน`,
      tooltip: {
        title: `Attendance (น้ำหนัก ${weights.attendance}%)`,
        desc: 'นับวันมาสายและขาดงานสะสมประจำเดือนจากระบบลงเวลาสแกน',
        formula: 'จำนวนวันมาสาย + วันขาดงาน เทียบเกณฑ์ประจำสายผลิต',
        benchmark: criteria.att_max_late_a !== null && criteria.att_max_late_a !== undefined
          ? `A ≤ ${criteria.att_max_late_a} | B ≤ ${criteria.att_max_late_b} | C ≤ ${criteria.att_max_late_c} วัน`
          : 'อ้างอิงตามเกณฑ์มาตรฐานสายผลิต (หากยังไม่ตั้งค่าแสดง N/A)',
      },
    },
    {
      title: 'Learning Hub (หน่วยกิต)',
      sub: 'วิชาบังคับประจำรอบ (1ด./3ด.) + วิชาเลือก',
      weight: `${weights.learning}%`,
      grade: performance?.grade_learning || '-',
      icon: GraduationCap,
      metric: `${performance?.skill_count ?? learnEval?.total_credits ?? 0} หน่วยกิต`,
      ratio: learnEval?.mandatory_total > 0
        ? `บังคับ: ${learnEval.mandatory_passed}/${learnEval.mandatory_total} วิชา`
        : `ผ่านแล้ว ${performance?.passed_courses || 0} หลักสูตร`,
      tooltip: {
        title: `Learning Credits (น้ำหนัก ${weights.learning}%)`,
        desc: 'คิดหน่วยกิตรวมจากวิชาบังคับตามรอบ (รีเซ็ททุก 1 หรือ 3 เดือน) + วิชาเลือก + ทักษะปฏิบัติ',
        formula: 'ผ่านวิชาบังคับครบ 100% + สะสมหน่วยกิตรวมตามเกณฑ์ตำแหน่ง',
        benchmark: learnEval?.criteria_label || 'Tier 1: A≥3 | Tier 2: A≥5 | Tier 3: A≥8 หน่วยกิต',
      },
    },
  ];

  const mandatoryCourses = learnEval?.mandatory_courses || [];

  return (
    <div className="space-y-4">
      {wageMasked && (
        <div className="flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-xs text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <span className="font-bold">โหมดการดูผลประเมินตนเอง (Self-View — ฉบับเสนอผู้บริหาร): </span>
            แสดงเกรด 4 มิติ สถานะการตรวจ 5ส และภารกิจหลักสูตรบังคับส่วนบุคคลของคุณอย่างครบถ้วน โดยซ่อนตัวเลขค่าแรง/รายได้สุทธิ (บาท) ตามนโยบายความปลอดภัยข้อมูล HR
          </div>
        </div>
      )}

      {/* Overall Score Banner */}
      <div className={`p-4 sm:p-5 rounded-xl border ${gradeConf.border} ${gradeConf.bg} shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4`}>
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-900 shadow-2xs border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall</span>
            <span className={`text-2xl font-extrabold font-mono ${gradeConf.text}`}>{overallGrade}</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
              <Award className={`w-4 h-4 ${gradeConf.text}`} />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ระดับผลการปฏิบัติงานรวม (4D Evaluation Grade)
              </h3>
              <span className="rounded-md bg-white/80 dark:bg-slate-900/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {performance?.is_official_saved ? `ยืนยันผลงวด ${performance?.evaluation_period}` : `คาดการณ์สด (${performance?.evaluation_period || 'เดือนปัจจุบัน'})`}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              GPA เฉลี่ยถ่วงน้ำหนัก: <strong className="font-mono text-slate-800 dark:text-slate-200">{Number(performance?.gpa || 0).toFixed(2)}</strong> / 4.00 · ประเมินครบ IPH, 5ส คณะกรรมการ, เวลาทำงาน และหน่วยกิตการเรียนรู้
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Productivity Ratio</p>
            <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {Number(performance?.income_ratio || 0).toFixed(2)}x
            </p>
          </div>
          <div className="px-3.5 py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Credits / Skills</p>
            <p className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
              {performance?.skill_count || 0} / {learnEval?.target_a || 3} หน่วยกิต
            </p>
          </div>
        </div>
      </div>

      {/* Mandatory Cap Alert */}
      {learnEval?.is_capped_by_mandatory && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <strong>แจ้งเตือนเกรดมิติ Learning Hub:</strong> {learnEval.cap_reason}
          </div>
        </div>
      )}

      {/* 4 Dimension Grade Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {dimensions.map((dim, idx) => {
          const Icon = dim.icon;
          const st = GRADE_STYLES[dim.grade] || GRADE_STYLES['-'];
          return (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3 relative group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{dim.title}</h4>
                      <div className="relative group/tip inline-block">
                        <button
                          type="button"
                          className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-0.5 rounded-full"
                          aria-label={`ข้อมูลเกณฑ์ ${dim.title}`}
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 hidden group-hover/tip:block w-64 p-3 bg-slate-900 text-white rounded-xl shadow-xl text-left text-xs z-50 pointer-events-none border border-slate-750">
                          <div className="flex items-center justify-between border-b border-slate-750 pb-1.5 mb-1.5">
                            <span className="font-bold text-blue-400 text-[11px]">{dim.tooltip.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">นัยสำคัญ {dim.weight}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">{dim.tooltip.desc}</p>
                          <div className="space-y-1 text-[10px] bg-slate-800/90 p-2 rounded-lg border border-slate-700/60">
                            <p className="text-slate-300"><span className="text-slate-400 font-semibold">สูตรการคิด:</span> {dim.tooltip.formula}</p>
                            <p className="text-slate-300"><span className="text-slate-400 font-semibold">เกณฑ์ประเมิน:</span> {dim.tooltip.benchmark}</p>
                          </div>
                          <div className="absolute -top-1.5 left-3 sm:left-1/2 sm:-translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 border-t border-l border-slate-750"></div>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">{dim.sub}</p>
                  </div>
                </div>

                <span className={`min-w-[28px] px-1.5 h-7 rounded-md flex items-center justify-center font-bold font-mono text-xs ${st.badge}`}>
                  {dim.grade}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono text-[11px] truncate">{dim.metric}</span>
                <span className="text-[11px] text-slate-400 shrink-0">{dim.ratio}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mandatory Curriculum Checklist */}
      {mandatoryCourses.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-fuchsia-600" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                หลักสูตรบังคับประจำรอบของคุณ ({learnEval?.tier_name})
              </h3>
            </div>
            <Link
              to="/learning"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-fuchsia-600 px-3 text-xs font-bold text-white hover:bg-fuchsia-700"
            >
              เปิดศูนย์เรียนรู้ Learning Hub
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {mandatoryCourses.map((mc) => (
              <div
                key={`${mc.course_id}-${mc.cycle_key}`}
                className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                  mc.is_passed_current_cycle
                    ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                    : 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {mc.is_passed_current_cycle
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      : <Users className="w-4 h-4 text-amber-600 shrink-0" />}
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {mc.course_title}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>{mc.cycle_label}</span>
                    {mc.expires_at && <span>· ครบกำหนด {mc.expires_at}</span>}
                    <span>· {mc.credits} หน่วยกิต</span>
                  </div>
                </div>
                <Link
                  to={`/learning/course/${mc.course_id}`}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                    mc.is_passed_current_cycle
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : 'bg-amber-600 text-white hover:bg-amber-700'
                  }`}
                >
                  {mc.is_passed_current_cycle ? `ผ่านแล้ว (${mc.last_score_pct}%)` : 'เข้าเรียน / สอบ'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Trend Chart & Table */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              แนวโน้มผลการปฏิบัติงานย้อนหลัง (Performance History & Trend)
            </h3>
          </div>
          <span className="text-xs text-slate-400">รอบการประเมินรายเดือน (4D GPA)</span>
        </div>

        {trendData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
            <div className="lg:col-span-2 h-[340px] sm:h-[380px] border border-slate-100 dark:border-slate-800 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-850">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 15, right: 25, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 4]} tick={{ fontSize: 11 }} />
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
                    dataKey="gpa"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#2563eb' }}
                    activeDot={{ r: 6 }}
                    name="4D GPA (เต็ม 4.00)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-1 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden h-[340px] sm:h-[380px] flex flex-col">
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
    </div>
  );
}
