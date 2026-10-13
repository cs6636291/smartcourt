import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AuthLayout } from './AuthLayout';

const emptyRegistration = {
  first_name: '',
  last_name: '',
  nickname: '',
  gender: 'male',
  email: '',
  std_id: '',
  password: '',
};

export default function Register({ initialData, onBack, onContinue, onLogin }) {
  const [registration, setRegistration] = useState({ ...emptyRegistration, ...initialData });
  const [error, setError] = useState('');

  const updateField = (event) => {
    setRegistration((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    if (!/^\d{13}$/.test(registration.std_id)) {
      setError('รหัสนักศึกษาต้องเป็นตัวเลข 13 หลัก');
      return;
    }
    if (registration.password.length < 8 || !/[A-Za-z]/.test(registration.password) || !/[0-9]/.test(registration.password)) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีทั้งตัวอักษรกับตัวเลข');
      return;
    }
    onContinue(registration);
  };

  const inputClass = 'mt-1.5 w-full rounded-md border border-[#9db4d3] px-3 py-2.5 text-sm outline-none focus:border-[#ff8733] focus:ring-1 focus:ring-[#ff8733]';

  return (
    <AuthLayout onSwitch={onLogin}>
      <main className="mx-auto mt-5 w-full max-w-5xl">
        <section className="flex items-center gap-4 rounded-lg border border-[#9db4d3] bg-white px-5 py-4 shadow-sm sm:px-7">
          <button type="button" onClick={onBack} aria-label="กลับหน้าเข้าสู่ระบบ" className="shrink-0 text-slate-700 hover:text-[#e96f20]">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold">สมัครสมาชิก</h2>
            <p className="mt-1 text-xs text-slate-400">กรอกข้อมูลเพื่อใช้งานระบบจองสนามกีฬา</p>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="mt-4 rounded-lg border border-[#9db4d3] bg-white p-5 shadow-sm sm:p-6">
          {error && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
            <label className="text-xs font-medium">ชื่อ
              <input name="first_name" autoComplete="given-name" required value={registration.first_name} onChange={updateField} placeholder="ชื่อ" className={inputClass} />
            </label>
            <label className="text-xs font-medium">นามสกุล
              <input name="last_name" autoComplete="family-name" required value={registration.last_name} onChange={updateField} placeholder="นามสกุล" className={inputClass} />
            </label>
            <label className="text-xs font-medium">ชื่อเล่น
              <input name="nickname" value={registration.nickname} onChange={updateField} placeholder="ชื่อเล่น" className={inputClass} />
            </label>
            <label className="text-xs font-medium">เพศ
              <select name="gender" value={registration.gender} onChange={updateField} className={inputClass}>
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
              </select>
            </label>
            <label className="text-xs font-medium">อีเมล
              <input name="email" type="email" autoComplete="email" required value={registration.email} onChange={updateField} placeholder="name@example.com" className={inputClass} />
            </label>
            <label className="text-xs font-medium">รหัสนักศึกษา
              <input name="std_id" inputMode="numeric" maxLength={13} required value={registration.std_id} onChange={updateField} placeholder="รหัสนักศึกษา 13 หลัก" className={inputClass} />
            </label>
            <label className="text-xs font-medium sm:col-span-2">รหัสผ่าน
              <input name="password" type="password" autoComplete="new-password" required value={registration.password} onChange={updateField} placeholder="อย่างน้อย 8 ตัว มีตัวอักษรและตัวเลข" className={inputClass} />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="rounded-md bg-[#ff8733] px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-[#f47a27]">ถัดไป: ยืนยัน OTP</button>
          </div>
        </form>
      </main>
    </AuthLayout>
  );
}