import React, { useState } from 'react';
import { ArrowLeftCircle } from 'lucide-react';
import client from '../api/client';
import { AuthLayout, getApiError } from './AuthLayout';

export default function Register({ initialData, onBack, onContinue, onLogin }) {
  const [email, setEmail] = useState(initialData?.email || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setError('');
    setLoading(true);
    try {
      await client.post('/accounts/send-otp/', { email: normalizedEmail });
      onContinue({ email: normalizedEmail });
    } catch (requestError) {
      setError(getApiError(requestError, 'ส่งรหัส OTP ไม่สำเร็จ กรุณาลองใหม่'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout onSwitch={onLogin}>
      <main data-testid="register-card" className="relative mx-auto mt-5 w-full max-w-md rounded-lg border border-[#9db4d3] bg-white px-5 py-5 shadow-sm sm:px-7">
        <button type="button" onClick={onBack} aria-label="กลับหน้าเข้าสู่ระบบ" className="absolute left-5 top-5 text-slate-950 hover:text-[#e96f20] sm:left-7">
          <ArrowLeftCircle size={25} />
        </button>
        <h2 className="text-center text-2xl font-bold">สมัครสมาชิก</h2>
        <p className="mt-5 text-center text-sm text-slate-400">กรุณากรอกอีเมลเพื่อสมัครสมาชิก</p>

        <form onSubmit={handleSubmit} className="mt-8">
          <label htmlFor="register-email" className="block text-base font-medium">กรอกอีเมล</label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="อีเมลของคุณ"
            className="mt-3 w-full rounded-xl border border-[#6f91bd] px-4 py-4 text-base outline-none focus:border-[#ff8733] focus:ring-1 focus:ring-[#ff8733]"
          />
          {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="mt-7 w-full rounded-xl bg-[#ff8733] py-3 text-lg font-bold text-slate-950 hover:bg-[#f47a27] disabled:cursor-wait disabled:opacity-60">
            {loading ? 'กำลังส่ง OTP...' : 'ยืนยัน'}
          </button>
        </form>
      </main>
    </AuthLayout>
  );
}
