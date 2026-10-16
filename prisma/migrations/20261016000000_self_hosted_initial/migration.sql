-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "app_user" (
    "id" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "realmRoles" JSONB NOT NULL DEFAULT '[]',
    "groups" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "usuario_email" TEXT NOT NULL,
    "usuario_nombre" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT,
    "entidad_label" TEXT,
    "valor_anterior" TEXT,
    "valor_nuevo" TEXT,
    "observacion" TEXT,
    "fecha" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_id" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_stock" (
    "id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "capacidad" TEXT,
    "compatibilidad" TEXT,
    "cantidad_actual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cantidad_minima" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "proveedor" TEXT,
    "ubicacion" TEXT,
    "notas" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'disponible',
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_id" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "component_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "asset_number" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disponible',
    "user_type" TEXT,
    "assigned_to" TEXT,
    "username" TEXT,
    "department" TEXT,
    "sede_id" TEXT,
    "plano_id" TEXT,
    "ubicacion_detalle" TEXT,
    "delivery_date" TEXT,
    "comments" TEXT,
    "peripherals_mouse" BOOLEAN NOT NULL DEFAULT false,
    "peripherals_keyboard" BOOLEAN NOT NULL DEFAULT false,
    "peripherals_monitor" BOOLEAN NOT NULL DEFAULT false,
    "peripherals_camera" BOOLEAN NOT NULL DEFAULT false,
    "processor_model" TEXT,
    "storage_capacity" TEXT,
    "storage_type" TEXT,
    "ram_amount" TEXT,
    "ram_slots" DOUBLE PRECISION,
    "ram_speed" TEXT,
    "ram_generation" TEXT,
    "ram_format" TEXT,
    "operating_system" TEXT,
    "ocs_id" DOUBLE PRECISION,
    "ocs_lastdate" TEXT,
    "ocs_is_outdated" BOOLEAN NOT NULL DEFAULT false,
    "ocs_days_without_report" DOUBLE PRECISION,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_id" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "recipient_dni" TEXT,
    "recipient_address" TEXT,
    "recipient_city" TEXT,
    "department" TEXT,
    "delivery_date" TEXT NOT NULL,
    "equipment_type" TEXT,
    "equipment_brand" TEXT,
    "equipment_model" TEXT,
    "equipment_serial" TEXT,
    "equipment_asset" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "acceptance_date" TEXT,
    "acceptance_token_hash" TEXT,
    "acceptance_token_issued_at" TIMESTAMP(3),
    "acceptance_token_expires_at" TIMESTAMP(3),
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_id" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_change_log" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "asset_number" TEXT,
    "field_name" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "source" TEXT NOT NULL,
    "ocs_lastdate" TEXT,
    "ticket_id" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_id" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "equipment_change_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sede" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_id" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapa_plano" (
    "id" TEXT NOT NULL,
    "sede_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "imagen_url" TEXT NOT NULL,
    "imagen_path" TEXT,
    "orden" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_id" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "mapa_plano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapa_punto" (
    "id" TEXT NOT NULL,
    "sede_id" TEXT NOT NULL,
    "plano_id" TEXT NOT NULL,
    "equipo_id" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "observacion" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_id" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "mapa_punto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocs_sync_log" (
    "id" TEXT NOT NULL,
    "started_at" TEXT NOT NULL,
    "finished_at" TEXT,
    "total_ids" DOUBLE PRECISION,
    "skipped_outdated" DOUBLE PRECISION,
    "processed" DOUBLE PRECISION,
    "created" DOUBLE PRECISION,
    "updated" DOUBLE PRECISION,
    "no_changes" DOUBLE PRECISION,
    "deduplicated" DOUBLE PRECISION,
    "marked_outdated" DOUBLE PRECISION,
    "errors" DOUBLE PRECISION,
    "error_details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_id" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ocs_sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "printer" (
    "id" TEXT NOT NULL,
    "numero" DOUBLE PRECISION,
    "printer_id" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "piso" TEXT,
    "sector" TEXT,
    "edificio" TEXT,
    "sede_id" TEXT,
    "plano_id" TEXT,
    "ubicacion_detalle" TEXT,
    "conexion" TEXT,
    "toner" TEXT,
    "unidad_imagen" TEXT,
    "proveedor" TEXT,
    "notas" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_id" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "printer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "printer_delivery" (
    "id" TEXT NOT NULL,
    "printer_id_ref" TEXT NOT NULL,
    "printer_asset_id" TEXT,
    "printer_marca" TEXT,
    "printer_modelo" TEXT,
    "printer_piso" TEXT,
    "printer_sector" TEXT,
    "printer_edificio" TEXT,
    "printer_conexion" TEXT,
    "toner_codigo" TEXT,
    "toner_cantidad_solicitada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "toner_cantidad_entregada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "toner_stock_id" TEXT,
    "unidad_imagen_codigo" TEXT,
    "unidad_imagen_cantidad_solicitada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unidad_imagen_cantidad_entregada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unidad_imagen_stock_id" TEXT,
    "receptor_nombre" TEXT,
    "receptor_sector" TEXT,
    "fecha_entrega" TEXT NOT NULL,
    "usuario_responsable" TEXT,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_id" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "printer_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movement" (
    "id" TEXT NOT NULL,
    "component_stock_id" TEXT NOT NULL,
    "codigo" TEXT,
    "tipo_movimiento" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "cantidad_anterior" DOUBLE PRECISION,
    "cantidad_nueva" DOUBLE PRECISION,
    "motivo" TEXT,
    "referencia_id" TEXT,
    "referencia_tipo" TEXT,
    "usuario_responsable" TEXT,
    "fecha" TEXT NOT NULL,
    "observaciones" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_id" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_user_email_idx" ON "app_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_issuer_subject_key" ON "app_user"("issuer", "subject");

-- CreateIndex
CREATE INDEX "audit_log_entidad_entidad_id_idx" ON "audit_log"("entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "audit_log_created_date_idx" ON "audit_log"("created_date");

-- CreateIndex
CREATE INDEX "component_stock_codigo_idx" ON "component_stock"("codigo");

-- CreateIndex
CREATE INDEX "component_stock_estado_idx" ON "component_stock"("estado");

-- CreateIndex
CREATE INDEX "equipment_asset_number_idx" ON "equipment"("asset_number");

-- CreateIndex
CREATE INDEX "equipment_serial_number_idx" ON "equipment"("serial_number");

-- CreateIndex
CREATE INDEX "equipment_ocs_id_idx" ON "equipment"("ocs_id");

-- CreateIndex
CREATE INDEX "equipment_status_idx" ON "equipment"("status");

-- CreateIndex
CREATE INDEX "equipment_sede_id_plano_id_idx" ON "equipment"("sede_id", "plano_id");

-- CreateIndex
CREATE INDEX "delivery_equipment_id_idx" ON "delivery"("equipment_id");

-- CreateIndex
CREATE INDEX "delivery_recipient_email_idx" ON "delivery"("recipient_email");

-- CreateIndex
CREATE INDEX "delivery_status_idx" ON "delivery"("status");

-- CreateIndex
CREATE INDEX "delivery_acceptance_token_hash_idx" ON "delivery"("acceptance_token_hash");

-- CreateIndex
CREATE INDEX "equipment_change_log_equipment_id_created_date_idx" ON "equipment_change_log"("equipment_id", "created_date");

-- CreateIndex
CREATE INDEX "sede_nombre_idx" ON "sede"("nombre");

-- CreateIndex
CREATE INDEX "mapa_plano_sede_id_orden_idx" ON "mapa_plano"("sede_id", "orden");

-- CreateIndex
CREATE INDEX "mapa_punto_sede_id_plano_id_idx" ON "mapa_punto"("sede_id", "plano_id");

-- CreateIndex
CREATE INDEX "mapa_punto_equipo_id_idx" ON "mapa_punto"("equipo_id");

-- CreateIndex
CREATE INDEX "ocs_sync_log_status_created_date_idx" ON "ocs_sync_log"("status", "created_date");

-- CreateIndex
CREATE INDEX "printer_printer_id_idx" ON "printer"("printer_id");

-- CreateIndex
CREATE INDEX "printer_sede_id_plano_id_idx" ON "printer"("sede_id", "plano_id");

-- CreateIndex
CREATE INDEX "printer_delivery_printer_id_ref_created_date_idx" ON "printer_delivery"("printer_id_ref", "created_date");

-- CreateIndex
CREATE INDEX "stock_movement_component_stock_id_created_date_idx" ON "stock_movement"("component_stock_id", "created_date");

-- AddForeignKey
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_change_log" ADD CONSTRAINT "equipment_change_log_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapa_plano" ADD CONSTRAINT "mapa_plano_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sede"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapa_punto" ADD CONSTRAINT "mapa_punto_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sede"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapa_punto" ADD CONSTRAINT "mapa_punto_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "mapa_plano"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapa_punto" ADD CONSTRAINT "mapa_punto_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "printer_delivery" ADD CONSTRAINT "printer_delivery_printer_id_ref_fkey" FOREIGN KEY ("printer_id_ref") REFERENCES "printer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_component_stock_id_fkey" FOREIGN KEY ("component_stock_id") REFERENCES "component_stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Runtime role: migrations remain owned by control_activos_migrator while the
-- application receives only the data privileges it needs.
GRANT USAGE ON SCHEMA "public" TO "control_activos_app";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "public" TO "control_activos_app";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "public" TO "control_activos_app";
ALTER DEFAULT PRIVILEGES FOR ROLE "control_activos_migrator" IN SCHEMA "public"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "control_activos_app";
ALTER DEFAULT PRIVILEGES FOR ROLE "control_activos_migrator" IN SCHEMA "public"
  GRANT USAGE, SELECT ON SEQUENCES TO "control_activos_app";
