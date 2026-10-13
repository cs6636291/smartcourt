import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { ArrowLeft, Ban } from 'lucide-react';
import CourtImage from './CourtImage';

function formatBookingDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export default function CurrentBookings({ refreshKey, onChanged }) {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelledBooking, setCancelledBooking] = useState(null);

  useEffect(() => {
    let active = true;
    setError('');
    client.get('/courts/my-bookings/')
      .then((response) => {
        if (active) {
          setBookings(response.data.filter((booking) => booking.status === 'confirmed'));
          setError('');
        }
      })
      .catch(() => { if (active) { setBookings([]); setError('โหลดรายการจองไม่สำเร็จ'); } });
    return () => { active = false; };
  }, [refreshKey]);

  const cancelBooking = async (bookingId) => {
    setCancellingId(bookingId);
    setError('');
    try {
      await client.post(`/courts/cancel/${bookingId}/`);
      setBookings((current) => current.filter((booking) => booking.id !== bookingId));
      setCancelledBooking(selectedBooking);
      setSelectedBooking(null);
      onChanged?.();
    } catch {
      setError('ยกเลิกการจองไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setCancellingId(null);
    }
  };

  if (selectedBooking) {
    const formattedDate = formatBookingDate(selectedBooking.date);
    const startTime = selectedBooking.start_time.slice(0, 5);
    const endTime = selectedBooking.end_time.slice(0, 5);
    return (
      <div data-testid="cancel-booking-backdrop" className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
        <section role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto overscroll-contain rounded-2xl border border-[#9db4d3] bg-white px-6 py-8 shadow-xl sm:px-8 sm:py-10">
          <div className="flex flex-col items-center">
          <Ban className="h-28 w-28 text-[#ff5b61] sm:h-44 sm:w-44" strokeWidth={2.2} aria-hidden="true" />
          <h2 id="cancel-booking-title" className="mt-5 text-center text-2xl font-bold text-slate-900 sm:text-3xl">ยืนยันการยกเลิกการจอง</h2>
          <p className="mt-2 text-sm text-slate-500">กรุณาตรวจสอบรายละเอียดการจองก่อนดำเนินการ</p>
          <span className="mt-4 rounded-full bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-600">• ยกเลิกการจอง</span>
          </div>

        <dl className="mt-6 space-y-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm sm:px-6">
          <div className="flex justify-between gap-4"><dt className="text-slate-500">สนาม</dt><dd className="font-semibold text-slate-900">{selectedBooking.court_detail.name}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-slate-500">วันที่</dt><dd className="font-semibold text-slate-900">{formattedDate}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-slate-500">เวลา</dt><dd className="font-semibold text-slate-900">{startTime} - {endTime}</dd></div>
        </dl>

        <p className="mt-6 text-center text-xl font-bold leading-relaxed text-slate-900 sm:text-2xl">
          คุณต้องการยกเลิกการจอง{selectedBooking.court_detail.name} ในวันที่ {formattedDate} เวลา {startTime} - {endTime} ใช่หรือไม่?
        </p>
        {error && <p role="alert" className="mt-4 text-center text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" disabled={cancellingId === selectedBooking.id} onClick={() => cancelBooking(selectedBooking.id)} className="rounded-xl bg-[#ff8733] px-7 py-3 font-semibold text-slate-950 hover:bg-[#f47a27] disabled:opacity-60">
            {cancellingId === selectedBooking.id ? 'กำลังยกเลิก...' : 'ยืนยัน'}
          </button>
          <button type="button" disabled={cancellingId === selectedBooking.id} onClick={() => { setSelectedBooking(null); setError(''); }} className="rounded-xl border border-[#6f91bd] bg-white px-7 py-3 font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60">ย้อนกลับ</button>
        </div>
        </section>
      </div>
    );
  }

  if (cancelledBooking) {
    return (
      <section className="mt-6 rounded-2xl border border-[#9db4d3] bg-white px-6 py-10 text-center shadow-sm" role="status">
        <h2 className="text-2xl font-bold text-slate-900">ยกเลิกการจองแล้ว</h2>
        <p className="mt-2 text-sm text-slate-500">{cancelledBooking.court_detail.name} • {formatBookingDate(cancelledBooking.date)} • {cancelledBooking.start_time.slice(0, 5)} - {cancelledBooking.end_time.slice(0, 5)}</p>
        <button type="button" onClick={() => setCancelledBooking(null)} className="mt-5 rounded-xl border border-[#6f91bd] bg-white px-6 py-2.5 text-sm font-semibold hover:bg-slate-50">กลับ</button>
      </section>
    );
  }

  if (!bookings.length && !error) return null;

  return (
    <section data-testid="current-bookings" className="mt-6 space-y-3" aria-labelledby="current-bookings-title">
      {bookings.map((booking, index) => (
        <article key={booking.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-[#9db4d3] bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-50">
              <CourtImage court={booking.court_detail} />
            </div>
            <div className="min-w-0">
              {index === 0 && <h2 id="current-bookings-title" className="text-base font-bold">คุณจองแล้ว</h2>}
              <p className="mt-1 text-xs text-slate-600">
                {booking.court_detail.name} • {formatBookingDate(booking.date)} • {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={`ยกเลิกการจอง ${booking.court_detail.name} วันที่ ${formatBookingDate(booking.date)} เวลา ${booking.start_time.slice(0, 5)}`}
            onClick={() => { setError(''); setSelectedBooking(booking); }}
            disabled={cancellingId === booking.id}
            className="shrink-0 rounded-lg border border-[#9db4d3] bg-white px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            {cancellingId === booking.id ? 'กำลังยกเลิก...' : 'ยกเลิกการจอง'}
          </button>
        </article>
      ))}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>}
      {bookings.length > 0 && (
        <p className="rounded-xl bg-orange-50 px-4 py-3 text-xs font-semibold text-orange-600">
          • คุณสามารถจองสนามได้เพียง 1 ครั้ง/วัน
        </p>
      )}
    </section>
  );
}
