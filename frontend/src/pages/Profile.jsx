import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, UserRound } from 'lucide-react';
import client from '../api/client';
import { getApiError } from './AuthLayout';

const PROFILE_FIELDS = ['first_name', 'last_name', 'nickname', 'email', 'std_id'];

export default function Profile({ user, onBack, onProfileUpdate }) {
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    nickname: user?.nickname || '',
    email: user?.email || '',
    std_id: user?.std_id || '',
  });
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    client.get('/accounts/profile/')
      .then((response) => {
        if (!active) return;
        const profile = response.data;
        setForm(Object.fromEntries(PROFILE_FIELDS.map((field) => [field, profile[field] || ''])));
        setAvatar(profile.avatar || '');
        onProfileUpdate(profile);
      })
      .catch((requestError) => {
        if (active) setError(getApiError(requestError, 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleChange = (event) => {
    setSaved(false);
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaved(false);
    if (!/^\d{13}$/.test(form.std_id)) {
      setError('รหัสนักศึกษาต้องเป็นตัวเลข 13 หลัก');
      return;
    }
    setSaving(true);
    try {
      const { email, ...editableProfile } = form;
      const response = await client.patch('/accounts/profile/', editableProfile);
      setForm(Object.fromEntries(PROFILE_FIELDS.map((field) => [field, response.data[field] || ''])));
      setAvatar(response.data.avatar || '');
      onProfileUpdate(response.data);
      setSaved(true);
    } catch (requestError) {
      setError(getApiError(requestError, 'บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบข้อมูล'));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'mt-1.5 w-full rounded-md border border-[#9db4d3] px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#ff8733] focus:ring-1 focus:ring-[#ff8733]';

  return (
    <main className="mx-auto mt-5 w-full max-w-5xl px-4 pb-12 sm:px-0">
      <section className="grid gap-6 rounded-lg border border-[#9db4d3] bg-white p-5 shadow-sm sm:grid-cols-[220px_1fr] sm:p-7">
        <div className="flex flex-col items-center pt-3">
          <button type="button" onClick={onBack} aria-label="กลับหน้าหลัก" className="absolute self-start text-slate-700 hover:text-[#e96f20] sm:static sm:mb-2 sm:self-start">
            <ArrowLeft size={19} />
          </button>
          <div className="mt-8 flex h-40 w-40 items-center justify-center overflow-hidden rounded-full bg-slate-100 sm:mt-0 sm:h-48 sm:w-48">
            {avatar && !avatarFailed ? (
              <img src={avatar} alt="รูปโปรไฟล์" className="h-full w-full object-cover" onError={() => setAvatarFailed(true)} />
            ) : (
              <UserRound className="h-20 w-20 text-slate-400" strokeWidth={1.3} />
            )}
          </div>
          <span className="mt-4 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-medium text-blue-700">
            ข้อมูลส่วนตัว
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          {saved && <p role="status" className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4" />บันทึกข้อมูลโปรไฟล์แล้ว</p>}
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">กำลังโหลดข้อมูลโปรไฟล์...</p>
          ) : (
            <>
              <label className="block text-xs font-medium text-slate-800">ชื่อ
                <input name="first_name" autoComplete="given-name" required value={form.first_name} onChange={handleChange} className={inputClass} />
              </label>
              <label className="block text-xs font-medium text-slate-800">นามสกุล
                <input name="last_name" autoComplete="family-name" required value={form.last_name} onChange={handleChange} className={inputClass} />
              </label>
              <label className="block text-xs font-medium text-slate-800">ชื่อเล่น
                <input name="nickname" value={form.nickname} onChange={handleChange} className={inputClass} />
              </label>
              <label className="block text-xs font-medium text-slate-800">อีเมล
                <input name="email" type="email" autoComplete="email" readOnly aria-readonly="true" value={form.email} className={`${inputClass} bg-slate-50 text-slate-500`} />
              </label>
              <p className="text-xs text-slate-500">อีเมลที่ยืนยันแล้วใช้สำหรับเข้าสู่ระบบและไม่สามารถแก้ไขได้</p>
              <label className="block text-xs font-medium text-slate-800">รหัสนักศึกษา
                <input name="std_id" inputMode="numeric" maxLength={13} value={form.std_id} onChange={handleChange} className={inputClass} />
              </label>
              <div className="flex justify-end pt-1">
                <button type="submit" disabled={saving} className="rounded-md bg-[#ff8733] px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-[#f47a27] disabled:cursor-wait disabled:opacity-60">
                  {saving ? 'กำลังบันทึก...' : 'ยืนยัน'}
                </button>
              </div>
            </>
          )}
        </form>
      </section>
    </main>
  );
}
