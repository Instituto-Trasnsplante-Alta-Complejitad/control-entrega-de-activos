const commonFields = ["id", "created_date", "updated_date", "created_by", "created_by_id", "is_sample"];

const definitions = {
  AuditLog: ["usuario_email", "usuario_nombre", "accion", "entidad", "entidad_id", "entidad_label", "valor_anterior", "valor_nuevo", "observacion", "fecha"],
  ComponentStock: ["categoria", "tipo", "codigo", "marca", "modelo", "capacidad", "compatibilidad", "cantidad_actual", "cantidad_minima", "proveedor", "ubicacion", "notas", "estado"],
  Delivery: ["equipment_id", "recipient_name", "recipient_email", "recipient_dni", "recipient_address", "recipient_city", "department", "delivery_date", "equipment_type", "equipment_brand", "equipment_model", "equipment_serial", "equipment_asset", "status", "acceptance_date"],
  Equipment: ["asset_number", "type", "subtype", "brand", "model", "serial_number", "status", "user_type", "assigned_to", "username", "department", "sede_id", "plano_id", "ubicacion_detalle", "delivery_date", "comments", "peripherals_mouse", "peripherals_keyboard", "peripherals_monitor", "peripherals_camera", "processor_model", "storage_capacity", "storage_type", "ram_amount", "ram_slots", "ram_speed", "ram_generation", "ram_format", "operating_system", "ocs_id", "ocs_lastdate", "ocs_is_outdated", "ocs_days_without_report"],
  EquipmentChangeLog: ["equipment_id", "asset_number", "field_name", "old_value", "new_value", "source", "ocs_lastdate", "ticket_id"],
  MapaPlano: ["sede_id", "nombre", "imagen_url", "imagen_path", "orden"],
  MapaPunto: ["sede_id", "plano_id", "equipo_id", "items", "x", "y", "observacion"],
  OcsSyncLog: ["started_at", "finished_at", "total_ids", "skipped_outdated", "processed", "created", "updated", "no_changes", "deduplicated", "marked_outdated", "errors", "error_details", "status"],
  Printer: ["numero", "printer_id", "marca", "modelo", "piso", "sector", "edificio", "sede_id", "plano_id", "ubicacion_detalle", "conexion", "toner", "unidad_imagen", "proveedor", "notas", "estado"],
  PrinterDelivery: ["printer_id_ref", "printer_asset_id", "printer_marca", "printer_modelo", "printer_piso", "printer_sector", "printer_edificio", "printer_conexion", "toner_codigo", "toner_cantidad_solicitada", "toner_cantidad_entregada", "toner_stock_id", "unidad_imagen_codigo", "unidad_imagen_cantidad_solicitada", "unidad_imagen_cantidad_entregada", "unidad_imagen_stock_id", "receptor_nombre", "receptor_sector", "fecha_entrega", "usuario_responsable", "observaciones", "estado"],
  Sede: ["nombre", "direccion", "descripcion", "estado"],
  StockMovement: ["component_stock_id", "codigo", "tipo_movimiento", "cantidad", "cantidad_anterior", "cantidad_nueva", "motivo", "referencia_id", "referencia_tipo", "usuario_responsable", "fecha", "observaciones"],
};

const delegateNames = {
  AuditLog: "auditLog",
  ComponentStock: "componentStock",
  Delivery: "delivery",
  Equipment: "equipment",
  EquipmentChangeLog: "equipmentChangeLog",
  MapaPlano: "mapaPlano",
  MapaPunto: "mapaPunto",
  OcsSyncLog: "ocsSyncLog",
  Printer: "printer",
  PrinterDelivery: "printerDelivery",
  Sede: "sede",
  StockMovement: "stockMovement",
};

export function getEntityDefinition(name) {
  if (name === "User") {
    return {
      name,
      delegateName: "appUser",
      fields: new Set(["id", "issuer", "subject", "email", "displayName", "realmRoles", "groups", "createdAt", "updatedAt"]),
      writableFields: new Set(),
      readOnly: true,
    };
  }

  const fields = definitions[name];
  if (!fields) return null;

  return {
    name,
    delegateName: delegateNames[name],
    fields: new Set([...commonFields, ...fields]),
    writableFields: new Set([...fields, "created_by", "created_by_id", "is_sample"]),
    readOnly: false,
  };
}

export function pickAllowed(data, allowedFields) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return Object.fromEntries(
    Object.entries(data).filter(([key, value]) => allowedFields.has(key) && value !== undefined),
  );
}

export function parseSort(rawSort, fields) {
  const value = typeof rawSort === "string" && rawSort ? rawSort : "created_date";
  const descending = value.startsWith("-");
  const field = descending ? value.slice(1) : value;
  const fallback = fields.has("created_date") ? "created_date" : "createdAt";
  return { [fields.has(field) ? field : fallback]: descending ? "desc" : "asc" };
}

export function parseFilter(rawFilter, fields) {
  if (!rawFilter) return {};
  let parsed;
  try {
    parsed = JSON.parse(rawFilter);
  } catch {
    throw Object.assign(new Error("Filtro inválido"), { status: 400 });
  }
  return pickAllowed(parsed, fields);
}
