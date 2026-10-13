import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { BasketballGraphic, BadmintonGraphic, FutsalGraphic, VolleyballGraphic } from './CourtGraphics';
import { Calendar, CheckCircle2, Clock, MapPin } from 'lucide-react';

export default function BookingModal({
  court,
  date,
  time,
  currentUser,
  isOpen,
  onClose,
  onOpenLogin,
  onBookingSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [court?.id, date, isOpen, time]);

  if (!isOpen || !court) return null;

  const handleConfirmBooking = async () => {
    if (!currentUser) {
      onClose();
      onOpenLogin();
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await client.post('/courts/book/', {
        court: court.id,
        date: date,
        start_time: time,
      });
      setSuccessMsg(res.data.message || 'จองสนามสำเร็จเรียบร้อยแล้ว');
      await onBookingSuccess({ court, date, time });
    } catch (err) {
      setSuccessMsg('');
      setErrorMsg(err.response?.data?.error || err.response?.data?.detail || 'ไม่สามารถทำการจองได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const nextHour = `${String(parseInt(time.split(':')[0]) + 1).padStart(2, '0')}:00`;
  const [year, month, day] = date.split('-');
  const displayDate = `${Number(day)}/${month}/${year}`;
  const CourtGraphic = {
    futsal: FutsalGraphic,
    basketball: BasketballGraphic,
    volleyball: VolleyballGraphic,
    badminton: BadmintonGraphic,
  }[court.sport_type] || FutsalGraphic;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f1f3f5]/95 p-3 sm:p-6">
      <section className="max-h-full w-full max-w-xl overflow-y-auto rounded-lg border border-[#9db4d3] bg-white p-5 shadow-sm sm:p-7">
        {successMsg ? (
          <div className="flex min-h-52 flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-400 sm:h-20 sm:w-20" strokeWidth={2.5} />
            <h2 className="mt-3 text-lg font-bold text-slate-900">การจองสำเร็จ</h2>
            <p className="mt-1 text-xs text-slate-500">ข้อมูลการจองของคุณถูกบันทึกแล้ว</p>
            <button type="button" onClick={onClose} className="mt-5 rounded-md bg-[#ff8733] px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-[#f47a27]">กลับสู่หน้าหลัก</button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">ยืนยันการจองสนาม</h2>
                <p className="mt-1 text-[11px] text-slate-400">ตรวจสอบรายละเอียดก่อนทำรายการยืนยัน</p>
              </div>
              <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-semibold text-orange-700">รายการใหม่</span>
            </div>

            <div className="my-4 flex h-36 items-center justify-center overflow-hidden rounded-md bg-white sm:h-40">
              <div className="w-full max-w-xs scale-90 sm:scale-100"><CourtGraphic /></div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">{court.name}</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">ชั้น {court.floor} · สนามกีฬา</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
                <div className="flex items-center gap-1 text-blue-700"><Calendar className="h-3 w-3" />วันที่</div>
                <strong className="mt-1 block text-slate-800">{displayDate}</strong>
              </div>
              <div className="rounded-md border border-orange-100 bg-orange-50 px-3 py-2">
                <div className="flex items-center gap-1 text-orange-700"><Clock className="h-3 w-3" />เวลา</div>
                <strong className="mt-1 block text-slate-800">{time} - {nextHour}</strong>
              </div>
            </div>

            <p className="mt-4 text-center text-sm font-semibold leading-relaxed text-slate-900">
              คุณต้องการยืนยันจอง{court.name} ในวันที่ {displayDate}<br className="hidden sm:block" /> เวลา {time} - {nextHour} ใช่หรือไม่?
            </p>

            {errorMsg && <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorMsg}</p>}

            <div className="mt-4 flex justify-center gap-2">
              <button type="button" onClick={onClose} disabled={loading} className="rounded-md border border-[#9db4d3] bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">ต้องการแก้ไขข้อมูล</button>
              {currentUser ? (
                <button type="button" disabled={loading} onClick={handleConfirmBooking} className="rounded-md bg-[#ff8733] px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-[#f47a27] disabled:cursor-wait disabled:opacity-60">
                  {loading ? 'กำลังบันทึก...' : 'ยืนยัน'}
                </button>
              ) : (
                <button type="button" onClick={() => { onClose(); onOpenLogin(); }} className="rounded-md bg-[#ff8733] px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-[#f47a27]">เข้าสู่ระบบเพื่อจอง</button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
