import React, { useState, useEffect, useRef } from 'react';
import client from './api/client';
import {
  FutsalGraphic,
  BasketballGraphic,
  VolleyballGraphic,
  BadmintonGraphic,
} from './components/CourtGraphics';
import BookingModal from './components/BookingModal';
import MyBookingsModal from './components/MyBookingsModal';
import CalendarPicker from './components/CalendarPicker';
<<<<<<< HEAD
import Login from './pages/Login';
import Register from './pages/Register';
import Otp from './pages/Otp';
import Profile from './pages/Profile';
=======
import AuthPage from './components/AuthPage';
>>>>>>> 0752bc7c212cc2bed2abdfc2ec54c0e3a633a5b1
import { Calendar, Clock, User, LogOut, Bookmark, RefreshCw, ChevronDown } from 'lucide-react';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('08:00');
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'login'

  // Modals state
  const [authPage, setAuthPage] = useState(null);
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [isMyBookingsOpen, setIsMyBookingsOpen] = useState(false);
  const [selectedCourtForBooking, setSelectedCourtForBooking] = useState(null);
  const [activePage, setActivePage] = useState('home');
  const statusRequestId = useRef(0);

  // User state
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('user_info');
    return saved ? JSON.parse(saved) : null;
  });

  const fetchStatus = async (dateVal = selectedDate, timeVal = selectedTime) => {
    const requestId = ++statusRequestId.current;
    setLoading(true);
    try {
      const params = {};
      if (dateVal) params.date = dateVal;
      if (timeVal) params.time = timeVal;
      const res = await client.get('/courts/status/', { params });
      if (requestId !== statusRequestId.current) return;
      setData(res.data);
      if (!dateVal) setSelectedDate(res.data.selected_date);
    } catch (err) {
      if (requestId === statusRequestId.current) console.error("Error fetching court status:", err);
    } finally {
      if (requestId === statusRequestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleDateChange = (e) => {
    const val = e.target.value;
    setSelectedDate(val);
    fetchStatus(val, selectedTime);
  };

  const handleTimeChange = (e) => {
    const val = e.target.value;
    setSelectedTime(val);
    fetchStatus(selectedDate, val);
  };

  const handleCourtClick = (court) => {
    if (!court.is_available) {
      alert(`สนาม "${court.name}" ถูกจองแล้วในช่วงเวลา ${selectedTime} น.`);
      return;
    }
    setSelectedCourtForBooking(court);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
    setCurrentUser(null);
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setActivePage('home');
    setAuthPage(null);
    setPendingRegistration(null);
  };

  const handleProfileUpdate = (user) => {
    setCurrentUser(user);
    localStorage.setItem('user_info', JSON.stringify(user));
  };

  const handleBookingSuccess = async ({ court, date, time }) => {
    setSelectedDate(date);
    setSelectedTime(time);
    await fetchStatus(date, time);
    setData((currentData) => {
      if (!currentData) return currentData;
      const floorKey = String(court.floor) === '3' ? 'floor_3' : 'floor_7';
      return {
        ...currentData,
        [floorKey]: currentData[floorKey]?.map((item) => (
          item.id === court.id
            ? { ...item, is_available: false, status_text: 'เต็ม' }
            : item
        )),
      };
    });
  };

  // Courts separation for Floor 3
  const futsalCourt = data?.floor_3?.find((c) => c.sport_type === 'futsal');
  const basketballCourts = data?.floor_3?.filter((c) => c.sport_type === 'basketball') || [];

  // Courts separation for Floor 7
  const volleyballCourt = data?.floor_7?.find((c) => c.sport_type === 'volleyball');
  const badmintonCourts = data?.floor_7?.filter((c) => c.sport_type === 'badminton') || [];

<<<<<<< HEAD
  if (authPage === 'login') {
    return (
      <Login
        onBack={() => setAuthPage(null)}
        onRegister={() => setAuthPage('register')}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  if (authPage === 'register') {
    return (
      <Register
        initialData={pendingRegistration}
        onBack={() => setAuthPage('login')}
        onContinue={(registration) => {
          setPendingRegistration(registration);
          setAuthPage('otp');
        }}
        onLogin={() => setAuthPage('login')}
      />
    );
  }

  if (authPage === 'otp') {
    return (
      <Otp
        registration={pendingRegistration}
        onBack={() => setAuthPage('register')}
        onLogin={() => setAuthPage('login')}
        onAuthSuccess={handleAuthSuccess}
=======
  if (currentView === 'login') {
    return (
      <AuthPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setCurrentView('home');
          fetchStatus(selectedDate, selectedTime);
        }}
        onBackToHome={() => setCurrentView('home')}
>>>>>>> 0752bc7c212cc2bed2abdfc2ec54c0e3a633a5b1
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-800 pb-16">
      {/* 1. HEADER (อิงตาม Mockup หัวเว็บ) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-red-700 p-1 flex items-center justify-center shadow-md">
              <img
                src="https://upload.wikimedia.org/wikipedia/th/1/1b/KMUTNB_Logo.png"
                alt="KMUTNB Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                ระบบจองสนามกีฬา ตึก 40 KMUTNB
              </h1>
              <p className="text-xs text-gray-500">มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ</p>
            </div>
          </div>

<<<<<<< HEAD
          <div className="flex items-center">
            {currentUser ? (
              <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => { setActivePage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="rounded-md border border-[#9db4d3] bg-white px-2.5 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 sm:px-3"
                >
                  หน้าหลัก
                </button>
                <button
                  type="button"
                  onClick={() => { setActivePage('home'); document.getElementById('courts')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="rounded-md bg-[#ff8733] px-2.5 py-2 text-[11px] font-semibold text-slate-950 hover:bg-[#ed7424] sm:px-3"
                >
                  จองสนาม
                </button>
                <button
                  type="button"
                  onClick={() => setActivePage('profile')}
                  className={`rounded-md px-2.5 py-2 text-[11px] font-semibold sm:px-3 ${activePage === 'profile' ? 'bg-[#ff8733] text-slate-950' : 'border border-[#9db4d3] bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  โปรไฟล์
                </button>
                <button
                  type="button"
                  onClick={() => setIsMyBookingsOpen(true)}
                  className="flex items-center gap-1 rounded-md border border-[#9db4d3] bg-white px-2.5 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 sm:px-3"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  <span>ประวัติการจอง</span>
                </button>
                <span className="hidden items-center gap-1.5 pl-1 text-xs text-slate-600 md:flex">
                  <User className="h-4 w-4" />
                  {currentUser.first_name || currentUser.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="ออกจากระบบ"
                  title="ออกจากระบบ"
                  className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
=======
          {/* เข้าสู่ระบบ / สมัครสมาชิก หรือ แสดงชื่อผู้ใช้ถ้าล็อกอินแล้ว */}
          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMyBookingsOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  <Bookmark className="w-3.5 h-3.5 text-red-600" />
                  <span>การจองของฉัน</span>
                </button>

                <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg">
                  <img
                    src={currentUser.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=kmutnb'}
                    alt="avatar"
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="text-xs font-semibold text-red-800">
                    {currentUser.first_name} {currentUser.last_name}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  title="ออกจากระบบ"
                  className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100 transition"
                >
                  <LogOut className="w-4 h-4" />
>>>>>>> 0752bc7c212cc2bed2abdfc2ec54c0e3a633a5b1
                </button>
              </div>
            ) : (
              <button
                type="button"
<<<<<<< HEAD
                onClick={() => setAuthPage('login')}
                className="rounded-md bg-[#ff8733] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#ed7424]"
=======
                onClick={() => setCurrentView('login')}
                className="px-5 py-1.5 text-xs font-semibold text-red-600 border border-red-500 rounded-full bg-white shadow-xs hover:bg-red-50 cursor-pointer select-none tracking-wide transition"
>>>>>>> 0752bc7c212cc2bed2abdfc2ec54c0e3a633a5b1
              >
                เข้าสู่ระบบ / สมัครสมาชิก
              </button>
            )}
          </div>
        </div>
      </header>

      {activePage === 'profile' ? (
        <Profile
          user={currentUser}
          onBack={() => setActivePage('home')}
          onProfileUpdate={handleProfileUpdate}
        />
      ) : (
      <main id="courts" className="max-w-6xl mx-auto px-4 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          {/* Status Box Title */}
          <div className="inline-block border border-gray-800 bg-white px-4 py-1.5 rounded shadow-sm">
            <span className="text-sm font-bold tracking-wide text-gray-900">
              sport court status
            </span>
          </div>

          {/* Date & Time Selectors */}
          <div className="flex items-center gap-3">
            {/* เลือกวันที่ (Interactive Calendar Picker รองรับ 5 วันตามเงื่อนไข) */}
            <CalendarPicker
              selectedDate={selectedDate}
              allowedDates={data?.allowed_dates || []}
              onSelectDate={(newDate) => {
                setSelectedDate(newDate);
                fetchStatus(newDate, selectedTime);
              }}
            />

            {/* เลือกเวลา (08:00 - 20:00 ห่างกัน 1 ชม.) */}
            <div className="relative">
              <div className="flex items-center gap-1.5 border border-gray-400 bg-white px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 shadow-sm hover:border-gray-600">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span>เวลา:</span>
                <select
                  value={selectedTime}
                  onChange={handleTimeChange}
                  className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer"
                >
                  {data?.time_slots?.map((t) => (
                    <option key={t} value={t}>
                      {t} - {String(parseInt(t.split(':')[0]) + 1).padStart(2, '0')}:00 น.
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => fetchStatus(selectedDate, selectedTime)}
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 3. SECTION ชั้น 3 (อิงตาม Mockup) */}
        <section className="mt-4">
          <div className="inline-block border border-gray-800 bg-white px-3 py-1 rounded text-xs font-bold text-gray-900 mb-3 shadow-sm">
            ชั้น 3
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ฝั่งซ้าย: สนามฟุตซอล ชั้น 3 */}
            <div className="border border-gray-400 bg-white rounded-lg p-5 flex flex-col justify-between items-center min-h-[380px] shadow-sm">
              <div className="w-full flex-1 flex flex-col items-center justify-center">
                <FutsalGraphic />
                <span className="mt-4 text-xs font-medium text-gray-700">
                  {futsalCourt?.name || 'สนามฟุตซอล ชั้น 3'}
                </span>
              </div>
              <button
                onClick={() => futsalCourt && handleCourtClick(futsalCourt)}
                disabled={!futsalCourt?.is_available}
                className={`mt-4 px-6 py-1 text-xs font-semibold rounded border transition-all ${
                  futsalCourt?.is_available
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white cursor-pointer'
                    : 'border-red-500 text-red-600 bg-red-50 cursor-not-allowed opacity-90'
                }`}
              >
                {futsalCourt?.status_text || 'ว่าง'}
              </button>
            </div>

            {/* ฝั่งขวา: แป้นบาสเกตบอล 1 - 5 ชั้น 3 */}
            <div className="border border-gray-400 bg-white rounded-lg p-5 flex flex-col justify-between min-h-[380px] shadow-sm relative">
              {/* แป้นบาสเกตบอล 1 (ตรงกลางบน) */}
              {basketballCourts[0] && (
                <div className="flex flex-col items-center mx-auto mb-2">
                  <BasketballGraphic />
                  <span className="text-[11px] text-gray-600 mt-1">{basketballCourts[0].name}</span>
                  <button
                    onClick={() => handleCourtClick(basketballCourts[0])}
                    disabled={!basketballCourts[0].is_available}
                    className={`mt-1 px-4 py-0.5 text-[11px] font-semibold rounded border ${
                      basketballCourts[0].is_available
                        ? 'border-emerald-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white'
                        : 'border-red-500 text-red-600 bg-red-50 cursor-not-allowed'
                    }`}
                  >
                    {basketballCourts[0].status_text}
                  </button>
                </div>
              )}

              {/* แป้นบาสเกตบอล 2, 3, 4 (แนวตั้งฝั่งซ้ายกลาง) */}
              <div className="grid grid-cols-2 gap-4 my-auto">
                <div className="space-y-3">
                  {basketballCourts.slice(1, 4).map((court) => (
                    <div key={court.id} className="flex items-center gap-3">
                      <BasketballGraphic />
                      <div className="flex flex-col">
                        <span className="text-[11px] text-gray-600">{court.name}</span>
                        <button
                          onClick={() => handleCourtClick(court)}
                          disabled={!court.is_available}
                          className={`mt-0.5 w-16 py-0.5 text-[11px] font-semibold rounded border ${
                            court.is_available
                              ? 'border-emerald-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white'
                              : 'border-red-500 text-red-600 bg-red-50 cursor-not-allowed'
                          }`}
                        >
                          {court.status_text}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* แป้นบาสเกตบอล 5 (ตรงกลางขวาล่าง) */}
                <div className="flex flex-col items-center justify-end">
                  {basketballCourts[4] && (
                    <div className="flex flex-col items-center">
                      <BasketballGraphic />
                      <span className="text-[11px] text-gray-600 mt-1">{basketballCourts[4].name}</span>
                      <button
                        onClick={() => handleCourtClick(basketballCourts[4])}
                        disabled={!basketballCourts[4].is_available}
                        className={`mt-1 px-4 py-0.5 text-[11px] font-semibold rounded border ${
                          basketballCourts[4].is_available
                            ? 'border-emerald-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white'
                            : 'border-red-500 text-red-600 bg-red-50 cursor-not-allowed'
                        }`}
                      >
                        {basketballCourts[4].status_text}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. SECTION ชั้น 7 (อิงตาม Mockup) */}
        <section className="mt-8">
          <div className="inline-block border border-gray-800 bg-white px-3 py-1 rounded text-xs font-bold text-gray-900 mb-3 shadow-sm">
            ชั้น 7
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ฝั่งซ้าย: สนามวอลเลย์บอล 1 ชั้น 7 */}
            <div className="border border-gray-400 bg-white rounded-lg p-5 flex flex-col justify-between items-center min-h-[380px] shadow-sm">
              <div className="w-full flex-1 flex flex-col items-center justify-center">
                <VolleyballGraphic />
                <span className="mt-4 text-xs font-medium text-gray-700">
                  {volleyballCourt?.name || 'สนามวอลเลย์บอล 1 ชั้น 7'}
                </span>
              </div>
              <button
                onClick={() => volleyballCourt && handleCourtClick(volleyballCourt)}
                disabled={!volleyballCourt?.is_available}
                className={`mt-4 px-6 py-1 text-xs font-semibold rounded border transition-all ${
                  volleyballCourt?.is_available
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white cursor-pointer'
                    : 'border-red-500 text-red-600 bg-red-50 cursor-not-allowed opacity-90'
                }`}
              >
                {volleyballCourt?.status_text || 'ว่าง'}
              </button>
            </div>

            {/* ฝั่งขวา: สนามแบดมินตัน 1 - 4 ชั้น 7 (ตาราง 2x2) */}
            <div className="border border-gray-400 bg-white rounded-lg p-5 grid grid-cols-2 gap-4 min-h-[380px] shadow-sm">
              {badmintonCourts.map((court) => (
                <div
                  key={court.id}
                  className="border border-gray-300 rounded p-3 flex flex-col items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition"
                >
                  <BadmintonGraphic />
                  <span className="text-[11px] text-gray-700 text-center font-medium mt-1">
                    {court.name}
                  </span>
                  <button
                    onClick={() => handleCourtClick(court)}
                    disabled={!court.is_available}
                    className={`mt-2 w-16 py-0.5 text-[11px] font-semibold rounded border transition ${
                      court.is_available
                        ? 'border-emerald-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white'
                        : 'border-red-500 text-red-600 bg-red-50 cursor-not-allowed'
                    }`}
                  >
                    {court.status_text}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      )}



      <BookingModal
        court={selectedCourtForBooking}
        date={selectedDate}
        time={selectedTime}
        currentUser={currentUser}
        isOpen={Boolean(selectedCourtForBooking)}
        onClose={() => setSelectedCourtForBooking(null)}
        onOpenLogin={() => setAuthPage('login')}
        onBookingSuccess={handleBookingSuccess}
      />

      <MyBookingsModal
        isOpen={isMyBookingsOpen}
        onClose={() => setIsMyBookingsOpen(false)}
        onRefreshStatus={() => fetchStatus(selectedDate, selectedTime)}
      />
    </div>
  );
}
