import React, { useState } from "react";

export default function PuntoMarker({ equipment, color, style, onPointerDown }) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10 touch-none"
      style={style}
      onPointerDown={onPointerDown}
    >
      <div
        className={`w-7 h-7 rounded-full ${color} border-[3px] border-white shadow-lg cursor-pointer hover:scale-125 transition-transform`}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      />
      {showTip && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-11 z-50 pointer-events-none">
          <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-lg font-medium">
            {equipment ? (equipment.asset_number || "Sin asset") : "Equipo no encontrado"}
          </div>
        </div>
      )}
    </div>
  );
}