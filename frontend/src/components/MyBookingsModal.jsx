import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { X, Calendar, Clock, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function MyBookingsModal({ isOpen, onClose, onRefreshStatus }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await client.get('/courts/my-bookings/');
      setBookings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBookings();
      setMsg('');
    }
  }, [isOpen]);

  const handleCancel = async (id) => {
    if (!window.confirm('คุณต้องการยกเลิกการจองนี้ใช่หรือไม่?')) return;
    try {
      await client.post(`/courts/cancel/${id}/`);
      setMsg('ยกเลิกการจองสำเร็จแล้ว');
      fetchBookings();
      onRefreshStatus();
    } catch (err) {
      alert(err.response?.data?.message || 'ไม่สามารถยกเลิกได้');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-base font-bold text-gray-900 border-b pb-2 mb-4">
          ประวัติและรายการจองของฉัน
        </h3>

        {msg && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-6 text-sm text-gray-500">กำลังโหลดรายการ...</div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-400">ยังไม่มีประวัติการจองสนาม</div>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 p-3 bg-gray-50/50 hover:bg-gray-50"
              >
                <div>
                  <div className="font-semibold text-sm text-gray-800">
                    {b.court_detail?.name}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {b.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)} น.
                    </span>
                  </div>
                  <div className="mt-1">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        b.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-500 line-through'
                      }`}
                    >
                      {b.status === 'confirmed' ? 'ยืนยันการจอง' : 'ยกเลิกแล้ว'}
                    </span>
                  </div>
                </div>

                {b.status === 'confirmed' && (
                  <button
                    onClick={() => handleCancel(b.id)}
                    className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> ยกเลิก
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
