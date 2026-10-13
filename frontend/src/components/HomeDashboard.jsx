import React from 'react';
import { Building2, Clock, MapPin, RefreshCw } from 'lucide-react';
import CalendarPicker from './CalendarPicker';
import CourtImage from './CourtImage';

const sportLabels = {
  futsal: 'สนามฟุตซอลพร้อมใช้งาน',
  basketball: 'แป้นบาสเกตบอลพร้อมใช้งาน',
  volleyball: 'สนามวอลเลย์บอลพร้อมใช้งาน',
  badminton: 'สนามแบดมินตันพร้อมใช้งาน',
};

function CourtCard({ court, onCourtClick }) {
  return (
    <article
      data-testid={`court-card-${court.id}`}
      className={`overflow-hidden rounded-2xl border border-[#9db4d3] bg-white shadow-[0_2px_8px_rgba(36,70,110,0.08)] transition ${court.is_available ? 'hover:-translate-y-0.5 hover:shadow-md' : ''}`}
    >
      <button
        type="button"
        onClick={() => onCourtClick(court)}
        className="block w-full text-left disabled:cursor-default"
        disabled={!court.is_available}
        aria-label={`${court.name} ${court.status_text}`}
      >
        <div className="h-56 overflow-hidden sm:h-64">
          <CourtImage court={court} />
        </div>
        <div className="p-5">
          <h3 className="text-base font-bold text-slate-900">{court.name}</h3>
          <p className="mt-1.5 text-xs text-slate-400">
            {court.is_available
              ? (sportLabels[court.sport_type] || 'พร้อมใช้งานสำหรับการจอง')
              : 'ไม่ว่างสำหรับช่วงเวลานี้'}
          </p>
          <div className="mt-5 flex items-center justify-between">
            <span className={`flex items-center gap-2 text-xs font-semibold ${court.is_available ? 'text-emerald-600' : 'text-red-600'}`}>
              <span className={`h-2 w-2 rounded-full ${court.is_available ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {court.status_text}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-500">
              <MapPin className="h-3.5 w-3.5" />
              ชั้น {court.floor}
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}

function FloorSection({ floor, courts, onCourtClick }) {
  const availableCount = courts.filter((court) => court.is_available).length;
  const fullCount = courts.length - availableCount;

  return (
    <section className="mt-7" aria-labelledby={`floor-${floor}-title`}>
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#9db4d3] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(36,70,110,0.06)]">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-50 p-2 text-blue-500"><Building2 className="h-4 w-4" /></span>
          <div>
            <h2 id={`floor-${floor}-title`} className="text-base font-bold text-slate-800">ชั้น {floor}</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">สนามทุกชนิดและสถานะล่าสุด</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-orange-50 px-3 py-1.5 text-[11px] font-semibold text-orange-500">
          {availableCount} สนามว่าง • {fullCount} สนามเต็ม
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        {courts.map((court) => (
          <CourtCard key={court.id} court={court} onCourtClick={onCourtClick} />
        ))}
      </div>
    </section>
  );
}

export default function HomeDashboard({
  data,
  loading,
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  onRefresh,
  onCourtClick,
  bookingSummary,
}) {
  return (
    <main id="courts" className="mx-auto max-w-6xl px-4 pb-10">
      <section className="mt-6 rounded-2xl border border-[#9db4d3] bg-white px-6 py-7 shadow-[0_2px_8px_rgba(36,70,110,0.06)]">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">sport court status</h2>
            <p className="mt-2 text-xs text-slate-400">เลือกสนามและเวลาที่ต้องการจอง</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <CalendarPicker
              selectedDate={selectedDate}
              allowedDates={data?.allowed_dates || []}
              onSelectDate={onDateChange}
            />
            <label className="flex items-center gap-2 rounded-lg border border-[#9db4d3] bg-white px-3 py-2.5 text-xs font-semibold text-slate-700">
              <Clock className="h-4 w-4" />
              <span className="sr-only">เลือกเวลา</span>
              <select value={selectedTime} onChange={onTimeChange} className="bg-transparent outline-none">
                {data?.time_slots?.map((time) => (
                  <option key={time} value={time}>{time} - {String(Number(time.slice(0, 2)) + 1).padStart(2, '0')}:00</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={onRefresh} aria-label="รีเฟรชข้อมูล" className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {bookingSummary}

      <FloorSection floor="3" courts={data?.floor_3 || []} onCourtClick={onCourtClick} />
      <FloorSection floor="7" courts={data?.floor_7 || []} onCourtClick={onCourtClick} />
    </main>
  );
}
