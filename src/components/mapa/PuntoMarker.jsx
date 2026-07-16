import React, { useState } from "react";

export default function PuntoMarker({ label, color, count, style, onPointerDown, highlight }) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10 touch-none"
      style={style}
      onPointerDown={onPointerDown}
    >
      {highlight && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-primary/40 animate-ping pointer-events-none" />
      )}
      <div
        className={`relative w-4 h-4 rounded-full ${color} border-2 border-white shadow-md cursor-pointer hover:scale-125 transition-transform ${
          highlight ? "ring-2 ring-primary ring-offset-2 ring-offset-white z-20" : ""
        }`}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      >
        {count > 1 && (
          <span className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5 leading-none">
            {count}
          </span>
        )}
      </div>
      {showTip && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-9 z-50 pointer-events-none">
          <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-lg font-medium max-w-[220px] overflow-hidden text-ellipsis">
            {label || "Punto sin ítems"}
          </div>
        </div>
      )}
    </div>
  );
}