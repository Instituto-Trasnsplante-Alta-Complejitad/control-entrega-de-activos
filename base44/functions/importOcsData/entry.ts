import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PROTECTED_FIELDS = new Set([
  "status", "user_type", "assigned_to", "department",
  "delivery_date", "comments"
]);

const OCS_UPDATABLE_FIELDS = [
  "brand", "model", "serial_number", "username", "processor_model",
  "storage_capacity", "storage_type", "ram_amount", "ram_slots",
  "ram_speed", "ram_generation", "ram_format", "operating_system",
  "ocs_id", "ocs_lastdate", "ocs_is_outdated", "ocs_days_without_report",
  "peripherals_mouse", "peripherals_keyboard", "peripherals_monitor", "peripherals_camera",
  "type", "asset_number"
];

Deno.serve(async (req) => {
  // CORS + preflight para scripts externos
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Sync-Secret",
      },
    });
  }

  try {
    // ── Validar secret (leído dentro del handler para picks frescos) ──
    const SYNC_SECRET = Deno.env.get("OCS_SYNC_SECRET") || "";
    const apiKey = req.headers.get("X-Sync-Secret") || "";
    const headerPresent = apiKey !== "";
    const secretConfigured = SYNC_SECRET !== "";

    // Logs seguros — nunca exponer el valor completo del secret
    console.log("[importOcsData] Header X-Sync-Secret presente:", headerPresent);
    console.log("[importOcsData] OCS_SYNC_SECRET configurado:", secretConfigured);
    if (headerPresent && secretConfigured) {
      const headerTail = apiKey.slice(-4);
      const secretTail = SYNC_SECRET.slice(-4);
      console.log("[importOcsData] Comparación — header termina en:", headerTail, "| secret termina en:", secretTail, "| coinciden:", apiKey === SYNC_SECRET);
    }

    if (!secretConfigured) {
      console.error("[importOcsData] RECHAZADO: OCS_SYNC_SECRET no está configurado en el entorno");
      return Response.json({ error: "Unauthorized", detail: "secret_not_configured" }, { status: 401 });
    }

    if (!headerPresent || apiKey !== SYNC_SECRET) {
      console.error("[importOcsData] RECHAZADO: header ausente o no coincide");
      return Response.json({ error: "Unauthorized", detail: headerPresent ? "mismatch" : "missing_header" }, { status: 401 });
    }

    console.log("[importOcsData] Autorización OK — procesando importación");
    const body = await req.json();
    const computers = body.computers; // array de equipos normalizados
    const mode = body.mode || "sync"; // "sync" | "preview"

    if (!Array.isArray(computers) || computers.length === 0) {
      return Response.json({ error: "No computers provided" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Cargar equipos existentes
    const existingEquipment = await base44.asServiceRole.entities.Equipment.list("asset_number", 2000);
    const bySerial = {};
    const byAsset = {};
    existingEquipment.forEach(e => {
      if (e.serial_number?.trim()) bySerial[e.serial_number.trim().toUpperCase()] = e;
      if (e.asset_number?.trim()) byAsset[e.asset_number.trim().toUpperCase()] = e;
    });

    const stats = { created: 0, updated: 0, no_changes: 0, errors: 0 };
    const preview = [];

    for (const normalized of computers) {
      try {
        let existingRec = null;
        if (normalized.serial_number) existingRec = bySerial[normalized.serial_number.toUpperCase()];
        if (!existingRec && normalized.asset_number) existingRec = byAsset[normalized.asset_number.toUpperCase()];

        if (existingRec) {
          const changes = {};
          const changeLogs = [];

          for (const field of OCS_UPDATABLE_FIELDS) {
            if (PROTECTED_FIELDS.has(field)) continue;
            const newVal = normalized[field];
            if (newVal === "" || newVal === null || newVal === undefined) continue;
            const newStr = String(newVal);
            const oldStr = existingRec[field] !== undefined && existingRec[field] !== null ? String(existingRec[field]) : "";
            if (newStr !== oldStr) {
              changes[field] = newVal;
              changeLogs.push({ field, old: oldStr, new: newStr });
            }
          }

          if (Object.keys(changes).length > 0) {
            if (mode !== "preview") {
              await base44.asServiceRole.entities.Equipment.update(existingRec.id, changes);
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
            }
            stats.updated++;
            preview.push({ action: "updated", asset_number: normalized.asset_number, changes: changeLogs });
          } else {
            stats.no_changes++;
          }
        } else {
          if (!normalized.asset_number) continue;
          if (mode !== "preview") {
            await base44.asServiceRole.entities.Equipment.create({
              ...normalized,
              status: "disponible",
              brand: normalized.brand || "Sin datos",
              model: normalized.model || "Sin datos",
              serial_number: normalized.serial_number || "S/N",
            });
          }
          stats.created++;
          preview.push({ action: "created", asset_number: normalized.asset_number });
        }
      } catch (e) {
        stats.errors++;
        console.error(`Error procesando ${normalized.asset_number}: ${e.message}`);
      }
    }

    return Response.json({ success: true, mode, stats, preview: preview.slice(0, 100) }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });

  } catch (error) {
    console.error("[importOcsData] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});