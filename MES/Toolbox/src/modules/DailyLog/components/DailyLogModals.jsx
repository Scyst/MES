import React, { useState, useEffect } from 'react';
import {
  X, Lock, Send, History, AlertTriangle, Users, MessageSquareReply, CheckCircle2, Loader2
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { dailyLogApi } from '../../../shared/services/dailyLogApi';
import { formatDateTH, getMoodMeta, maskIdentity, PERIOD_META } from '../utils/dailyLogHelpers';

export function PrivacyPasswordModal({ isOpen, onClose, onUnlocked }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('กรุณากรอกรหัสผ่านบัญชีของคุณ');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await dailyLogApi.verifyPrivacyPassword(password);
      if (res?.success) {
        onUnlocked();
        onClose();
      } else {
        setError(res?.message || 'รหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'ไม่สามารถตรวจสอบรหัสผ่านได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-amber-50/70 dark:bg-amber-950/30">
          <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-300 font-bold">
            <Lock className="w-5 h-5" />
            <span>ปลดล็อกโหมดความเป็นส่วนตัว (PDPA)</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            ข้อมูลรายบุคคลและข้อความบันทึกปัญหาอยู่ภายใต้มาตรการคุ้มครองข้อมูลส่วนบุคคล กรุณายืนยันรหัสผ่านของคุณเพื่อแสดงรายชื่อและตอบกลับพนักงาน
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              รหัสผ่านผู้ใช้งานปัจจุบัน
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="กรอกรหัสผ่าน..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              ยืนยันตัวตน
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ReplyModal({ isOpen, target, isPrivacyMode, onClose, onSaved }) {
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && target) {
      setReplyText(target.reply_message || '');
      setError('');
    }
  }, [isOpen, target]);

  if (!isOpen || !target) return null;

  const idInfo = maskIdentity(target.fullname, target.emp_id, target.username, isPrivacyMode);
  const moodMeta = getMoodMeta(target.mood_score);
  const periodLabel = PERIOD_META[Number(target.period_id)]?.label || `ช่วง ${target.period_id}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed) {
      setError('กรุณากรอกข้อความตอบกลับ');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await dailyLogApi.saveReply({
        logDate: target.log_date,
        targetUserId: target.user_id,
        periodId: target.period_id,
        replyMessage: trimmed
      });
      if (res?.success) {
        onSaved(res.data);
        onClose();
      } else {
        setError(res?.message || 'ไม่สามารถบันทึกคำตอบได้');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-indigo-50/70 dark:bg-indigo-950/30">
          <div className="flex items-center gap-2.5 text-indigo-700 dark:text-indigo-300 font-bold">
            <MessageSquareReply className="w-5 h-5" />
            <span>ตอบกลับข้อความพนักงาน (Supervisor Reply)</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-100">
                {idInfo.displayName} <span className="text-slate-400 font-mono">({target.line || 'N/A'})</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                {formatDateTH(target.log_date)} · {periodLabel}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-semibold ${moodMeta.badgeClass}`}>
                <span>{moodMeta.emoji}</span>
                <span>ระดับ {target.mood_score}/5 ({moodMeta.short})</span>
              </span>
              {Number(target.production_qty) > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono">
                  ยอดผลิต: {Number(target.production_qty).toLocaleString()} ชิ้น
                </span>
              )}
            </div>

            <div className="text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
              {target.note ? `"${target.note}"` : <span className="text-slate-400 italic">พนักงานไม่ได้ระบุหมายเหตุเพิ่มเติม</span>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              ข้อความตอบกลับ / คำแนะนำจากหัวหน้างาน
            </label>
            <textarea
              rows={4}
              maxLength={1000}
              autoFocus
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="พิมพ์ข้อความให้กำลังใจ แนวทางแก้ไขปัญหา หรือการส่งต่อกะ..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
            />
            <div className="text-right text-[11px] text-slate-400 mt-1">{replyText.length}/1000</div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              ส่งคำตอบ (แจ้งเตือนพนักงาน)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UserHistoryModal({ isOpen, targetUser, isPrivacyMode, onClose }) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!isOpen || !targetUser) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await dailyLogApi.getUserHistory({
          empId: targetUser.emp_id,
          userId: targetUser.user_id
        });
        if (active && res?.success) {
          setProfile(res.data?.profile || targetUser);
          setHistory(res.data?.history || []);
        }
      } catch (err) {
        console.error('Failed to load user history:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [isOpen, targetUser]);

  if (!isOpen || !targetUser) return null;

  const p = profile || targetUser;
  const idInfo = maskIdentity(p.fullname, p.emp_id, p.username, isPrivacyMode);
  const chartData = [...history].reverse().map((h) => ({
    label: `${formatDateTH(h.log_date).slice(0, 5)} P${h.period_id}`,
    score: Number(h.mood_score) || 0
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5 font-bold text-slate-800 dark:text-slate-100">
            <History className="w-5 h-5 text-blue-600" />
            <div>
              <div>ประวัติบันทึกย้อนหลัง 10 รายการล่าสุด</div>
              <div className="text-xs font-normal text-slate-500">
                {idInfo.displayName} · รหัส {idInfo.displayId} · Line {p.line || 'N/A'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-12 flex items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดประวัติ...
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">ไม่พบประวัติการบันทึกย้อนหลัง</div>
          ) : (
            <>
              <div className="h-52 w-full bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" name="ระดับความรู้สึก" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5">
                {history.map((item, idx) => {
                  const mm = getMoodMeta(item.mood_score);
                  return (
                    <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {formatDateTH(item.log_date)} · {PERIOD_META[Number(item.period_id)]?.label || `P${item.period_id}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full border font-semibold ${mm.badgeClass}`}>
                          {mm.emoji} {item.mood_score}/5
                        </span>
                      </div>
                      {item.note && (
                        <p className="text-xs text-slate-600 dark:text-slate-300">บันทึก: {item.note}</p>
                      )}
                      {item.reply_message && (
                        <div className="text-xs bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg px-2.5 py-1.5 text-emerald-800 dark:text-emerald-300">
                          <span className="font-bold">ตอบกลับ ({item.reply_by || 'Supervisor'}):</span> {item.reply_message}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function NegativeAlertsModal({ isOpen, filters, isPrivacyMode, onClose, onReplyClick }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await dailyLogApi.getNegativeAlerts({
          startDate: filters.startDate,
          endDate: filters.endDate,
          line: filters.line
        });
        if (active && res?.success) {
          setItems(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load negative alerts:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [isOpen, filters.startDate, filters.endDate, filters.line]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-rose-50 dark:bg-rose-950/30">
          <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-300 font-bold">
            <AlertTriangle className="w-5 h-5" />
            <span>รายการเฝ้าระวังความรู้สึกเชิงลบ (Score 1 - 2)</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-2.5">
          {loading ? (
            <div className="py-12 flex items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดรายการเฝ้าระวัง...
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-emerald-600 font-semibold flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8" />
              ไม่พบรายการคะแนนต่ำกว่า 3 ในช่วงเวลาที่เลือก
            </div>
          ) : (
            items.map((row) => {
              const idInfo = maskIdentity(row.fullname, row.emp_id, row.username, isPrivacyMode);
              const mm = getMoodMeta(row.mood_score);
              return (
                <div key={`${row.log_id}`} className="p-3.5 rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/30 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full border font-bold ${mm.badgeClass}`}>
                        {mm.emoji} {row.mood_score}/5
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{idInfo.displayName}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                        {row.line || 'N/A'}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {formatDateTH(row.log_date)} · {PERIOD_META[Number(row.period_id)]?.short}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      {row.note ? row.note : <span className="text-slate-400 italic">ไม่ได้กรอกข้อความ</span>}
                    </p>
                    {row.reply_message && (
                      <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg">
                        <span className="font-bold">{row.reply_by}:</span> {row.reply_message}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onReplyClick(row)}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 self-start sm:self-center shrink-0"
                  >
                    <MessageSquareReply className="w-3.5 h-3.5" />
                    {row.reply_message ? 'แก้ไขตอบกลับ' : 'ตอบกลับทันที'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function MissingStaffModal({ isOpen, filters, isPrivacyMode, onClose }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await dailyLogApi.getMissingTable({
          startDate: filters.startDate,
          endDate: filters.endDate,
          line: filters.line,
          page: 1,
          limit: 100
        });
        if (active && res?.success) {
          setRows(res.data?.rows || []);
          setTotal(res.data?.pagination?.total || 0);
        }
      } catch (err) {
        console.error('Failed to load missing staff:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [isOpen, filters.startDate, filters.endDate, filters.line]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-amber-50 dark:bg-amber-950/30">
          <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-300 font-bold">
            <Users className="w-5 h-5" />
            <span>รายชื่อผู้ปฏิบัติงานที่ยังไม่บันทึกข้อมูล ({total.toLocaleString()} คน)</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          {loading ? (
            <div className="py-12 flex items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดรายชื่อ...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-emerald-600 font-semibold">พนักงานในกลุ่มที่เลือกบันทึกครบถ้วนแล้ว</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((u) => {
                const idInfo = maskIdentity(u.fullname, u.emp_id, u.username, isPrivacyMode);
                return (
                  <div key={u.user_id || u.username} className="py-2.5 px-2 flex items-center justify-between gap-2 text-sm">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{idInfo.displayName}</div>
                      <div className="text-xs text-slate-400 font-mono">{idInfo.displayId}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                      {u.line || 'N/A'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
