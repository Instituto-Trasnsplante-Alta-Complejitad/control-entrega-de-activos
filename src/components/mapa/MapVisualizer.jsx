import React, { useRef, useState, useEffect } from "react";
import { Plus, Minus, Maximize } from "lucide-react";
import PuntoMarker from "./PuntoMarker";

const STATUS_COLORS = {
  disponible: "bg-emerald-500",
  asignado: "bg-blue-500",
  en_reparacion: "bg-amber-500",
  baja: "bg-red-500",
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export default function MapVisualizer({
  plano,
  puntos,
  equipmentById,
  canEdit,
  onAddPoint,
  onMovePoint,
  onMoveEnd,
  onSelectPoint,
  filters,
}) {
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [baseWidth, setBaseWidth] = useState(0);
  const dragState = useRef(null);

  // refs to avoid stale closures in global listeners
  const view = useRef({ zoom, pan });
  view.current = { zoom, pan };
  const cb = useRef({});
  cb.current = { canEdit, onAddPoint, onMovePoint, onMoveEnd, onSelectPoint };

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setBaseWidth(containerRef.current.clientWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [plano?.id]);

  useEffect(() => {
    const onMove = (e) => {
      const ds = dragState.current;
      if (!ds) return;
      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) ds.moved = true;
      if (ds.mode === "pan") {
        setPan({ x: ds.startPan.x + dx, y: ds.startPan.y + dy });
      } else if (ds.mode === "point" && wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
        const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
        cb.current.onMovePoint(ds.puntoId, x, y);
      }
    };
    const onUp = (e) => {
      const ds = dragState.current;
      if (!ds) return;
      if (ds.mode === "pan" && !ds.moved && cb.current.canEdit && wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
          const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
          cb.current.onAddPoint(x, y);
        }
      } else if (ds.mode === "point") {
        if (ds.moved) cb.current.onMoveEnd?.(ds.puntoId);
        else cb.current.onSelectPoint(ds.punto);
      }
      dragState.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onWheel = (e) => {
    e.preventDefault();
    const { zoom: z, pan: p } = view.current;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = clamp(z * factor, 0.3, 6);
    const rect = containerRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const imgX = (cx - p.x) / z;
    const imgY = (cy - p.y) / z;
    setPan({ x: cx - imgX * newZoom, y: cy - imgY * newZoom });
    setZoom(newZoom);
  };

  const onBackgroundDown = (e) => {
    dragState.current = {
      mode: "pan",
      startX: e.clientX,
      startY: e.clientY,
      startPan: { ...view.current.pan },
      moved: false,
    };
  };

  const startPointDrag = (e, punto) => {
    e.stopPropagation();
    if (!cb.current.canEdit) {
      cb.current.onSelectPoint(punto);
      return;
    }
    dragState.current = {
      mode: "point",
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      puntoId: punto.id,
      punto,
    };
  };

  const visiblePuntos = puntos.filter((p) => {
    const eq = equipmentById[p.equipo_id];
    if (!eq) return true;
    if (filters.tipo && eq.type !== filters.tipo) return false;
    if (filters.estado && eq.status !== filters.estado) return false;
    if (filters.sector && eq.department !== filters.sector) return false;
    if (filters.usuario && eq.assigned_to !== filters.usuario) return false;
    return true;
  });

  return (
    <div
      className="relative w-full bg-slate-100 rounded-lg overflow-hidden border"
      style={{ height: "calc(100vh - 230px)" }}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing"
        onWheel={onWheel}
        onMouseDown={onBackgroundDown}
      >
        {plano && baseWidth > 0 && (
          <div
            ref={wrapperRef}
            className="absolute top-0 left-0 origin-top-left"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, width: baseWidth }}
          >
            <div className="relative">
              <img
                src={plano.imagen_url}
                className="block w-full select-none pointer-events-none"
                draggable={false}
                alt={plano.nombre}
              />
              {visiblePuntos.map((p) => {
                const eq = equipmentById[p.equipo_id];
                const color = eq ? STATUS_COLORS[eq.status] || "bg-slate-500" : "bg-slate-500";
                return (
                  <PuntoMarker
                    key={p.id}
                    equipment={eq}
                    color={color}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    onMouseDown={(e) => startPointDrag(e, p)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-white rounded-lg shadow p-1">
        <button onClick={() => setZoom((z) => clamp(z * 1.2, 0.3, 6))} className="p-2 hover:bg-slate-100 rounded">
          <Plus className="w-4 h-4" />
        </button>
        <button onClick={() => setZoom((z) => clamp(z / 1.2, 0.3, 6))} className="p-2 hover:bg-slate-100 rounded">
          <Minus className="w-4 h-4" />
        </button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-2 hover:bg-slate-100 rounded">
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {canEdit && (
        <div className="absolute top-3 left-3 bg-white/90 px-3 py-1.5 rounded text-xs text-muted-foreground shadow">
          Click en el plano para agregar un punto · arrastrá los puntos para moverlos
        </div>
      )}
    </div>
  );
}