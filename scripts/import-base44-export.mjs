import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const entityDefinitions = {
  AuditLog: {
    delegate: "auditLog",
    fields: ["id", "usuario_email", "usuario_nombre", "accion", "entidad", "entidad_id", "entidad_label", "valor_anterior", "valor_nuevo", "observacion", "fecha", "created_date", "updated_date", "created_by", "created_by_id", "is_sample"],
    required: ["id", "usuario_email", "accion", "entidad"],
  },
  ComponentStock: {
    delegate: "componentStock",
    fields: ["id", "categoria", "tipo", "codigo", "marca", "modelo", "capacidad", "compatibilidad", "cantidad_actual", "cantidad_minima", "proveedor", "ubicacion", "notas", "estado", "created_date", "updated_date", "created_by", "created_by_id", "is_sample"],
    required: ["id", "categoria", "tipo", "codigo"],
    numbers: ["cantidad_actual", "cantidad_minima"],
  },
  Delivery: {
    delegate: "delivery",
    fields: ["id", "equipment_id", "recipient_name", "recipient_email", "recipient_dni", "recipient_address", "recipient_city", "department", "delivery_date", "equipment_type", "equipment_brand", "equipment_model", "equipment_serial", "equipment_asset", "status", "acceptance_date", "created_date", "updated_date", "created_by", "created_by_id", "is_sample"],
    required: ["id", "equipment_id", "recipient_name", "recipient_email", "delivery_date"],
  },
  Equipment: {
    delegate: "equipment",
    fields: ["id", "asset_number", "type", "subtype", "brand", "model", "serial_number", "status", "user_type", "assigned_to", "username", "department", "sede_id", "plano_id", "ubicacion_detalle", "delivery_date", "comments", "peripherals_mouse", "peripherals_keyboard", "peripherals_monitor", "peripherals_camera", "processor_model", "storage_capacity", "storage_type", "ram_amount", "ram_slots", "ram_speed", "ram_generation", "ram_format", "operating_system", "ocs_id", "ocs_lastdate", "ocs_is_outdated", "ocs_days_without_report", "created_date", "updated_date", "created_by", "created_by_id", "is_sample"],
    required: ["id", "asset_number", "type", "brand", "model", "serial_number"],
    numbers: ["ram_slots", "ocs_id", "ocs_days_without_report"],
    booleans: ["peripherals_mouse", "peripherals_keyboard", "peripherals_monitor", "peripherals_camera", "ocs_is_outdated", "is_sample"],
  },
  EquipmentChangeLog: {
    delegate: "equipmentChangeLog",
    fields: ["id", "equipment_id", "asset_number", "field_name", "old_value", "new_value", "source", "ocs_lastdate", "ticket_id", "created_date", "updated_date", "created_by", "created_by_id", "is_sample"],
    required: ["id", "equipment_id", "field_name", "source"],
  },
  MapaPlano: {
    delegate: "mapaPlano",
    fields: ["id", "sede_id", "nombre", "imagen_url", "orden", "created_date", "updated_date", "created_by", "created_by_id", "is_sample"],
    required: ["id", "sede_id", "nombre", "imagen_url"],
    numbers: ["orden"],
  },
  MapaPunto: {
    delegate: "mapaPunto",
    fields: ["id", "sede_id", "plano_id", "equipo_id", "items", "x", "y", "observacion", "created_date", "updated_date", "created_by", "created_by_id", "is_sample"],
    required: ["id", "sede_id", "plano_id", "x", "y"],
    numbers: ["x", "y"],
    json: ["items"],
  },
  OcsSyncLog: {
    delegate: "ocsSyncLog",
    fields: ["id", "started_at", "finished_at", "total_ids", "skipped_outdated", "processed", "created", "updated", "no_changes", "deduplicated", "marked_outdated", "errors", "error_details", "status", "created_date", "updated_date", "created_by", "created_by_id", "is_sample"],
    required: ["id", "started_at"],
    numbers: ["total_ids", "skipped_outdated", "processed", "created", "updated", "no_changes", "deduplicated", "marked_outdated", "errors"],
  },
  Printer: {
    delegate: "printer",
    fields: ["id", "numero", "printer_id", "marca", "modelo", "piso", "sector", "edificio", "sede_id", "plano_id", "ubicacion_detalle", "conexion", "toner", "unidad_imagen", "proveedor", "notas", "estado", "created_date", "updated_date", "created_by", "created_by_id", "is_sample"],
    required: ["id", "printer_id", "marca", "modelo"],
    numbers: ["numero"],
  },
  PrinterDelivery: {
    delegate: "printerDelivery",
    fields: ["id", "printer_id_ref", "printer_asset_id", "printer_marca", "printer_modelo", "printer_piso", "printer_sector", "printer_edificio", "printer_conexion", "toner_codigo", "toner_cantidad_solicitada", "toner_cantidad_entregada", "toner_stock_id", "unidad_imagen_codigo", "unidad_imagen_cantidad_solicitada", "unidad_imagen_cantidad_entregada", "unidad_imagen_stock_id", "receptor_nombre", "receptor_sector", "fecha_entrega", "usuario_responsable", "observaciones", "estado", "created_date", "updated_date", "created_by", "created_by_id", "is_sample"],
    required: ["id", "printer_id_ref", "fecha_entrega"],
    numbers: ["toner_cantidad_solicitada", "toner_cantidad_entregada", "unidad_imagen_cantidad_solicitada", "unidad_imagen_cantidad_entregada"],
  },
  Sede: {
    delegate: "sede",
    fields: ["id", "nombre", "direccion", "descripcion", "estado", "created_date", "updated_date", "created_by", "created_by_id", "is_sample"],
    required: ["id", "nombre"],
  },
  StockMovement: {
    delegate: "stockMovement",
    fields: ["id", "component_stock_id", "codigo", "tipo_movimiento", "cantidad", "cantidad_anterior", "cantidad_nueva", "motivo", "referencia_id", "referencia_tipo", "usuario_responsable", "fecha", "observaciones", "created_date", "updated_date", "created_by", "created_by_id", "is_sample"],
    required: ["id", "component_stock_id", "tipo_movimiento", "cantidad", "fecha"],
    numbers: ["cantidad", "cantidad_anterior", "cantidad_nueva"],
  },
};

const importOrder = [
  "Sede",
  "Equipment",
  "ComponentStock",
  "Printer",
  "MapaPlano",
  "MapaPunto",
  "Delivery",
  "EquipmentChangeLog",
  "PrinterDelivery",
  "StockMovement",
  "OcsSyncLog",
  "AuditLog",
];

function parseArguments(argv) {
  const options = { source: null, apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--source") options.source = argv[++index];
    else if (argument === "--apply") options.apply = true;
    else if (argument === "--dry-run") options.apply = false;
    else throw new Error(`Argumento desconocido: ${argument}`);
  }
  if (!options.source) throw new Error("Se requiere --source <directorio-exportado>");
  return options;
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function parseDate(value, label) {
  if (!hasValue(value)) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Fecha inválida en ${label}: ${value}`);
  return parsed;
}

function normalizeRecord(entityName, sourceRecord, rowNumber) {
  const definition = entityDefinitions[entityName];
  const record = {};
  for (const field of definition.fields) {
    if (Object.hasOwn(sourceRecord, field) && sourceRecord[field] !== null) {
      record[field] = sourceRecord[field];
    }
  }

  for (const field of ["created_date", "updated_date"]) {
    if (Object.hasOwn(record, field)) record[field] = parseDate(record[field], `${entityName}[${rowNumber}].${field}`);
  }

  for (const field of definition.numbers || []) {
    if (!hasValue(record[field])) {
      delete record[field];
      continue;
    }
    record[field] = Number(record[field]);
    if (!Number.isFinite(record[field])) throw new Error(`Número inválido en ${entityName}[${rowNumber}].${field}`);
  }

  for (const field of definition.booleans || []) {
    if (record[field] === "true") record[field] = true;
    if (record[field] === "false") record[field] = false;
  }

  for (const field of definition.json || []) {
    if (!Object.hasOwn(record, field)) record[field] = [];
    else if (typeof record[field] === "string") {
      try {
        record[field] = JSON.parse(record[field]);
      } catch {
        throw new Error(`JSON inválido en ${entityName}[${rowNumber}].${field}`);
      }
    }
  }

  if (entityName === "ComponentStock" && !hasValue(record.tipo)) record.tipo = "sin_especificar";
  if (!record.updated_date) record.updated_date = record.created_date || new Date();
  if (!record.created_date) record.created_date = record.updated_date;

  const missing = definition.required.filter((field) => !hasValue(record[field]));
  if (missing.length > 0) {
    throw new Error(`${entityName}[${rowNumber}] no contiene campos obligatorios: ${missing.join(", ")}`);
  }
  return record;
}

async function loadExport(sourceDirectory) {
  const sourceRoot = path.resolve(sourceDirectory);
  const dataDirectory = path.join(sourceRoot, "data");
  const manifestPath = path.join(sourceRoot, "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const records = {};
  const digest = crypto.createHash("sha256");

  for (const entityName of Object.keys(entityDefinitions)) {
    const filePath = path.join(dataDirectory, `${entityName}.json`);
    const content = await fs.readFile(filePath, "utf8");
    digest.update(`${entityName}\0`).update(content);
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) throw new Error(`${entityName}.json no contiene un arreglo`);
    if (manifest.entities?.[entityName] !== parsed.length) {
      throw new Error(`${entityName}: el manifiesto indica ${manifest.entities?.[entityName]} registros pero el archivo contiene ${parsed.length}`);
    }
    const normalized = parsed.map((record, index) => normalizeRecord(entityName, record, index));
    const ids = new Set(normalized.map((record) => record.id));
    if (ids.size !== normalized.length) throw new Error(`${entityName} contiene IDs duplicados`);
    records[entityName] = normalized;
  }

  return { manifest, records, sourceHash: digest.digest("hex") };
}

function validateRelations(records) {
  const ids = Object.fromEntries(Object.entries(records).map(([name, rows]) => [name, new Set(rows.map((row) => row.id))]));
  const checks = [
    ["Delivery", "equipment_id", "Equipment", false],
    ["EquipmentChangeLog", "equipment_id", "Equipment", false],
    ["MapaPlano", "sede_id", "Sede", false],
    ["MapaPunto", "sede_id", "Sede", false],
    ["MapaPunto", "plano_id", "MapaPlano", false],
    ["MapaPunto", "equipo_id", "Equipment", true],
    ["PrinterDelivery", "printer_id_ref", "Printer", false],
  ];
  for (const [entity, field, target, optional] of checks) {
    const orphans = records[entity].filter((row) => (!optional || hasValue(row[field])) && !ids[target].has(row[field]));
    if (orphans.length > 0) throw new Error(`${entity}.${field} contiene ${orphans.length} referencias inexistentes a ${target}`);
  }

  const componentIds = ids.ComponentStock;
  const orphanMovements = records.StockMovement.filter((row) => !componentIds.has(row.component_stock_id));
  const grouped = new Map();
  for (const movement of orphanMovements) {
    const existing = grouped.get(movement.component_stock_id) || [];
    existing.push(movement);
    grouped.set(movement.component_stock_id, existing);
  }

  const placeholders = [];
  for (const [componentId, movements] of grouped) {
    const ordered = [...movements].sort((left, right) => left.created_date - right.created_date);
    const first = ordered[0];
    const last = ordered.at(-1);
    placeholders.push({
      id: componentId,
      categoria: "historico",
      tipo: "sin_especificar",
      codigo: hasValue(first.codigo) ? String(first.codigo) : `LEGACY-${componentId.slice(0, 12)}`,
      cantidad_actual: Number.isFinite(last.cantidad_nueva) ? last.cantidad_nueva : 0,
      cantidad_minima: 0,
      notas: "Registro técnico reconstruido durante la migración para conservar movimientos históricos de Base44.",
      estado: "historico",
      created_date: first.created_date,
      updated_date: last.updated_date,
      created_by: first.created_by,
      created_by_id: first.created_by_id,
      is_sample: false,
    });
  }
  records.ComponentStock.push(...placeholders);
  return { placeholderComponents: placeholders.length, orphanMovements: orphanMovements.length };
}

function printSummary(manifest, records, sourceHash, repairs, mode) {
  console.log(`Exportación: ${manifest.exported_at}`);
  console.log(`SHA-256 de datos: ${sourceHash}`);
  console.log(`Modo: ${mode}`);
  for (const entityName of importOrder) console.log(`${entityName}: ${records[entityName].length}`);
  console.log(`Componentes históricos reconstruidos: ${repairs.placeholderComponents}`);
  console.log(`Movimientos históricos preservados: ${repairs.orphanMovements}`);
  console.log(`Planos con imágenes externas pendientes: ${records.MapaPlano.filter((row) => /^https?:\/\//i.test(row.imagen_url)).length}`);
}

async function importRecords(records) {
  const { prisma } = await import("../server/prisma.js");
  try {
    const existingCounts = {};
    for (const entityName of importOrder) {
      const definition = entityDefinitions[entityName];
      existingCounts[entityName] = await prisma[definition.delegate].count();
    }
    const occupied = Object.entries(existingCounts).filter(([, count]) => count > 0);
    if (occupied.length > 0) {
      throw new Error(`La importación se canceló porque las tablas de destino no están vacías: ${occupied.map(([name, count]) => `${name}=${count}`).join(", ")}`);
    }

    const inserted = await prisma.$transaction(async (transaction) => {
      const result = {};
      for (const entityName of importOrder) {
        const definition = entityDefinitions[entityName];
        const operation = await transaction[definition.delegate].createMany({ data: records[entityName] });
        result[entityName] = operation.count;
      }
      return result;
    }, { maxWait: 10_000, timeout: 120_000 });

    for (const entityName of importOrder) {
      if (inserted[entityName] !== records[entityName].length) {
        throw new Error(`${entityName}: se esperaban ${records[entityName].length} inserciones y se informaron ${inserted[entityName]}`);
      }
      const stored = await prisma[entityDefinitions[entityName].delegate].count();
      if (stored !== records[entityName].length) {
        throw new Error(`${entityName}: verificación posterior incorrecta, quedaron ${stored} registros`);
      }
    }
    console.log(`Importación confirmada: ${Object.values(inserted).reduce((total, count) => total + count, 0)} registros.`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const { manifest, records, sourceHash } = await loadExport(options.source);
  const repairs = validateRelations(records);
  printSummary(manifest, records, sourceHash, repairs, options.apply ? "APLICAR" : "SIMULACIÓN");
  if (!options.apply) {
    console.log("Simulación correcta. No se modificó la base de datos.");
    return;
  }
  await importRecords(records);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
