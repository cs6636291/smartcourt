import React, { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import client from './api/client';
import BookingModal from './components/BookingModal';
import BookingSchedule from './components/BookingSchedule';
import CurrentBookings from './components/CurrentBookings';
import HomeDashboard from './components/HomeDashboard';
import Login from './pages/Login';
import Otp from './pages/Otp';
import Profile from './pages/Profile';
import Register from './pages/Register';
import RegistrationDetails from './pages/RegistrationDetails';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('08:00');
  const [authPage, setAuthPage] = useState(null);
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [selectedCourtForBooking, setSelectedCourtForBooking] = useState(null);
  const [activePage, setActivePage] = useState('home');
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);
  const statusRequestId = useRef(0);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('user_info');
    return saved ? JSON.parse(saved) : null;
  });

  const fetchStatus = async (dateVal = selectedDate, timeVal = selectedTime) => {
    const requestId = ++statusRequestId.current;
    setLoading(true);
    setStatusError('');
    try {
      const params = {};
      if (dateVal) params.date = dateVal;
      if (timeVal) params.time = timeVal;
      const response = await client.get('/courts/status/', { params });
      if (requestId !== statusRequestId.current) return;
      setData(response.data);
      if (!dateVal) setSelectedDate(response.data.selected_date);
    } catch (error) {
      if (requestId === statusRequestId.current) setStatusError('ไม่สามารถโหลดสถานะสนามได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่');
    } finally {
      if (requestId === statusRequestId.current) setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleLogout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    const access = localStorage.getItem('access_token');
    const logoutRequest = refresh ? client.post('/accounts/logout/', { refresh }, { headers: { Authorization: `Bearer ${access}` } }) : null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
    setCurrentUser(null);
    setActivePage('home');
    setSelectedCourtForBooking(null);
    if (logoutRequest) {
      try { await logoutRequest; } catch { setSessionMessage('ออกจากระบบบนอุปกรณ์นี้แล้ว แต่ไม่สามารถยกเลิกเซสชันที่เซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อ'); }
    }
  };

  useEffect(() => {
    const clearExpiredSession = () => { setCurrentUser(null); setActivePage('home'); setSelectedCourtForBooking(null); setAuthPage('login'); };
    window.addEventListener('session-expired', clearExpiredSession);
    return () => window.removeEventListener('session-expired', clearExpiredSession);
  }, []);

  const handleAuthSuccess = (user) => {
    setSessionMessage('');
    setCurrentUser(user);
    setActivePage('home');
    setAuthPage(null);
    setPendingRegistration(null);
    setData((currentData) => currentData
      ? { ...currentData, user_has_booking: null }
      : currentData);
    fetchStatus(selectedDate, selectedTime);
  };

  const handleOpenCourts = () => {
    setActivePage('booking');
  };

  const handleBookingSuccess = async ({ court, date, time }) => {
    setSelectedDate(date);
    setSelectedTime(time);
    await fetchStatus(date, time);
    setScheduleRefreshKey((current) => current + 1);
    setData((currentData) => {
      if (!currentData) return currentData;
      const floorKey = String(court.floor) === '3' ? 'floor_3' : 'floor_7';
      return {
        ...currentData,
        [floorKey]: currentData[floorKey]?.map((item) => (
          item.id === court.id ? { ...item, is_available: false, status_text: 'จองแล้ว' } : item
        )),
      };
    });
  };

  const handleBookingsChanged = () => {
    setScheduleRefreshKey((current) => current + 1);
    fetchStatus(selectedDate, selectedTime);
  };

  if (authPage === 'login') return <Login onBack={() => setAuthPage(null)} onRegister={() => setAuthPage('register')} onAuthSuccess={handleAuthSuccess} />;
  if (authPage === 'otp') return <Otp registration={pendingRegistration} onBack={() => setAuthPage('register')} onLogin={() => setAuthPage('login')} onVerified={(verified) => { setPendingRegistration(verified); setAuthPage('details'); }} />;
  if (authPage === 'details') {
    return <RegistrationDetails email={pendingRegistration?.email || ''} verificationToken={pendingRegistration?.verification_token} onBack={() => setAuthPage('otp')} onLogin={() => setAuthPage('login')} onAuthSuccess={handleAuthSuccess} />;
  }
  if (authPage === 'register') {
    return (
      <Register
        initialData={pendingRegistration}
        onBack={() => setAuthPage('login')}
        onContinue={(registration) => { setPendingRegistration(registration); setAuthPage('otp'); }}
        onLogin={() => setAuthPage('login')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-16 text-slate-800">
      <div className="relative z-50 mx-auto max-w-6xl px-4 pt-6">
        <header className="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-[#9db4d3] bg-white px-5 py-3 shadow-[0_2px_8px_rgba(36,70,110,0.08)]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-50">
              <img src="/assets/kmutnb-logo.png" alt="KMUTNB Logo" className="h-full w-full object-contain" />
            </div>
            <h1 className="truncate text-sm font-bold text-slate-900 sm:text-lg">ระบบจองสนามกีฬา ตึก 40 KMUTNB</h1>
          </div>

          {currentUser ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActivePage('home')}
                className={`rounded-xl border px-5 py-3 text-xs font-semibold transition-colors ${activePage === 'home' ? 'border-[#ff8733] bg-[#ff8733] text-slate-950' : 'border-[#6f91bd] bg-white text-slate-900 hover:bg-slate-50'}`}
              >หน้าหลัก</button>
              <button type="button" onClick={handleOpenCourts} className={`rounded-xl border px-5 py-3 text-xs font-semibold transition-colors ${activePage === 'booking' ? 'border-[#ff8733] bg-[#ff8733] text-slate-950' : 'border-[#6f91bd] bg-white text-slate-900 hover:bg-slate-50'}`}>จองสนาม</button>
              <button
                type="button"
                onClick={() => setActivePage('profile')}
                className={`rounded-xl border px-5 py-3 text-xs font-semibold transition-colors ${activePage === 'profile' ? 'border-[#ff8733] bg-[#ff8733] text-slate-950' : 'border-[#6f91bd] bg-white text-slate-900 hover:bg-slate-50'}`}
              >โปรไฟล์</button>
              <button type="button" onClick={handleLogout} aria-label="ออกจากระบบ" className="rounded-lg p-2 text-slate-950 hover:bg-slate-100"><LogOut className="h-7 w-7" strokeWidth={2} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => setAuthPage('login')} className="shrink-0 rounded-lg bg-[#ff8733] px-4 py-3 text-[11px] font-semibold text-white transition hover:bg-[#ed7424] sm:px-6 sm:text-xs">เข้าสู่ระบบ / สมัครสมาชิก</button>
          )}
        </header>
      </div>

      {sessionMessage && <p role="status" className="mx-auto mt-4 max-w-6xl px-4 text-sm text-amber-700">{sessionMessage}</p>}
      {statusError && activePage === 'home' && <div role="alert" className="mx-auto mt-4 max-w-6xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{statusError}<button type="button" onClick={() => fetchStatus()} className="ml-3 underline">ลองใหม่</button></div>}

      {activePage === 'profile' ? (
        <Profile user={currentUser} onBack={() => setActivePage('home')} onProfileUpdate={(user) => { setCurrentUser(user); localStorage.setItem('user_info', JSON.stringify(user)); }} />
      ) : activePage === 'booking' ? (
        <BookingSchedule
          refreshKey={scheduleRefreshKey}
          bookingSummary={<CurrentBookings refreshKey={scheduleRefreshKey} onChanged={handleBookingsChanged} />}
          onSelectSlot={(court, date, time) => {
            setSelectedDate(date);
            setSelectedTime(time);
            setSelectedCourtForBooking(court);
          }}
        />
      ) : (
        <HomeDashboard
          data={data}
          loading={loading}
          currentUser={currentUser}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onDateChange={(date) => { setSelectedDate(date); fetchStatus(date, selectedTime); }}
          onTimeChange={(event) => { const time = event.target.value; setSelectedTime(time); fetchStatus(selectedDate, time); }}
          onRefresh={() => fetchStatus(selectedDate, selectedTime)}
          onCourtClick={(court) => court.is_available && setSelectedCourtForBooking(court)}
          bookingSummary={currentUser ? <CurrentBookings refreshKey={scheduleRefreshKey} onChanged={handleBookingsChanged} /> : null}
        />
      )}

      <BookingModal court={selectedCourtForBooking} date={selectedDate} time={selectedTime} currentUser={currentUser} isOpen={Boolean(selectedCourtForBooking)} onClose={() => setSelectedCourtForBooking(null)} onOpenLogin={() => setAuthPage('login')} onBookingSuccess={handleBookingSuccess} />
    </div>
  );
}
