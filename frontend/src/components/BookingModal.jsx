import React, { useState } from 'react';
import client from '../api/client';
import { X, Calendar, Clock, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';

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
      setTimeout(() => {
        onBookingSuccess();
        onClose();
      }, 1400);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'ไม่สามารถทำการจองได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const nextHour = `${String(parseInt(time.split(':')[0]) + 1).padStart(2, '0')}:00`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-base font-bold text-gray-900 border-b pb-2 mb-4">
          รายละเอียดการจองสนาม
        </h3>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <MapPin className="h-4 w-4 text-red-500 shrink-0" />
            <span className="font-semibold">{court.name} (ชั้น {court.floor})</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
            <span>วันที่: <strong>{date}</strong></span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
            <span>ช่วงเวลา: <strong>{time} - {nextHour} น.</strong> (1 ชั่วโมง)</span>
          </div>

          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 border border-gray-200">
            ⚠️ <strong>เงื่อนไขการใช้งาน:</strong>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>สงวนสิทธิ์การจองได้ 1 ครั้ง / 1 คน / 1 วัน</li>
              <li>สามารถยกเลิกการจองได้ก่อนถึงเวลา</li>
            </ul>
          </div>

          {errorMsg && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          
          {currentUser ? (
            <button
              type="button"
              disabled={loading || successMsg}
              onClick={handleConfirmBooking}
              className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white shadow hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'กำลังบันทึก...' : 'ยืนยันการจอง'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { onClose(); onOpenLogin(); }}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
            >
              เข้าสู่ระบบเพื่อจอง
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
