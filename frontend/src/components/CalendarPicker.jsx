import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export default function CalendarPicker({
  selectedDate,
  allowedDates = [],
  onSelectDate,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Parse current selected or initial date
  const currentDateObj = selectedDate ? new Date(selectedDate) : new Date();
  const [viewYear, setViewYear] = useState(currentDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(currentDateObj.getMonth());

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format date string to YYYY-MM-DD
  const formatDateStr = (year, month, day) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  // Format readable Thai date (e.g. 10 ต.ค. 2569)
  const formatReadableDate = (dateStr) => {
    if (!dateStr) return 'เลือกวันที่';
    const [y, m, d] = dateStr.split('-').map(Number);
    const shortMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d} ${shortMonths[m - 1]} ${y + 543}`;
  };

  // Generate calendar grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day) => {
    const dateStr = formatDateStr(viewYear, viewMonth, day);
    if (allowedDates.includes(dateStr)) {
      onSelectDate(dateStr);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button (Mockup style: pill button "เลือกวันที่") */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 border border-gray-400 hover:border-gray-800 bg-white px-4 py-1.5 rounded-full text-xs font-semibold text-gray-800 shadow-sm transition hover:shadow cursor-pointer"
      >
        <CalendarIcon className="w-3.5 h-3.5 text-red-600" />
        <span>เลือกวันที่ :</span>
        <span className="text-red-700 font-bold underline decoration-dotted">
          {formatReadableDate(selectedDate)}
        </span>
      </button>

      {/* Interactive Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <span className="font-bold text-sm text-gray-800">
              {THAI_MONTHS[viewMonth]} {viewYear + 543}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {THAI_DAYS.map((d, idx) => (
              <span
                key={d}
                className={`text-[11px] font-semibold py-1 ${
                  idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-500'
                }`}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots before day 1 */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDateStr(viewYear, viewMonth, day);
              const isAllowed = allowedDates.includes(dateStr);
              const isSelected = selectedDate === dateStr;
              const isToday = allowedDates[0] === dateStr;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={!isAllowed}
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-red-600 text-white font-bold shadow-md scale-105'
                      : isAllowed
                      ? 'text-gray-800 hover:bg-red-50 hover:text-red-600 cursor-pointer font-semibold border border-red-200 bg-red-50/30'
                      : 'text-gray-300 cursor-not-allowed'
                  }`}
                  title={isAllowed ? `เลือกวันที่ ${day}` : 'อยู่นอกช่วงเวลาจองล่วงหน้า 5 วัน'}
                >
                  {day}
                </button>
              );
            })}
          </div>


        </div>
      )}
    </div>
  );
}
