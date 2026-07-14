import React, { useRef, useState, useEffect } from "react";
import { Plus, Minus, Maximize } from "lucide-react";
import PuntoMarker from "./PuntoMarker";
import { getPuntoItems, itemLabel } from "@/lib/mapaHelpers";

const STATUS_COLORS = {
  disponible: "bg-emerald-500",
  asignado: "bg-blue-500",
  en_reparacion: "bg-amber-500",
  baja: "bg-red-500",
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const getDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export default function MapVisualizer({
  plano,
  puntos,
  equiposById,
  impresorasById,
  filters,
  mode,
  onAddPoint,
  onSelectPoint,
  onMovePoint,
  onMoveEnd,
  fullscreen,
}) {
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [baseWidth, setBaseWidth] = useState(0);

  const pointers = useRef(new Map());
  const interaction = useRef(null);
  const pinch = useRef(null);

  const view = useRef({ zoom, pan });
  view.current = { zoom, pan };
  const cb = useRef({});
  cb.current = { mode, onAddPoint, onSelectPoint, onMovePoint, onMoveEnd };

  useEffect(() => {
    const measure = () => containerRef.current && setBaseWidth(containerRef.current.clientWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [plano?.id]);

  const zoomAt = (cx, cy, newZoom) => {
    const { zoom: z, pan: p } = view.current;
    const imgX = (cx - p.x) / z;
    const imgY = (cy - p.y) / z;
    setPan({ x: cx - imgX * newZoom, y: cy - imgY * newZoom });
    setZoom(newZoom);
  };

  const onWheel = (e) => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, clamp(view.current.zoom * (e.deltaY < 0 ? 1.15 : 0.87), 0.3, 8));
  };

  const onBgPointerDown = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      pinch.current = { dist: getDist(pts[0], pts[1]), zoom: view.current.zoom };
      interaction.current = null;
    } else if (pointers.current.size === 1 && !interaction.current) {
      interaction.current = { type: "pan", startX: e.clientX, startY: e.clientY, startPan: { ...view.current.pan }, moved: false };
    }
  };

  const onPointPointerDown = (e, punto) => {
    if (cb.current.mode === "add") return;
    e.stopPropagation();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    interaction.current = {
      type: "point",
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      puntoId: punto.id,
      punto,
      canDrag: cb.current.mode === "modify",
    };
  };

  useEffect(() => {
    const onMove = (e) => {
      if (pointers.current.has(e.pointerId))
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size >= 2 && pinch.current) {
        const pts = [...pointers.current.values()];
        const dist = getDist(pts[0], pts[1]);
        const newZoom = clamp(pinch.current.zoom * (dist / pinch.current.dist), 0.3, 8);
        const rect = containerRef.current.getBoundingClientRect();
        const mid = { x: (pts[0].x + pts[1].x) / 2 - rect.left, y: (pts[0].y + pts[1].y) / 2 - rect.top };
        zoomAt(mid.x, mid.y, newZoom);
        return;
      }

      const it = interaction.current;
      if (!it) return;
      const dx = e.clientX - it.startX;
      const dy = e.clientY - it.startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) it.moved = true;

      if (it.type === "pan") {
        setPan({ x: it.startPan.x + dx, y: it.startPan.y + dy });
      } else if (it.type === "point" && it.canDrag && wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
        const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
        cb.current.onMovePoint(it.puntoId, x, y);
      }
    };

    const onUp = (e) => {
      const it = interaction.current;

      if (it && !it.moved && pointers.current.size <= 1) {
        if (it.type === "pan") {
          if (cb.current.mode === "add" && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            if (rect.width > 0) {
              const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
              const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
              cb.current.onAddPoint(x, y);
            }
          }
        } else if (it.type === "point") {
          cb.current.onSelectPoint(it.punto);
        }
      } else if (it && it.moved && it.type === "point") {
        cb.current.onMoveEnd?.(it.puntoId);
      }

      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) pinch.current = null;
      if (pointers.current.size === 0) interaction.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const hasFilters = filters?.tipo || filters?.estado || filters?.sector || filters?.usuario;

  const visiblePuntos = puntos.filter((p) => {
    const items = getPuntoItems(p);
    if (items.length === 0 || !hasFilters) return true;
    const eqEntities = items
      .filter((it) => it.tipo === "equipo")
      .map((it) => equiposById[it.id])
      .filter(Boolean);
    return eqEntities.some(
      (eq) =>
        (!filters.tipo || eq.type === filters.tipo) &&
        (!filters.estado || eq.status === filters.estado) &&
        (!filters.sector || eq.department === filters.sector) &&
        (!filters.usuario || eq.assigned_to === filters.usuario)
    );
  });

  return (
    <div
      className="relative w-full bg-slate-100 rounded-lg overflow-hidden border"
      style={{ height: fullscreen ? "100%" : "calc(100vh - 280px)" }}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden touch-none"
        style={{ cursor: mode === "add" ? "crosshair" : "grab" }}
        onWheel={onWheel}
        onPointerDown={onBgPointerDown}
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
                const items = getPuntoItems(p);
                const eqEntities = items
                  .filter((it) => it.tipo === "equipo")
                  .map((it) => equiposById[it.id])
                  .filter(Boolean);
                const color = eqEntities.length > 0
                  ? (STATUS_COLORS[eqEntities[0].status] || "bg-slate-500")
                  : "bg-violet-500";
                const label = items
                  .map((it) => itemLabel(it, equiposById, impresorasById))
                  .join(", ");
                return (
                  <PuntoMarker
                    key={p.id}
                    label={label}
                    color={color}
                    count={items.length}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    onPointerDown={(e) => onPointPointerDown(e, p)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-white rounded-lg shadow-lg p-1.5">
        <button onClick={() => setZoom((z) => clamp(z * 1.25, 0.3, 8))} className="p-3 hover:bg-slate-100 rounded-md touch-none">
          <Plus className="w-5 h-5" />
        </button>
        <button onClick={() => setZoom((z) => clamp(z / 1.25, 0.3, 8))} className="p-3 hover:bg-slate-100 rounded-md touch-none">
          <Minus className="w-5 h-5" />
        </button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-3 hover:bg-slate-100 rounded-md touch-none">
          <Maximize className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}