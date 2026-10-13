import React from 'react';

export function AuthLayout({ children, onSwitch }) {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 text-slate-900">
      <header className="mx-auto flex min-h-20 w-full max-w-6xl items-center justify-between gap-4 rounded-2xl border border-[#9db4d3] bg-white px-5 py-3 shadow-[0_2px_8px_rgba(36,70,110,0.08)]">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/assets/kmutnb-logo.png"
            alt="ตราสัญลักษณ์มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ"
            className="h-12 w-12 shrink-0 object-contain"
          />
          <h1 className="text-sm font-bold leading-snug sm:text-base">
            ระบบจองสนามกีฬา ตึก 40 KMUTNB
          </h1>
        </div>
        <button
          type="button"
          onClick={onSwitch}
          className="shrink-0 rounded-lg bg-[#ff8733] px-4 py-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#f47a27] sm:px-6 sm:text-xs"
        >
          เข้าสู่ระบบ / สมัครสมาชิก
        </button>
      </header>
      {children}
    </div>
  );
}

export function getApiError(error, fallback) {
  const data = error.response?.data;
  if (data?.detail) return data.detail;
  if (data && typeof data === 'object') {
    const firstError = Object.values(data).flat()[0];
    if (typeof firstError === 'string') return firstError;
  }
  return fallback;
}

export function saveSession(data) {
  localStorage.setItem('access_token', data.access);
  localStorage.setItem('refresh_token', data.refresh);
  localStorage.setItem('user_info', JSON.stringify(data.user));
}
