import React from "react";

export default function PuntoMarker({ equipment, color, style, onMouseDown }) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 group z-10"
      style={style}
      onMouseDown={onMouseDown}
    >
      <div className={`w-4 h-4 rounded-full ${color} border-2 border-white shadow-lg cursor-pointer hover:scale-125 transition-transform`} />
      <div className="absolute left-1/2 -translate-x-1/2 -top-9 z-50 hidden group-hover:block">
        <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
          {equipment ? (equipment.asset_number || "Sin asset") : "Equipo no encontrado"}
        </div>
      </div>
    </div>
  );
}