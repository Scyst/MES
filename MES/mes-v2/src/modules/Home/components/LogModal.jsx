import React, { useState, useEffect } from 'react';
import { dailyLogApi } from '../../../shared/services/dailyLogApi';

const emojis = [
  { val: 1, char: '😤', label: 'แย่มาก' },
  { val: 2, char: '😓', label: 'แย่' },
  { val: 3, char: '😐', label: 'เฉยๆ' },
  { val: 4, char: '🙂', label: 'ดี' },
  { val: 5, char: '🤩', label: 'ดีมาก' }
];

export default function LogModal({ isOpen, onClose, periodId, periodInfo, logDate, existingData, onSaved }) {
  const [mood, setMood] = useState('');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingData) {
      setMood(existingData.mood);
      setQty(existingData.qty || '');
      setNote(existingData.note || '');
    }
  }, [existingData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mood) {
      setError('กรุณาเลือกอารมณ์ความรู้สึกของคุณ');
      return;
    }
    
    setLoading(true);
    try {
      const data = {
        action: 'save_log',
        log_date: logDate,
        period_id: periodId,
        mood: mood,
        qty: qty,
        note: note
      };
      
      const res = await dailyLogApi.submitLog(data);
      if (res.success) {
        onSaved(); // trigger refresh
        onClose();
      } else {
        setError(res.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err) {
      console.error(err);
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <div className="text-xs text-gray-500">Production Date: {logDate}</div>
            <h5 className="font-bold text-lg">{periodInfo.label}</h5>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <form id="logForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Mood Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">อารมณ์ความรู้สึกของคุณ <span className="text-red-500">*</span></label>
              <div className="flex justify-between px-2">
                {emojis.map(e => (
                  <div 
                    key={e.val}
                    onClick={() => setMood(e.val)}
                    className={`flex flex-col items-center cursor-pointer transition-all ${mood === e.val ? 'scale-125 opacity-100' : 'opacity-50 hover:opacity-80 grayscale hover:grayscale-0'}`}
                  >
                    <span className="text-3xl">{e.char}</span>
                    <span className={`text-[10px] mt-1 ${mood === e.val ? 'font-bold text-blue-600' : 'text-gray-400'}`}>{e.label}</span>
                  </div>
                ))}
              </div>
              {error && <div className="text-red-500 text-xs mt-2 text-center">{error}</div>}
            </div>

            {/* Qty Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ยอดผลิตที่ทำได้ (ชิ้น)</label>
              <input 
                type="number" 
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="ระบุตัวเลข (ถ้ามี)"
              />
            </div>

            {/* Note Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">บันทึกเพิ่มเติม / ปัญหาที่พบ</label>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-h-[100px]"
                placeholder="พิมพ์ข้อความที่นี่..."
              ></textarea>
            </div>

            {/* Manager Reply Display */}
            {existingData?.reply_message && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <div className="text-green-800 text-xs font-bold mb-1">
                  ข้อความจากหัวหน้า ({existingData.reply_by || 'Manager'}):
                </div>
                <div className="text-sm italic text-gray-700 border-l-4 border-green-400 pl-3">
                  "{existingData.reply_message}"
                </div>
              </div>
            )}
            
          </form>
        </div>
        
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">
            ยกเลิก
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit} 
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center"
          >
            {loading ? <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span> : null}
            บันทึกข้อมูล
          </button>
        </div>
      </div>
    </div>
  );
}
