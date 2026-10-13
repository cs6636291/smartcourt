import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import client from '../api/client';
import { AuthLayout, getApiError, saveSession } from './AuthLayout';

export default function Login({ onBack, onRegister, onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await client.post('/accounts/login/', { email, password });
      saveSession(response.data);
      onAuthSuccess(response.data.user);
    } catch (requestError) {
      setError(getApiError(requestError, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout onSwitch={onRegister}>
      <main data-testid="login-card" className="relative mx-auto mt-5 w-full max-w-md rounded-lg border border-[#9db4d3] bg-white px-5 py-5 shadow-sm sm:px-7">
        <button type="button" onClick={onBack} aria-label="กลับหน้าหลัก" className="absolute left-5 top-5 rounded-full p-1 text-slate-700 hover:bg-slate-100 hover:text-[#e96f20] sm:left-7">
          <ArrowLeft size={17} />
        </button>
        <h2 className="text-center text-base font-bold">เข้าสู่ระบบ</h2>
        <p className="mb-6 mt-2 text-center text-[11px] text-slate-400">กรุณาตรวจสอบอีเมลและรหัสผ่านของคุณ</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs font-medium">
            อีเมล
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="อีเมลของคุณ"
              className="mt-1.5 w-full rounded-md border border-[#9db4d3] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#ff8733] focus:ring-1 focus:ring-[#ff8733]"
            />
          </label>
          <label className="block text-xs font-medium">
            รหัสผ่าน
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="รหัสผ่านของคุณ"
              className="mt-1.5 w-full rounded-md border border-[#9db4d3] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#ff8733] focus:ring-1 focus:ring-[#ff8733]"
            />
          </label>
          {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-md bg-[#ff8733] py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-[#f47a27] disabled:cursor-wait disabled:opacity-60">
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-slate-500">
          ยังไม่มีบัญชี?{' '}
          <button type="button" onClick={onRegister} className="font-medium text-blue-700 hover:underline">สมัครสมาชิก</button>
        </p>
      </main>
    </AuthLayout>
  );
}
