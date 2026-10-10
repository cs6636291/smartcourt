import React from 'react';

export const FutsalGraphic = () => (
  <div className="relative w-full h-44 rounded-lg overflow-hidden border border-gray-200 bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-500 shadow-inner flex items-end justify-center">
    {/* Fence and Goal */}
    <div className="absolute inset-x-0 bottom-12 h-16 border-b-2 border-gray-400 bg-repeat-x opacity-40"
         style={{ backgroundImage: 'radial-gradient(circle, #64748b 1px, transparent 1px)', backgroundSize: '8px 8px' }}>
    </div>
    
    {/* Goal post */}
    <div className="relative mb-5 w-44 h-24 border-4 border-white bg-white/20 rounded-t-sm shadow-md flex items-center justify-center">
      {/* Goal net pattern */}
      <div className="absolute inset-0 opacity-40 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:10px_10px]"></div>
      {/* Soccer ball */}
      <div className="relative z-10 -bottom-10 w-6 h-6 bg-white rounded-full border-2 border-gray-800 shadow-lg flex items-center justify-center">
        <div className="w-2.5 h-2.5 bg-gray-900 rounded-sm rotate-45"></div>
      </div>
    </div>

    {/* Pitch grass area */}
    <div className="absolute inset-x-0 bottom-0 h-10 bg-emerald-600 border-t-2 border-white/60">
      <div className="w-24 h-8 mx-auto border-t-2 border-x-2 border-white/60 rounded-t-full"></div>
    </div>
  </div>
);

export const BasketballGraphic = () => (
  <div className="w-20 h-16 flex flex-col items-center justify-center">
    {/* Backboard */}
    <div className="w-16 h-11 border-2 border-gray-800 bg-white rounded-sm shadow-sm flex items-center justify-center relative">
      <div className="w-7 h-5 border-2 border-red-500 bg-red-50/40"></div>
      {/* Rim */}
      <div className="absolute -bottom-1 w-6 h-1.5 bg-orange-600 rounded-full"></div>
    </div>
    {/* Net */}
    <div className="w-5 h-5 border-x border-b border-gray-400 bg-[linear-gradient(45deg,transparent_45%,#94a3b8_49%,#94a3b8_51%,transparent_55%)] opacity-80"></div>
  </div>
);

export const VolleyballGraphic = () => (
  <div className="relative w-full h-44 rounded-lg overflow-hidden border border-gray-200 bg-slate-50 flex items-center justify-center shadow-inner">
    {/* Volleyball Court (Perspective) */}
    <div className="w-64 h-32 bg-slate-600 rounded border-2 border-white shadow-md relative transform -rotate-1 flex flex-col justify-center items-center">
      <div className="w-full h-1 bg-white opacity-80 my-auto"></div>
      
      {/* Net across court */}
      <div className="absolute inset-x-0 h-10 bg-orange-500/20 border-y-2 border-orange-500 flex items-center justify-center">
        <div className="w-full h-full opacity-60 bg-[linear-gradient(to_right,#f97316_1px,transparent_1px),linear-gradient(to_bottom,#f97316_1px,transparent_1px)] bg-[size:6px_6px]"></div>
      </div>

      {/* Volleyball ball */}
      <div className="absolute -top-3 left-16 w-7 h-7 rounded-full bg-yellow-300 border-2 border-blue-600 shadow-md flex items-center justify-center overflow-hidden">
        <div className="w-full h-1 bg-blue-600 rotate-45"></div>
      </div>
    </div>
  </div>
);

export const BadmintonGraphic = () => (
  <div className="w-20 h-20 flex flex-col items-center justify-center">
    {/* Shuttlecock SVG */}
    <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-md">
      {/* Feathers */}
      <polygon points="50,20 20,70 80,70" fill="#f8fafc" stroke="#64748b" strokeWidth="2" />
      <line x1="50" y1="20" x2="35" y2="70" stroke="#cbd5e1" strokeWidth="1.5" />
      <line x1="50" y1="20" x2="50" y2="70" stroke="#cbd5e1" strokeWidth="1.5" />
      <line x1="50" y1="20" x2="65" y2="70" stroke="#cbd5e1" strokeWidth="1.5" />
      <line x1="26" y1="58" x2="74" y2="58" stroke="#94a3b8" strokeWidth="2" />
      {/* Cork base */}
      <path d="M 32,70 C 32,84 68,84 68,70 Z" fill="#ffffff" stroke="#334155" strokeWidth="2" />
    </svg>
  </div>
);
