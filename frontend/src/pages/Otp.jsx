import React, { useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import client from '../api/client';
import { AuthLayout, getApiError } from './AuthLayout';

export default function Otp({ registration, onBack, onLogin, onVerified }) {
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [error, setError] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [testOtp, setTestOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef([]);

  const sendOtp = async () => {
    if (!registration?.email) {
      setError('ไม่พบอีเมล กรุณากลับไปกรอกข้อมูลสมัครสมาชิก');
      return;
    }
    setSending(true);
    setError('');
    setSendMessage('');
    setTestOtp('');
    try {
      const response = await client.post('/accounts/send-otp/', { email: registration.email });
      setSendMessage(response.data.message || 'ส่งรหัส OTP แล้ว กรุณาตรวจสอบอีเมล');
      setTestOtp(response.data.otp || '');
      setDigits(Array(6).fill(''));
    } catch (requestError) {
      setError(getApiError(requestError, 'ส่งรหัส OTP ไม่สำเร็จ กรุณาลองใหม่'));
    } finally {
      setSending(false);
    }
  };

  const updateDigit = (index, value) => {
    const nextValue = value.replace(/\D/g, '').slice(-1);
    setDigits((current) => current.map((digit, currentIndex) => currentIndex === index ? nextValue : digit));
    if (nextValue && index < inputRefs.current.length - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
    if (event.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    setDigits(Array.from({ length: 6 }, (_, index) => pasted[index] || ''));
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const otp = digits.join('');
    if (!/^\d{6}$/.test(otp)) {
      setError('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก');
      return;
    }
    if (!registration) {
      setError('ไม่พบข้อมูลสมัครสมาชิก กรุณากรอกข้อมูลอีกครั้ง');
      return;
    }

    setSubmitting(true);
    try {
      await client.post('/accounts/verify-otp/', { email: registration.email, otp });
      onVerified(registration.email);
    } catch (requestError) {
      setError(getApiError(requestError, 'ยืนยัน OTP หรือสมัครสมาชิกไม่สำเร็จ กรุณาตรวจสอบข้อมูล'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout onSwitch={onLogin}>
      <main className="mx-auto mt-5 w-full max-w-md rounded-lg border border-[#9db4d3] bg-white px-5 py-5 shadow-sm sm:px-7">
        <button type="button" onClick={onBack} aria-label="กลับหน้าสมัครสมาชิก" className="mb-1 text-slate-700 hover:text-[#e96f20]">
          <ArrowLeft size={19} />
        </button>
        <h2 className="text-center text-lg font-bold">กรอก OTP</h2>
        <p className="mt-2 text-center text-xs text-slate-400">OTP สำหรับ {registration?.email || 'อีเมลของคุณ'}</p>

        {sendMessage && <p role="status" className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{sendMessage}</p>}
        {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="mt-4 flex justify-center gap-1.5 sm:gap-2" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => { inputRefs.current[index] = element; }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                aria-label={`OTP หลักที่ ${index + 1}`}
                maxLength={1}
                value={digit}
                onChange={(event) => updateDigit(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                className="h-10 w-9 rounded-md border border-[#9db4d3] text-center text-base outline-none focus:border-[#ff8733] focus:ring-1 focus:ring-[#ff8733] sm:h-11 sm:w-10"
              />
            ))}
          </div>
          {/* {testOtp && <p className="mt-3 text-center text-[11px] text-amber-700">รหัสทดสอบจาก server: <strong>{testOtp}</strong></p>} */}
          <button type="button" onClick={sendOtp} disabled={sending || submitting} className="mx-auto mt-3 block text-xs font-medium text-blue-700 hover:underline disabled:opacity-50">
            {sending ? 'กำลังส่ง OTP...' : 'ส่ง OTP อีกครั้ง'}
          </button>
          <button type="submit" disabled={sending || submitting} className="mx-auto mt-4 block rounded-md bg-[#ff8733] px-5 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-[#f47a27] disabled:cursor-wait disabled:opacity-60">
            {submitting ? 'กำลังตรวจสอบ...' : 'ยืนยัน'}
          </button>
        </form>
      </main>
    </AuthLayout>
  );
}
