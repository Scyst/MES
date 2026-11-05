import React from 'react';
import { Clock, Calendar, CheckCircle2, Play } from 'lucide-react';

export default function ForkliftTimeline({ timelineData = [], forklifts = [] }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Group bookings by forklift_id
  const bookingsByForklift = {};
  forklifts.forEach(f => {
    bookingsByForklift[f.id] = [];
  });

  const now = new Date();
  const currentHourFloat = now.getHours() + now.getMinutes() / 60;

  (timelineData || []).forEach(b => {
    if (bookingsByForklift[b.forklift_id]) {
      const start = new Date(b.start_time);
      const end = b.end_time_actual ? new Date(b.end_time_actual) : new Date(b.end_time_est);

      // Normalize to 0-24 hour scale for today
      const startHour = start.getHours() + start.getMinutes() / 60;
      let endHour = end.getHours() + end.getMinutes() / 60;
      if (endHour <= startHour) endHour = 24;

      const leftPct = (Math.max(0, Math.min(24, startHour)) / 24) * 100;
      const widthPct = Math.max(2, ((Math.min(24, endHour) - Math.max(0, startHour)) / 24) * 100);

      bookingsByForklift[b.forklift_id].push({
        ...b,
        leftPct,
        widthPct,
        startFormatted: start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        endFormatted: end.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      });
    }
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-700" />
          <h3 className="font-bold text-slate-800 text-sm">ตารางเวลาการใช้งาน 24 ชั่วโมง (24h Schedule Timeline)</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-600">กำลังใช้งาน (In Use)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-600">จองล่วงหน้า (Booked)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span className="text-slate-600">เสร็จสิ้น (Completed)</span>
          </div>
        </div>
      </div>

      {/* Timeline Grid Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px] space-y-2 py-2">
          {/* Hour Ruler */}
          <div className="grid grid-cols-24 text-[10px] text-slate-400 font-mono border-b border-slate-100 pb-1.5 px-28">
            {hours.map(h => (
              <div key={h} className="text-center">
                {h % 3 === 0 ? `${String(h).padStart(2, '0')}:00` : '·'}
              </div>
            ))}
          </div>

          {/* Vehicle Rows */}
          {forklifts.map(fl => {
            const bookings = bookingsByForklift[fl.id] || [];

            return (
              <div key={fl.id} className="flex items-center gap-2 text-xs hover:bg-slate-50/60 p-1.5 rounded-xl transition-colors">
                {/* Vehicle Label */}
                <div className="w-28 shrink-0 truncate font-semibold text-slate-700" title={fl.code}>
                  {fl.code}
                </div>

                {/* Track */}
                <div className="flex-grow h-7 bg-slate-100/80 rounded-lg relative overflow-hidden border border-slate-200/60">
                  {/* Current Time Indicator line */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 pointer-events-none"
                    style={{ left: `${(currentHourFloat / 24) * 100}%` }}
                    title={`เวลาปัจจุบัน ${now.toLocaleTimeString('th-TH')}`}
                  />

                  {/* Day Shift Background shading (08:00 - 20:00) */}
                  <div 
                    className="absolute top-0 bottom-0 bg-amber-50/50 pointer-events-none"
                    style={{ left: `${(8 / 24) * 100}%`, width: `${(12 / 24) * 100}%` }}
                  />

                  {/* Bookings Blocks */}
                  {bookings.map((b, idx) => {
                    const isCompleted = b.status === 'COMPLETED';
                    const isActive = b.status === 'ACTIVE';

                    const colorClass = isActive 
                      ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-xs' 
                      : isCompleted 
                      ? 'bg-slate-300 text-slate-700 hover:bg-slate-400' 
                      : 'bg-blue-500 text-white hover:bg-blue-600 shadow-xs';

                    return (
                      <div
                        key={idx}
                        className={`absolute top-1 bottom-1 rounded-md px-1.5 flex items-center text-[10px] font-medium truncate cursor-pointer transition-colors z-10 ${colorClass}`}
                        style={{
                          left: `${b.leftPct}%`,
                          width: `${b.widthPct}%`
                        }}
                        title={`${b.user_name} (${b.startFormatted} - ${b.endFormatted}): ${b.usage_details || 'ใช้งาน'}`}
                      >
                        <span className="truncate">{b.user_name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
