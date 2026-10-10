import React, { useState } from 'react';
import client from '../api/client';
import { X, User, Mail, Lock, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regData, setRegData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    nickname: '',
    std_id: '',
    gender: 'male',
    otp: '',
  });
  const [otpSent, setOtpSent] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await client.post('/accounts/login/', {
        email: loginEmail,
        password: loginPassword,
      });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      localStorage.setItem('user_info', JSON.stringify(res.data.user));
      onAuthSuccess(res.data.user);
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = () => {
    if (!regData.email || !regData.email.includes('@')) {
      setErrorMsg('กรุณากรอกอีเมลให้ถูกต้องเพื่อรับ OTP');
      return;
    }
    setErrorMsg('');
    setOtpSent(true);
    setSuccessMsg('รหัส OTP จำลอง (123456) ถูกส่งไปยังอีเมลของคุณแล้ว');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Requirement validations
    if (regData.password.length < 8) {
      setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (!/[A-Za-z]/.test(regData.password) || !/[0-9]/.test(regData.password)) {
      setErrorMsg('รหัสผ่านต้องประกอบด้วยตัวอักษรและตัวเลขผสมกัน (เช่น abcdefg1234)');
      return;
    }
    if (!regData.std_id || regData.std_id.length !== 13) {
      setErrorMsg('รหัสนักศึกษาต้องมีความยาว 13 หลัก');
      return;
    }
    if (otpSent && regData.otp !== '123456') {
      setErrorMsg('รหัส OTP ไม่ถูกต้อง (ใช้รหัสทดสอบ: 123456)');
      return;
    }

    setLoading(true);
    try {
      await client.post('/accounts/register/', {
        email: regData.email,
        password: regData.password,
        first_name: regData.first_name,
        last_name: regData.last_name,
        nickname: regData.nickname,
        std_id: regData.std_id,
        gender: regData.gender,
      });

      // Auto login after registration
      const loginRes = await client.post('/accounts/login/', {
        email: regData.email,
        password: regData.password,
      });
      localStorage.setItem('access_token', loginRes.data.access);
      localStorage.setItem('refresh_token', loginRes.data.refresh);
      localStorage.setItem('user_info', JSON.stringify(loginRes.data.user));
      onAuthSuccess(loginRes.data.user);
      onClose();
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.email) setErrorMsg(`อีเมล: ${resp.email[0]}`);
      else if (resp?.std_id) setErrorMsg(`รหัสนักศึกษา: ${resp.std_id[0]}`);
      else if (resp?.password) setErrorMsg(`รหัสผ่าน: ${resp.password[0]}`);
      else setErrorMsg('เกิดข้อผิดพลาดในการลงทะเบียน กรุณาตรวจสอบข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Tab Headers */}
        <div className="flex border-b border-gray-200 mb-5">
          <button
            onClick={() => { setIsLoginTab(true); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 pb-3 text-center text-sm font-semibold transition-colors ${
              isLoginTab ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            onClick={() => { setIsLoginTab(false); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 pb-3 text-center text-sm font-semibold transition-colors ${
              !isLoginTab ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            สมัครสมาชิกใหม่
          </button>
        </div>

        {/* Alert Messages */}
        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-xs text-green-700 border border-green-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {isLoginTab ? (
          /* LOGIN FORM */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">อีเมลนักศึกษา</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="เช่น student@kmutnb.ac.th"
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">รหัสผ่าน</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="รหัสผ่านของคุณ"
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs text-amber-800">
              💡 <strong>บัญชีทดสอบเริ่มต้น:</strong><br />
              - นักศึกษา: <code>student@kmutnb.ac.th</code> / <code>student1234</code>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white shadow hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegister} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ชื่อจริง</label>
                <input
                  type="text"
                  required
                  value={regData.first_name}
                  onChange={(e) => setRegData({ ...regData, first_name: e.target.value })}
                  placeholder="สมชาย"
                  className="w-full rounded-lg border border-gray-300 py-1.5 px-2.5 text-xs focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">นามสกุล</label>
                <input
                  type="text"
                  required
                  value={regData.last_name}
                  onChange={(e) => setRegData({ ...regData, last_name: e.target.value })}
                  placeholder="ใจดี"
                  className="w-full rounded-lg border border-gray-300 py-1.5 px-2.5 text-xs focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ชื่อเล่น</label>
                <input
                  type="text"
                  value={regData.nickname}
                  onChange={(e) => setRegData({ ...regData, nickname: e.target.value })}
                  placeholder="กาย"
                  className="w-full rounded-lg border border-gray-300 py-1.5 px-2.5 text-xs focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">เพศ (เลือกรูปเริ่มต้น)</label>
                <select
                  value={regData.gender}
                  onChange={(e) => setRegData({ ...regData, gender: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 py-1.5 px-2 text-xs focus:border-red-500 focus:outline-none"
                >
                  <option value="male">ชาย</option>
                  <option value="female">หญิง</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">รหัสนักศึกษา (13 หลัก ห้ามซ้ำ)</label>
              <input
                type="text"
                required
                maxLength={13}
                value={regData.std_id}
                onChange={(e) => setRegData({ ...regData, std_id: e.target.value })}
                placeholder="6501012345678"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-2.5 text-xs focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">อีเมลสถาบัน</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={regData.email}
                  onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                  placeholder="s6501012345678@kmutnb.ac.th"
                  className="w-full rounded-lg border border-gray-300 py-1.5 px-2.5 text-xs focus:border-red-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="shrink-0 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                >
                  ส่ง OTP
                </button>
              </div>
            </div>

            {otpSent && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> รหัส OTP ยืนยันตัวตน
                </label>
                <input
                  type="text"
                  required
                  value={regData.otp}
                  onChange={(e) => setRegData({ ...regData, otp: e.target.value })}
                  placeholder="กรอก 123456"
                  className="w-full rounded-lg border border-emerald-400 bg-emerald-50/30 py-1.5 px-2.5 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                รหัสผ่าน (≥ 8 ตัว + อักษรและตัวเลข เช่น abcdefg1234)
              </label>
              <input
                type="password"
                required
                value={regData.password}
                onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-2.5 text-xs focus:border-red-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-red-600 py-2 text-xs font-semibold text-white shadow hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'กำลังลงทะเบียน...' : 'ยืนยันและสร้างบัญชีผู้ใช้'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
