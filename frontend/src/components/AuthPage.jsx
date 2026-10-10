import React, { useState, useRef } from 'react';
import client from '../api/client';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthPage({ onLoginSuccess, onBackToHome }) {
  // Views: 'login' | 'register_email' | 'register_otp' | 'register_details'
  const [view, setView] = useState('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Register state
  const [regEmail, setRegEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // OTP state (6 digits)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpNotice, setOtpNotice] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const otpInputRefs = useRef([]);

  // Registration profile details state
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    nickname: '',
    gender: 'ชาย',
    std_id: '',
    password: '',
    confirm_password: '',
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [profileError, setProfileError] = useState('');

  // ====================== 1. LOGIN HANDLER ======================
  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoginError('');

    if (!loginEmail.trim()) {
      setLoginError('กรุณากรอกอีเมล');
      return;
    }
    if (!loginPassword) {
      setLoginError('กรุณากรอกรหัสผ่าน');
      return;
    }

    setLoading(true);
    try {
      const res = await client.post('/accounts/login/', {
        email: loginEmail.trim(),
        password: loginPassword,
      });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      localStorage.setItem('user_info', JSON.stringify(res.data.user));
      onLoginSuccess(res.data.user);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail) {
        setLoginError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else {
        setLoginError(err.response?.data?.error || 'รหัสผ่านจะต้องมีอักขระและตัวเลขอย่างน้อย 8 ตัว');
      }
    } finally {
      setLoading(false);
    }
  };

  // ====================== 2. REGISTER STEP 1: EMAIL ======================
  const handleEmailSubmit = async (e) => {
    e?.preventDefault();
    setEmailError('');

    const emailPattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    const trimmedEmail = regEmail.trim();
    if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
      setEmailError('อีเมลไม่ถูกต้อง');
      return;
    }

    setLoading(true);
    try {
      const res = await client.post('/accounts/send-otp/', { email: trimmedEmail });
      setOtpNotice(res.data.message);
      if (res.data.otp) {
        setDevOtp(res.data.otp);
      } else {
        setDevOtp('');
      }
      setView('register_otp');
    } catch (err) {
      setEmailError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการส่ง OTP');
    } finally {
      setLoading(false);
    }
  };

  // ====================== 3. REGISTER STEP 2: OTP ======================
  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pasted = value.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      pasted.forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setOtpDigits(newDigits);
      const nextIdx = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    // Auto advance to next box
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async (e) => {
    e?.preventDefault();
    setOtpError('');
    const otpValue = otpDigits.join('');

    if (otpValue.length !== 6) {
      setOtpError('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก');
      return;
    }

    setLoading(true);
    try {
      await client.post('/accounts/verify-otp/', {
        email: regEmail.trim(),
        otp: otpValue,
      });
      setView('register_details');
    } catch (err) {
      setOtpError(err.response?.data?.error || 'รหัส OTP ไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError('');
    try {
      const res = await client.post('/accounts/send-otp/', { email: regEmail.trim() });
      setOtpNotice(res.data.message);
      if (res.data.otp) setDevOtp(res.data.otp);
    } catch (err) {
      setOtpError(err.response?.data?.error || 'ไม่สามารถส่ง OTP ใหม่ได้');
    }
  };

  // ====================== 4. REGISTER STEP 3: DETAILS ======================
  const handleProfileSubmit = async (e) => {
    e?.preventDefault();
    setProfileError('');

    if (!profileData.first_name.trim() || !profileData.last_name.trim() || !profileData.std_id.trim()) {
      setProfileError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (profileData.std_id.trim().length !== 13) {
      setProfileError('รหัสนักศึกษาต้องมีความยาว 13 หลัก');
      return;
    }

    if (!profileData.password) {
      setProfileError('กรุณากำหนดรหัสผ่าน');
      return;
    }

    const hasChar = /[A-Za-z]/.test(profileData.password);
    const hasNum = /[0-9]/.test(profileData.password);
    if (profileData.password.length < 8 || !hasChar || !hasNum) {
      setProfileError('รหัสผ่านจะต้องมีอักขระและตัวเลขอย่างน้อย 8 ตัว');
      return;
    }

    if (profileData.confirm_password && profileData.password !== profileData.confirm_password) {
      setProfileError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);
    try {
      const genderVal = profileData.gender === 'หญิง' ? 'female' : 'male';
      await client.post('/accounts/register/', {
        email: regEmail.trim(),
        password: profileData.password,
        first_name: profileData.first_name.trim(),
        last_name: profileData.last_name.trim(),
        nickname: profileData.nickname.trim(),
        std_id: profileData.std_id.trim(),
        gender: genderVal,
      });

      // Auto login after successful registration
      const loginRes = await client.post('/accounts/login/', {
        email: regEmail.trim(),
        password: profileData.password,
      });
      localStorage.setItem('access_token', loginRes.data.access);
      localStorage.setItem('refresh_token', loginRes.data.refresh);
      localStorage.setItem('user_info', JSON.stringify(loginRes.data.user));
      onLoginSuccess(loginRes.data.user);
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.std_id) setProfileError(`รหัสนักศึกษา: ${resp.std_id[0]}`);
      else if (resp?.email) setProfileError(`อีเมล: ${resp.email[0]}`);
      else if (resp?.password) setProfileError(`รหัสผ่าน: ${resp.password[0]}`);
      else if (resp?.error) setProfileError(resp.error);
      else setProfileError('เกิดข้อผิดพลาดในการลงทะเบียน');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      {/* Return to Home button in top corner */}
      <button
        onClick={onBackToHome}
        className="absolute top-6 left-6 text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1.5 transition cursor-pointer"
      >
        ← กลับหน้าหลัก
      </button>

      {/* HEADER: KMUTNB LOGO + TEXT (อิงตามรูปทุกใบ) */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
          <img
            src="https://upload.wikimedia.org/wikipedia/th/1/1b/KMUTNB_Logo.png"
            alt="KMUTNB Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
          ระบบจองสนามกีฬา ตึก 40 KMUTNB
        </h2>
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: LOGIN (รูปที่ 5 และ รูปที่ 2)                           */}
      {/* ============================================================== */}
      {view === 'login' && (
        <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
          <div>
            <label className="block text-sm text-gray-900 mb-1">อีเมล</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full border border-black px-3 py-2 text-sm bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-900 mb-1">รหัสผ่าน</label>
            <div className="relative">
              <input
                type={showLoginPassword ? 'text' : 'password'}
                name="password"
                id="login-password"
                autoComplete="current-password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full border border-black px-3 py-2 pr-9 text-sm bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-800"
                tabIndex={-1}
              >
                {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* ข้อความ error สีแดงใต้รหัสผ่านตามรูปที่ 2 */}
            {loginError && (
              <p className="text-red-600 text-xs mt-1.5 leading-snug">
                {loginError}
              </p>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setView('register_email');
                setEmailError('');
              }}
              className="text-gray-400 hover:text-gray-600 underline text-sm transition cursor-pointer"
            >
              ยังไม่มี account?
            </button>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="border border-black px-6 py-1.5 text-sm font-medium text-black bg-white hover:bg-black hover:text-white transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'ยืนยัน'}
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: REGISTER STEP 1 - กรอกอีเมล (รูปที่ 4)                    */}
      {/* ============================================================== */}
      {view === 'register_email' && (
        <form onSubmit={handleEmailSubmit} className="w-full max-w-xs space-y-4">
          <div>
            <label className="block text-sm text-gray-900 mb-1">กรอกอีเมล</label>
            <input
              type="email"
              name="reg_email"
              autoComplete="email"
              required
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              className="w-full border border-black px-3 py-2 text-sm bg-white focus:outline-none"
            />
            {/* ข้อความ error สีแดง: อีเมลไม่ถูกต้อง ตามรูปที่ 4 */}
            {emailError && (
              <p className="text-red-600 text-xs mt-1.5">{emailError}</p>
            )}
          </div>

          <div className="flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => setView('login')}
              className="text-gray-400 hover:text-gray-600 underline cursor-pointer"
            >
              มี account แล้ว? เข้าสู่ระบบ
            </button>
          </div>

          <div className="pt-3 flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="border border-black px-6 py-1.5 text-sm font-medium text-black bg-white hover:bg-black hover:text-white transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'กำลังส่ง OTP...' : 'ยืนยัน'}
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* VIEW 3: REGISTER STEP 2 - กรอก OTP (รูปที่ 1)                    */}
      {/* ============================================================== */}
      {view === 'register_otp' && (
        <form onSubmit={handleOtpSubmit} className="w-full max-w-sm space-y-4 flex flex-col items-center">
          <h3 className="text-sm font-medium text-gray-900 mb-2">กรอก OTP</h3>

          {/* 6 Square Input Boxes */}
          <div className="flex gap-2 justify-center">
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (otpInputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e.key)}
                className="w-9 h-12 text-center text-lg font-bold border border-black bg-white focus:outline-none"
              />
            ))}
          </div>

          {/* Error & Info Message */}
          {otpError && <p className="text-red-600 text-xs">{otpError}</p>}
          {otpNotice && !otpError && (
            <p className="text-emerald-700 text-xs text-center">{otpNotice}</p>
          )}

          {/* ถ้ายังไม่ได้ตั้งค่า SMTP จะแสดงรหัสทดสอบให้ที่นี่ */}
          {devOtp && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-1.5 rounded">
              💡 รหัส OTP สำหรับทดสอบ: <strong className="text-red-700 font-mono text-sm tracking-widest">{devOtp}</strong>
            </div>
          )}

          {/* Link: ยังไม่ได้รับ OTP ? ส่งใหม่อีกครั้ง */}
          <div>
            <button
              type="button"
              onClick={handleResendOtp}
              className="text-gray-400 hover:text-gray-600 underline text-xs transition cursor-pointer"
            >
              ยังไม่ได้รับ OTP ? ส่งใหม่อีกครั้ง
            </button>
          </div>

          <div className="pt-3 flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="border border-black px-6 py-1.5 text-sm font-medium text-black bg-white hover:bg-black hover:text-white transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'กำลังตรวจสอบ...' : 'ยืนยัน'}
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* VIEW 4: REGISTER STEP 3 - ข้อมูลส่วนตัว (รูปที่ 3)                */}
      {/* ============================================================== */}
      {view === 'register_details' && (
        <form onSubmit={handleProfileSubmit} className="w-full max-w-md space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* ซ้าย: ชื่อ */}
            <div>
              <label className="block text-sm text-gray-900 mb-1">ชื่อ</label>
              <input
                type="text"
                required
                value={profileData.first_name}
                onChange={(e) =>
                  setProfileData({ ...profileData, first_name: e.target.value })
                }
                className="w-full border border-black px-3 py-1.5 text-sm bg-white focus:outline-none"
              />
            </div>

            {/* ขวา: นามสกุล */}
            <div>
              <label className="block text-sm text-gray-900 mb-1">นามสกุล</label>
              <input
                type="text"
                required
                value={profileData.last_name}
                onChange={(e) =>
                  setProfileData({ ...profileData, last_name: e.target.value })
                }
                className="w-full border border-black px-3 py-1.5 text-sm bg-white focus:outline-none"
              />
            </div>

            {/* ซ้าย: ชื่อเล่น */}
            <div>
              <label className="block text-sm text-gray-900 mb-1">ชื่อเล่น</label>
              <input
                type="text"
                value={profileData.nickname}
                onChange={(e) =>
                  setProfileData({ ...profileData, nickname: e.target.value })
                }
                className="w-full border border-black px-3 py-1.5 text-sm bg-white focus:outline-none"
              />
            </div>

            {/* ขวา: เพศ */}
            <div>
              <label className="block text-sm text-gray-900 mb-1">เพศ</label>
              <select
                value={profileData.gender}
                onChange={(e) =>
                  setProfileData({ ...profileData, gender: e.target.value })
                }
                className="w-full border border-black px-3 py-2 text-sm bg-white focus:outline-none cursor-pointer"
              >
                <option value="ชาย">ชาย</option>
                <option value="หญิง">หญิง</option>
              </select>
            </div>

            {/* ซ้าย: อีเมล */}
            <div>
              <label className="block text-sm text-gray-900 mb-1">อีเมล</label>
              <input
                type="email"
                value={regEmail}
                readOnly
                placeholder="abc@grfwfrw.com"
                className="w-full border border-black px-3 py-1.5 text-sm bg-gray-50 text-gray-600 focus:outline-none"
              />
            </div>

            {/* ขวา: รหัสนักศึกษา */}
            <div>
              <label className="block text-sm text-gray-900 mb-1">
                รหัสนักศึกษา
              </label>
              <input
                type="text"
                required
                maxLength={13}
                value={profileData.std_id}
                onChange={(e) =>
                  setProfileData({ ...profileData, std_id: e.target.value })
                }
                className="w-full border border-black px-3 py-1.5 text-sm bg-white focus:outline-none"
              />
            </div>

            {/* ซ้าย: กำหนดรหัสผ่าน */}
            <div>
              <label className="block text-sm text-gray-900 mb-1">
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={profileData.password}
                  onChange={(e) =>
                    setProfileData({ ...profileData, password: e.target.value })
                  }
                  placeholder="≥ 8 ตัว (อักขระ+เลข)"
                  className="w-full border border-black px-3 py-1.5 pr-8 text-sm bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-2 top-2 text-gray-500 hover:text-gray-800"
                  tabIndex={-1}
                >
                  {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* ขวา: ยืนยันรหัสผ่าน */}
            <div>
              <label className="block text-sm text-gray-900 mb-1">
                ยืนยันรหัสผ่าน
              </label>
              <input
                type={showRegPassword ? 'text' : 'password'}
                required
                value={profileData.confirm_password}
                onChange={(e) =>
                  setProfileData({ ...profileData, confirm_password: e.target.value })
                }
                placeholder="กรอกรหัสผ่านซ้ำ"
                className="w-full border border-black px-3 py-1.5 text-sm bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Error Message */}
          {profileError && (
            <p className="text-red-600 text-xs text-center mt-2 leading-snug">{profileError}</p>
          )}

          <div className="pt-3 flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="border border-black px-6 py-1.5 text-sm font-medium text-black bg-white hover:bg-black hover:text-white transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'กำลังบันทึก...' : 'ยืนยัน'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
