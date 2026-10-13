import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { ArrowLeft, Ban, Calendar, CheckCircle2, Clock, Eye, X } from 'lucide-react';

export default function MyBookingsModal({ isOpen, onClose, onRefreshStatus }) {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get('/courts/my-bookings/');
      setBookings(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'ไม่สามารถโหลดประวัติการจองได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedBooking(null);
      fetchBookings();
    }
  }, [isOpen]);

  const handleCancel = async () => {
    if (!selectedBooking || selectedBooking.status !== 'confirmed') return;
    setCancelling(true);
    setError('');
    try {
      await client.post(`/courts/cancel/${selectedBooking.id}/`);
      const cancelledBooking = { ...selectedBooking, status: 'cancelled' };
      setSelectedBooking(cancelledBooking);
      setBookings((current) => current.map((booking) => (
        booking.id === cancelledBooking.id ? cancelledBooking : booking
      )));
      onRefreshStatus();
    } catch (err) {
      setError(err.response?.data?.message || 'ไม่สามารถยกเลิกการจองได้');
    } finally {
      setCancelling(false);
    }
  };

  if (!isOpen) return null;

  const formattedDate = selectedBooking
    ? new Date(`${selectedBooking.date}T00:00:00`).toLocaleDateString('en-GB')
    : '';
  const startTime = selectedBooking?.start_time?.slice(0, 5);
  const endTime = selectedBooking?.end_time?.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f1f3f5] p-3 sm:p-6">
      <section className="relative max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border border-[#9db4d3] bg-white px-5 py-5 shadow-sm sm:px-8 sm:py-7">
        <button type="button" onClick={onClose} aria-label="ปิดประวัติการจอง" className="absolute right-4 top-4 rounded-md p-2 text-slate-500 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>

        {selectedBooking ? (
          <>
            <button type="button" onClick={() => setSelectedBooking(null)} className="mb-4 flex items-center gap-1 text-xs text-slate-600 hover:text-slate-950">
              <ArrowLeft className="h-4 w-4" /> กลับประวัติการจอง
            </button>
            <div className="flex flex-col items-center border-b border-slate-100 pb-5 text-center">
              {selectedBooking.status === 'confirmed' ? (
                <Ban className="h-16 w-16 text-[#ff5b61] sm:h-20 sm:w-20" strokeWidth={2.5} />
              ) : (
                <CheckCircle2 className="h-16 w-16 text-slate-400 sm:h-20 sm:w-20" strokeWidth={2.2} />
              )}
              <h2 className="mt-3 text-lg font-bold text-slate-900">
                {selectedBooking.status === 'confirmed' ? 'ยืนยันการยกเลิกการจอง' : 'ยกเลิกการจองแล้ว'}
              </h2>
              <p className="mt-1 text-xs text-slate-500">ตรวจสอบรายละเอียดการจองก่อนดำเนินการ</p>
              <span className={`mt-3 rounded-full px-3 py-1 text-[10px] font-semibold ${selectedBooking.status === 'confirmed' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                {selectedBooking.status === 'confirmed' ? 'ยืนยันการจองแล้ว' : 'ยกเลิกแล้ว'}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-2 rounded-md bg-slate-50 px-4 py-3 text-xs sm:grid-cols-2">
              <div className="flex justify-between gap-3 sm:block"><dt className="text-slate-500">สนาม</dt><dd className="font-medium text-slate-800">{selectedBooking.court_detail?.name}</dd></div>
              <div className="flex justify-between gap-3 sm:block"><dt className="text-slate-500">วันที่</dt><dd className="font-medium text-slate-800">{formattedDate}</dd></div>
              <div className="flex justify-between gap-3 sm:block"><dt className="text-slate-500">เวลา</dt><dd className="font-medium text-slate-800">{startTime} - {endTime}</dd></div>
              <div className="flex justify-between gap-3 sm:block"><dt className="text-slate-500">หมายเลขการจอง</dt><dd className="font-medium text-slate-800">#{selectedBooking.id}</dd></div>
            </dl>

            {error && <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

            <p className="mt-4 text-center text-sm font-semibold text-slate-900">
              {selectedBooking.status === 'confirmed'
                ? `คุณต้องการยกเลิกการจองสนามนี้ในวันที่ ${formattedDate} เวลา ${startTime} - ${endTime} น. ใช่หรือไม่?`
                : 'รายการนี้ถูกยกเลิกแล้ว และสนามกลับมาเปิดให้จอง'}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {selectedBooking.status === 'confirmed' ? (
                <>
                  <button type="button" disabled={cancelling} onClick={handleCancel} className="rounded-md bg-[#ff8733] px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-[#f47a27] disabled:opacity-60">
                    {cancelling ? 'กำลังยกเลิก...' : 'ยืนยัน'}
                  </button>
                  <button type="button" onClick={() => setSelectedBooking(null)} className="rounded-md border border-[#9db4d3] bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">ย้อนกลับ</button>
                </>
              ) : (
                <button type="button" onClick={() => setSelectedBooking(null)} className="rounded-md border border-[#9db4d3] bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">กลับประวัติการจอง</button>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-4 border-b border-slate-100 pb-3 text-base font-bold text-slate-900">ประวัติการจอง</h2>
            {error && <p role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <div className="max-h-[65vh] space-y-2 overflow-y-auto">
              {loading ? (
                <p className="py-8 text-center text-sm text-slate-500">กำลังโหลดรายการ...</p>
              ) : bookings.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">ยังไม่มีประวัติการจองสนาม</p>
              ) : bookings.map((booking) => (
                <button
                  key={booking.id}
                  type="button"
                  onClick={() => setSelectedBooking(booking)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-[#c4d0df] bg-white p-3 text-left transition-colors hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">{booking.court_detail?.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{booking.date}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)} น.</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {booking.status === 'confirmed' ? 'ยืนยันแล้ว' : 'ยกเลิกแล้ว'}
                    </span>
                    <Eye className="h-4 w-4 text-slate-400" />
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        </section>
    </div>
  );
}
