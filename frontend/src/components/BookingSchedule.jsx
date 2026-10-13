import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Clock } from 'lucide-react';
import client from '../api/client';
import CalendarPicker from './CalendarPicker';
import CourtImage from './CourtImage';

const nextHour = (slot) => `${String(Number(slot.slice(0, 2)) + 1).padStart(2, '0')}:00`;

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
}

function ScheduleCourt({ court, date, selectedTime, userHasBooking, onSelectSlot }) {
  const slots = selectedTime
    ? court.available_slots.filter((slot) => slot === selectedTime)
    : court.available_slots;

  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <div className="h-24 w-full max-w-36 overflow-hidden rounded-lg bg-slate-50">
        <CourtImage court={court} />
      </div>
      <h3 className="mt-3 text-xs font-bold text-slate-900">{court.name}</h3>
      <div className="mt-3 flex flex-col items-center gap-2">
        {userHasBooking ? (
          <button
            type="button"
            disabled
            className="max-w-36 cursor-not-allowed rounded-md bg-slate-200 px-2.5 py-2 text-[11px] font-semibold leading-relaxed text-slate-500"
          >วันนี้สิทธิ์การจองของคุณหมดแล้ว</button>
        ) : slots.length ? slots.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => onSelectSlot(court, date, slot)}
            aria-label={`จอง ${court.name} วันที่ ${formatDate(date)} เวลา ${slot} - ${nextHour(slot)}`}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-600 hover:border-blue-400 hover:bg-blue-100"
          >
            {slot} - {nextHour(slot)}
          </button>
        )) : (
          <span className="rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-600">
            {selectedTime ? 'ไม่ว่างช่วงนี้' : 'ไม่มีช่วงเวลาว่าง'}
          </span>
        )}
      </div>
    </div>
  );
}

export default function BookingSchedule({ refreshKey, onSelectSlot, bookingSummary }) {
  const [schedule, setSchedule] = useState({ dates: [], time_slots: [] });
  const [floor, setFloor] = useState('3');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    client.get('/courts/schedule/')
      .then((response) => { if (active) setSchedule(response.data); })
      .catch(() => { if (active) setError('โหลดตารางจองไม่สำเร็จ กรุณาลองใหม่'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  const visibleDates = useMemo(() => (
    selectedDate ? schedule.dates.filter((item) => item.date === selectedDate) : schedule.dates
  ), [schedule.dates, selectedDate]);
  const allowedDates = schedule.dates.map((item) => item.date);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-12">
      <div role="tablist" aria-label="เลือกชั้น" className="mt-6 flex gap-3">
        {['3', '7'].map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={floor === value}
            onClick={() => setFloor(value)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold ${floor === value ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-[#6f91bd] bg-white text-slate-800'}`}
          >ชั้น {value}</button>
        ))}
      </div>

      <section className="mt-7 rounded-2xl border border-[#9db4d3] bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="rounded-lg bg-blue-50 p-3 text-blue-500"><Building2 className="h-5 w-5" /></span>
            <div>
              <h2 className="text-2xl font-bold">จองสนามกีฬา ชั้น {floor}</h2>
              <p className="mt-2 text-xs text-slate-400">เลือกสนามและเวลาที่ต้องการจอง</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CalendarPicker selectedDate={selectedDate} allowedDates={allowedDates} onSelectDate={setSelectedDate} />
            <label className="flex items-center gap-2 rounded-lg border border-[#9db4d3] px-3 py-2.5 text-xs font-semibold">
              <Clock className="h-4 w-4" />
              <span className="sr-only">เลือกเวลา</span>
              <select value={selectedTime} onChange={(event) => setSelectedTime(event.target.value)} className="bg-transparent outline-none">
                <option value="">ทุกเวลา</option>
                {schedule.time_slots.map((slot) => <option key={slot} value={slot}>{slot} - {nextHour(slot)}</option>)}
              </select>
            </label>
          </div>
        </div>
      </section>

      {bookingSummary}

      {loading && <p className="py-12 text-center text-sm text-slate-500">กำลังโหลดตารางจอง...</p>}
      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!loading && !error && (
        <div role="tabpanel" className="space-y-6 pt-6">
          {visibleDates.map((day) => {
            const courts = day.courts.filter((court) => court.floor === floor);
            return (
              <section key={day.date} className="rounded-2xl border border-[#b9cce5] bg-white p-5 shadow-sm">
                <h3 className="text-base font-bold">{formatDate(day.date)}</h3>
                <div className="mt-6 grid grid-cols-2 gap-7 sm:grid-cols-3 lg:grid-cols-6">
                  {courts.map((court) => (
                    <ScheduleCourt key={court.id} court={court} date={day.date} selectedTime={selectedTime} userHasBooking={day.user_has_booking} onSelectSlot={onSelectSlot} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
