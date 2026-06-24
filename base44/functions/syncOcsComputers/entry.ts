import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const OCS_BASE = Deno.env.get("OCS_API_URL") || "http://inventario.ad.itac.com.ar/ocsapi/v1";
const OCS_USER = Deno.env.get("OCS_API_USER") || "";
const OCS_PASS = Deno.env.get("OCS_API_PASS") || "";
const MAX_DAYS = 20;
const TIMEOUT_MS = 15000;

// CAMPOS QUE OCS NUNCA DEBE PISAR
const PROTECTED_FIELDS = new Set([
  "status", "user_type", "assigned_to", "department",
  "delivery_date", "comments"
]);

// Campos técnicos que OCS puede actualizar
const OCS_UPDATABLE_FIELDS = [
  "brand", "model", "serial_number", "username", "processor_model",
  "storage_capacity", "storage_type", "ram_amount", "ram_slots",
  "ram_speed", "ram_generation", "ram_format", "operating_system",
  "ocs_id", "ocs_lastdate", "ocs_is_outdated", "ocs_days_without_report",
  "peripherals_mouse", "peripherals_keyboard", "peripherals_monitor", "peripherals_camera",
  "type", "asset_number"
];

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
    // La respuesta viene envuelta: { "1": { "hardware": {...} } }
    const wrapper = data[String(id)];
    if (!wrapper) return null;
    const val = wrapper[section];
    return val || null;
  } catch {
    return null;
  }
}

function cleanProcessor(raw) {
  if (!raw) return "";
  // Quitar sufijo como "[6 core(s) x86_64]"
  return raw.replace(/\s*\[.*?\]\s*/g, "").trim();
}

function diskSizeToGB(sizeKB) {
  if (!sizeKB || sizeKB === 0) return "";
  const gb = Math.round(sizeKB / 1024 / 1024);
  return `${gb} GB`;
}

function inferStorageType(diskName) {
  if (!diskName) return "HDD";
  const n = diskName.toUpperCase();
  if (n.includes("NVME") || n.includes("NVM")) return "NVMe";
  if (n.includes("SSD") || n.includes("SOLID")) return "SSD";
  return "HDD";
}

function inferRamGeneration(typeStr, speed) {
  if (typeStr) {
    const t = typeStr.toUpperCase();
    if (t.includes("DDR5")) return "DDR5";
    if (t.includes("DDR4")) return "DDR4";
    if (t.includes("DDR3")) return "DDR3";
  }
  if (speed) {
    const s = parseInt(speed);
    if (s >= 4800) return "DDR5";
    if (s >= 2133) return "DDR4";
    return "DDR3";
  }
  return "DDR4";
}

function inferRamFormat(biosType) {
  if (!biosType) return "DIMM";
  const t = biosType.toUpperCase();
  if (t.includes("NOTEBOOK") || t.includes("LAPTOP") || t.includes("PORTABLE")) return "SO-DIMM";
  return "DIMM";
}

function inferType(assetNumber) {
  if (!assetNumber) return "cpu";
  return assetNumber.toUpperCase().startsWith("AR2150L") ? "notebook" : "cpu";
}

function detectPeripherals(inputs, monitors, usbdevices) {
  const result = { mouse: false, keyboard: false, monitor: false, camera: false };
  const allInputs = Array.isArray(inputs) ? inputs : [];
  const allUsb = Array.isArray(usbdevices) ? usbdevices : [];
  const allMonitors = Array.isArray(monitors) ? monitors : [];

  for (const inp of allInputs) {
    const t = (inp.TYPE || inp.DESCRIPTION || "").toUpperCase();
    if (t.includes("MOUSE") || t.includes("POINTING")) result.mouse = true;
    if (t.includes("KEYBOARD") || t.includes("TECLADO")) result.keyboard = true;
  }
  for (const usb of allUsb) {
    const name = (usb.NAME || usb.CAPTION || "").toUpperCase();
    if (name.includes("MOUSE")) result.mouse = true;
    if (name.includes("KEYBOARD") || name.includes("TECLADO")) result.keyboard = true;
    if (name.includes("CAMERA") || name.includes("WEBCAM") || name.includes("CAM")) result.camera = true;
  }
  if (allMonitors.length > 0) result.monitor = true;

  return result;
}

function normalizeEquipment(id, hw, bios, cpus, storages, memories, inputs, monitors, usbdevices) {
  const biosEntry = Array.isArray(bios) ? bios[0] : (bios || {});
  const storageEntry = Array.isArray(storages) ? storages[0] : null;
  const memList = Array.isArray(memories) ? memories.filter(m => parseInt(m.CAPACITY || 0) > 0) : [];
  const firstMem = memList[0] || {};

  const assetNumber = (hw.NAME || "").trim();
  const serialNumber = (biosEntry.SSN || "").trim();
  const ramMB = parseInt(hw.MEMORY || 0);
  const ramGB = ramMB > 0 ? `${Math.round(ramMB / 1024)} GB` : "";

  const periph = detectPeripherals(inputs, monitors, usbdevices);

  const ramSpeedRaw = parseInt(firstMem.SPEED || 0);

  return {
    asset_number: assetNumber,
    type: inferType(assetNumber),
    brand: (biosEntry.SMANUFACTURER || "").trim(),
    model: (biosEntry.SMODEL || "").trim(),
    serial_number: serialNumber,
    username: (hw.USERID || "").trim(),
    processor_model: cleanProcessor(hw.PROCESSORT),
    storage_capacity: storageEntry ? diskSizeToGB(storageEntry.DISKSIZE) : "",
    storage_type: storageEntry ? inferStorageType(storageEntry.TYPE || storageEntry.MODEL || "") : "HDD",
    ram_amount: ramGB,
    ram_slots: memList.length,
    ram_speed: ramSpeedRaw > 0 ? `${ramSpeedRaw} MHz` : "",
    ram_generation: inferRamGeneration(firstMem.TYPE, ramSpeedRaw > 0 ? ramSpeedRaw : null),
    ram_format: inferRamFormat(biosEntry.TYPE),
    operating_system: (hw.OSNAME || "").trim(),
    peripherals_mouse: periph.mouse,
    peripherals_keyboard: periph.keyboard,
    peripherals_monitor: periph.monitor,
    peripherals_camera: periph.camera,
    ocs_id: parseInt(id),
    ocs_lastdate: hw.LASTDATE || "",
    ocs_is_outdated: false,
    ocs_days_without_report: 0,
  };
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

    console.log("[OCS Sync] Iniciando sincronización...");

    // Crear registro de log
    const syncLog = await base44.asServiceRole.entities.OcsSyncLog.create({
      started_at: new Date().toISOString(),
      status: "running",
    });

    const stats = {
      total_ids: 0, skipped_outdated: 0, processed: 0,
      created: 0, updated: 0, no_changes: 0,
      deduplicated: 0, marked_outdated: 0, errors: 0,
      error_details: [],
    };

    // 1. Obtener lista de IDs
    let idList = [];
    try {
      const listResp = await ocsGet("/computers/listID");
      idList = Array.isArray(listResp) ? listResp.map(e => e.ID) : [];
    } catch (e) {
      await base44.asServiceRole.entities.OcsSyncLog.update(syncLog.id, {
        finished_at: new Date().toISOString(),
        status: "failed",
        error_details: JSON.stringify([`Error obteniendo lista: ${e.message}`]),
      });
      return Response.json({ error: `No se pudo conectar a OCS: ${e.message}` }, { status: 502 });
    }

    stats.total_ids = idList.length;
    console.log(`[OCS Sync] ${idList.length} IDs obtenidos`);

    // 2. Cargar equipos existentes en el sistema
    const existingEquipment = await base44.asServiceRole.entities.Equipment.list("asset_number", 2000);
    const bySerial = {};
    const byAsset = {};
    existingEquipment.forEach(e => {
      if (e.serial_number && e.serial_number.trim()) bySerial[e.serial_number.trim().toUpperCase()] = e;
      if (e.asset_number && e.asset_number.trim()) byAsset[e.asset_number.trim().toUpperCase()] = e;
    });

    // 3. Procesar equipos activos en OCS (para marcar outdated los que no aparecen)
    const seenEquipmentIds = new Set();

    // Deduplicación OCS: agrupar por serial, quedarse con el más reciente
    const ocsDataMap = {}; // key: serial o asset → normalized data

    for (const id of idList) {
      try {
        // Primero solo hardware para filtrar por fecha
        const hwData = await fetchSection(id, "hardware");
        if (!hwData) { stats.errors++; continue; }

        const days = daysSince(hwData.LASTDATE);
        if (days > MAX_DAYS) {
          stats.skipped_outdated++;
          continue;
        }

        // Fetch todas las secciones
        const [bios, cpus, storages, memories, inputs, monitors, usbdevices] = await Promise.all([
          fetchSection(id, "bios"),
          fetchSection(id, "cpus"),
          fetchSection(id, "storages"),
          fetchSection(id, "memories"),
          fetchSection(id, "inputs"),
          fetchSection(id, "monitors"),
          fetchSection(id, "usbdevices"),
        ]);

        const normalized = normalizeEquipment(id, hwData, bios, cpus, storages, memories, inputs, monitors, usbdevices);

        // Deduplicación: key primaria = serial, secundaria = asset
        const dedupeKey = normalized.serial_number
          ? `SN:${normalized.serial_number.toUpperCase()}`
          : `AN:${normalized.asset_number.toUpperCase()}`;

        if (ocsDataMap[dedupeKey]) {
          // Quedarse con el más reciente
          const existing = ocsDataMap[dedupeKey];
          if (daysSince(normalized.ocs_lastdate) < daysSince(existing.ocs_lastdate)) {
            ocsDataMap[dedupeKey] = normalized;
          }
          stats.deduplicated++;
        } else {
          ocsDataMap[dedupeKey] = normalized;
        }

        stats.processed++;
      } catch (e) {
        stats.errors++;
        stats.error_details.push(`ID ${id}: ${e.message}`);
        console.error(`[OCS Sync] Error en ID ${id}: ${e.message}`);
      }
    }

    console.log(`[OCS Sync] ${stats.processed} procesados, ${stats.deduplicated} deduplicados`);

    // 4. Sincronizar con el sistema
    for (const normalized of Object.values(ocsDataMap)) {
      try {
        // Buscar existente: primero por serial, luego por asset
        let existingRec = null;
        if (normalized.serial_number) existingRec = bySerial[normalized.serial_number.toUpperCase()];
        if (!existingRec && normalized.asset_number) existingRec = byAsset[normalized.asset_number.toUpperCase()];

        if (existingRec) {
          seenEquipmentIds.add(existingRec.id);
          // Calcular diff: solo campos técnicos, nunca campos protegidos
          const changes = {};
          const changeLogs = [];

          for (const field of OCS_UPDATABLE_FIELDS) {
            if (PROTECTED_FIELDS.has(field)) continue;
            const newVal = normalized[field];
            const oldVal = existingRec[field];

            // No actualizar si el valor nuevo es vacío/null/undefined
            if (newVal === "" || newVal === null || newVal === undefined) continue;

            const newStr = String(newVal);
            const oldStr = oldVal !== undefined && oldVal !== null ? String(oldVal) : "";

            if (newStr !== oldStr) {
              changes[field] = newVal;
              changeLogs.push({ field, old: oldStr, new: newStr });
            }
          }

          if (Object.keys(changes).length > 0) {
            await base44.asServiceRole.entities.Equipment.update(existingRec.id, changes);

            // Registrar historial
            for (const cl of changeLogs) {
              await base44.asServiceRole.entities.EquipmentChangeLog.create({
                equipment_id: existingRec.id,
                asset_number: existingRec.asset_number,
                field_name: cl.field,
                old_value: cl.old,
                new_value: cl.new,
                source: "OCS Inventory",
                ocs_lastdate: normalized.ocs_lastdate,
              });
            }
            stats.updated++;
          } else {
            stats.no_changes++;
          }
        } else {
          // Equipo nuevo: crear como disponible
          if (!normalized.asset_number) continue;
          const newEquip = {
            ...normalized,
            status: "disponible",
            brand: normalized.brand || "Sin datos",
            model: normalized.model || "Sin datos",
            serial_number: normalized.serial_number || "S/N",
          };
          const created = await base44.asServiceRole.entities.Equipment.create(newEquip);
          seenEquipmentIds.add(created.id);
          stats.created++;
        }
      } catch (e) {
        stats.errors++;
        stats.error_details.push(`${normalized.asset_number}: ${e.message}`);
        console.error(`[OCS Sync] Error procesando ${normalized.asset_number}: ${e.message}`);
      }
    }

    // 5. Marcar como outdated los equipos que no aparecieron en este sync
    for (const eq of existingEquipment) {
      if (seenEquipmentIds.has(eq.id)) continue;
      if (!eq.ocs_id) continue; // Solo marcar los que alguna vez vinieron de OCS

      const days = daysSince(eq.ocs_lastdate);
      if (days > MAX_DAYS && !eq.ocs_is_outdated) {
        await base44.asServiceRole.entities.Equipment.update(eq.id, {
          ocs_is_outdated: true,
          ocs_days_without_report: days,
        });
        stats.marked_outdated++;
      }
    }

    // Actualizar log de sync
    await base44.asServiceRole.entities.OcsSyncLog.update(syncLog.id, {
      finished_at: new Date().toISOString(),
      status: "completed",
      total_ids: stats.total_ids,
      skipped_outdated: stats.skipped_outdated,
      processed: stats.processed,
      created: stats.created,
      updated: stats.updated,
      no_changes: stats.no_changes,
      deduplicated: stats.deduplicated,
      marked_outdated: stats.marked_outdated,
      errors: stats.errors,
      error_details: stats.error_details.length ? JSON.stringify(stats.error_details.slice(0, 50)) : null,
    });

    console.log(`[OCS Sync] Completado: ${JSON.stringify(stats)}`);

    return Response.json({
      success: true,
      stats: {
        total_ids: stats.total_ids,
        skipped_outdated: stats.skipped_outdated,
        processed: stats.processed,
        created: stats.created,
        updated: stats.updated,
        no_changes: stats.no_changes,
        deduplicated: stats.deduplicated,
        marked_outdated: stats.marked_outdated,
        errors: stats.errors,
      },
    });

  } catch (error) {
    console.error("[OCS Sync] Error fatal:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});