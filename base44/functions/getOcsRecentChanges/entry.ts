import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const OCS_BASE = Deno.env.get("OCS_API_URL") || "http://inventario.ad.itac.com.ar/ocsapi/v1";
const OCS_USER = Deno.env.get("OCS_API_USER") || "";
const OCS_PASS = Deno.env.get("OCS_API_PASS") || "";
const TIMEOUT_MS = 15000;

function authHeaders() {
  const headers = { "Content-Type": "application/json", "Accept": "application/json" };
  if (OCS_USER && OCS_PASS) {
    headers["Authorization"] = "Basic " + btoa(`${OCS_USER}:${OCS_PASS}`);
  }
  return headers;
}

async function ocsGet(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${OCS_BASE}${path}`, {
      headers: authHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
    return await res.json();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function fetchSection(id, section) {
  try {
    const data = await ocsGet(`/computer/${id}/${section}`);
    const wrapper = data[String(id)];
    if (!wrapper) return null;
    return wrapper[section] || null;
  } catch {
    return null;
  }
}

function daysSince(dateStr) {
  if (!dateStr) return 9999;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 9999;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    // Parámetro opcional: cuántos días atrás mirar (default: 3)
    const body = await req.json().catch(() => ({}));
    const days = parseInt(body.days) || 3;

    console.log(`[OCS Recent] Buscando equipos modificados/añadidos en los últimos ${days} días...`);

    // 1. Obtener lista de IDs
    const listResp = await ocsGet("/computers/listID");
    const idList = Array.isArray(listResp) ? listResp.map(e => e.ID) : [];
    console.log(`[OCS Recent] Total IDs en OCS: ${idList.length}`);

    // 2. Cargar equipos existentes del sistema para comparar
    const existingEquipment = await base44.asServiceRole.entities.Equipment.list("asset_number", 2000);
    const bySerial = {};
    const byAsset = {};
    existingEquipment.forEach(e => {
      if (e.serial_number?.trim()) bySerial[e.serial_number.trim().toUpperCase()] = e;
      if (e.asset_number?.trim()) byAsset[e.asset_number.trim().toUpperCase()] = e;
    });

    const results = [];

    // 3. Solo procesar los que reportaron en los últimos N días
    for (const id of idList) {
      try {
        const hwData = await fetchSection(id, "hardware");
        if (!hwData) continue;

        const reportDays = daysSince(hwData.LASTDATE);
        if (reportDays > days) continue; // solo recientes

        const assetNumber = (hwData.NAME || "").trim();
        const biosData = await fetchSection(id, "bios");
        const biosEntry = Array.isArray(biosData) ? biosData[0] : (biosData || {});
        const serialNumber = (biosEntry.SSN || "").trim();

        // Determinar si es nuevo o existente
        let existingRec = null;
        if (serialNumber) existingRec = bySerial[serialNumber.toUpperCase()];
        if (!existingRec && assetNumber) existingRec = byAsset[assetNumber.toUpperCase()];

        const status = existingRec ? "existente" : "nuevo";

        // Detectar cambios si existe
        let changes = [];
        if (existingRec) {
          // Comparar campos clave
          const fieldsToCheck = [
            { field: "brand", ocsVal: (biosEntry.SMANUFACTURER || "").trim() },
            { field: "model", ocsVal: (biosEntry.SMODEL || "").trim() },
            { field: "serial_number", ocsVal: serialNumber },
            { field: "username", ocsVal: (hwData.USERID || "").trim() },
            { field: "operating_system", ocsVal: (hwData.OSNAME || "").trim() },
          ];

          // RAM
          const ramMB = parseInt(hwData.MEMORY || 0);
          const ramGB = ramMB > 0 ? `${Math.round(ramMB / 1024)} GB` : "";
          if (ramGB) fieldsToCheck.push({ field: "ram_amount", ocsVal: ramGB });

          // Procesador
          const proc = (hwData.PROCESSORT || "").replace(/\s*\[.*?\]\s*/g, "").trim();
          if (proc) fieldsToCheck.push({ field: "processor_model", ocsVal: proc });

          for (const { field, ocsVal } of fieldsToCheck) {
            if (!ocsVal) continue;
            const sysVal = existingRec[field] ? String(existingRec[field]) : "";
            if (ocsVal !== sysVal) {
              changes.push({ field, old: sysVal || "(vacío)", new: ocsVal });
            }
          }
        }

        results.push({
          ocs_id: id,
          asset_number: assetNumber,
          serial_number: serialNumber,
          brand: (biosEntry.SMANUFACTURER || "").trim(),
          model: (biosEntry.SMODEL || "").trim(),
          username: (hwData.USERID || "").trim(),
          os: (hwData.OSNAME || "").trim(),
          last_report: hwData.LASTDATE || "",
          days_ago: reportDays,
          status,
          in_system: !!existingRec,
          system_id: existingRec?.id || null,
          changes,
        });

      } catch (e) {
        console.error(`[OCS Recent] Error en ID ${id}: ${e.message}`);
      }
    }

    // Ordenar: primero los nuevos, luego los con cambios, luego sin cambios
    results.sort((a, b) => {
      const score = (r) => r.status === "nuevo" ? 0 : r.changes.length > 0 ? 1 : 2;
      return score(a) - score(b) || a.days_ago - b.days_ago;
    });

    console.log(`[OCS Recent] Encontrados ${results.length} equipos activos en los últimos ${days} días. Nuevos: ${results.filter(r => r.status === "nuevo").length}, Con cambios: ${results.filter(r => r.changes.length > 0).length}`);

    return Response.json({
      success: true,
      days_checked: days,
      total: results.length,
      new_count: results.filter(r => r.status === "nuevo").length,
      changed_count: results.filter(r => r.changes.length > 0).length,
      results,
    });

  } catch (error) {
    console.error("[OCS Recent] Error fatal:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});