/**
 * Helpers para normalizar ítems de puntos del mapa.
 * Soporta puntos legacy (con equipo_id único) y nuevos (con array items).
 */

export function getPuntoItems(punto) {
  if (Array.isArray(punto?.items) && punto.items.length > 0) return punto.items;
  if (punto?.equipo_id) return [{ tipo: "equipo", id: punto.equipo_id }];
  return [];
}

export function itemKey(it) {
  return `${it.tipo}:${it.id}`;
}

export function itemLabel(it, equiposById, impresorasById) {
  if (it.tipo === "equipo") {
    const e = equiposById?.[it.id];
    return e?.asset_number || e?.serial_number || "Equipo";
  }
  if (it.tipo === "impresora") {
    const p = impresorasById?.[it.id];
    return p?.printer_id || (p ? `${p.marca} ${p.modelo}`.trim() : "Impresora");
  }
  return "Ítem";
}