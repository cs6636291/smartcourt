import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import client from '../api/client';
import { AuthLayout, getApiError, saveSession } from './AuthLayout';

const initialProfile = { first_name: '', last_name: '', nickname: '', gender: 'male', std_id: '', password: '' };

export default function RegistrationDetails({ email, verificationToken, onBack, onLogin, onAuthSuccess }) {
  const [profile, setProfile] = useState(initialProfile);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const inputClass = 'mt-1.5 w-full rounded-md border border-[#9db4d3] px-3 py-2.5 text-sm outline-none focus:border-[#ff8733] focus:ring-1 focus:ring-[#ff8733]';
  const updateField = (event) => setProfile((current) => ({ ...current, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!verificationToken) {
      setError('กรุณายืนยัน OTP ก่อนสมัครสมาชิก');
      return;
    }
    if (!/^\d{13}$/.test(profile.std_id)) {
      setError('รหัสนักศึกษาต้องเป็นตัวเลข 13 หลัก');
      return;
    }
    if (profile.password.length < 8 || !/[A-Za-z]/.test(profile.password) || !/\d/.test(profile.password)) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีทั้งตัวอักษรกับตัวเลข');
      return;
    }
    setLoading(true);
    let created = accountCreated;
    try {
      if (!created) {
        const registration = { ...profile, email, verification_token: verificationToken };
        await client.post('/accounts/register/', registration);
        created = true;
        setAccountCreated(true);
      }
      const response = await client.post('/accounts/login/', { email, password: profile.password });
      saveSession(response.data);
      onAuthSuccess(response.data.user);
    } catch (requestError) {
      setError(created ? 'สมัครสมาชิกแล้ว แต่เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง หรือไปหน้าเข้าสู่ระบบ' : getApiError(requestError, 'สมัครสมาชิกไม่สำเร็จ กรุณาตรวจสอบข้อมูล'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout onSwitch={onLogin}>
      <main className="mx-auto mt-8 w-full max-w-3xl rounded-2xl border border-[#9db4d3] bg-white p-6 shadow-sm">
        <button type="button" onClick={onBack} aria-label="กลับหน้า OTP" className="text-slate-700 hover:text-[#e96f20]"><ArrowLeft size={19} /></button>
        <h2 className="text-center text-xl font-bold">กรอกข้อมูลสมาชิก</h2>
        <p className="mt-2 text-center text-xs text-slate-400">กรอกข้อมูลให้ครบถ้วนเพื่อใช้งานระบบจองสนามกีฬา</p>
        {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium">ชื่อ<input name="first_name" required value={profile.first_name} onChange={updateField} className={inputClass} /></label>
          <label className="text-xs font-medium">นามสกุล<input name="last_name" required value={profile.last_name} onChange={updateField} className={inputClass} /></label>
          <label className="text-xs font-medium">ชื่อเล่น<input name="nickname" value={profile.nickname} onChange={updateField} className={inputClass} /></label>
          <label className="text-xs font-medium">เพศ<select name="gender" value={profile.gender} onChange={updateField} className={inputClass}><option value="male">ชาย</option><option value="female">หญิง</option></select></label>
          <label className="text-xs font-medium">อีเมล<input type="email" value={email} readOnly aria-readonly="true" className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-500`} /></label>
          <label className="text-xs font-medium">รหัสนักศึกษา<input name="std_id" inputMode="numeric" maxLength={13} required value={profile.std_id} onChange={updateField} className={inputClass} /></label>
          <label className="text-xs font-medium">รหัสผ่าน<input name="password" type="password" autoComplete="new-password" required value={profile.password} onChange={updateField} className={inputClass} /></label>
          <button type="submit" disabled={loading} className="rounded-md bg-[#ff8733] py-2.5 text-sm font-semibold sm:col-span-2">{loading ? 'กำลังดำเนินการ...' : accountCreated ? 'ลองเข้าสู่ระบบอีกครั้ง' : 'สมัครสมาชิก'}</button>
        </form>
      </main>
    </AuthLayout>
  );
}
