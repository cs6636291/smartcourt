import React from 'react';

export function AuthLayout({ children, onSwitch }) {
  return (
    <div className="min-h-screen bg-[#f7f8fa] px-4 py-5 text-slate-900 sm:px-8 sm:py-7">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 rounded-lg border border-[#9db4d3] bg-white px-4 py-3 shadow-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="https://upload.wikimedia.org/wikipedia/th/1/1b/KMUTNB_Logo.png"
            alt="ตราสัญลักษณ์มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ"
            className="h-10 w-10 shrink-0 object-contain"
            onError={(event) => { event.currentTarget.style.display = 'none'; }}
          />
          <h1 className="text-sm font-bold leading-snug sm:text-base">
            ระบบจองสนามกีฬา ตึก 40 KMUTNB
          </h1>
        </div>
        <button
          type="button"
          onClick={onSwitch}
          className="shrink-0 rounded-md bg-[#ff8733] px-3 py-2 text-[11px] font-semibold text-slate-950 transition-colors hover:bg-[#f47a27] sm:px-4"
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