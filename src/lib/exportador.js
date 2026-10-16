import { base44 } from "@/api/base44Client";
import JSZip from "jszip";

export const EXPORT_ENTITIES = [
  "AuditLog",
  "ComponentStock",
  "Delivery",
  "Equipment",
  "EquipmentChangeLog",
  "MapaPlano",
  "MapaPunto",
  "OcsSyncLog",
  "Printer",
  "PrinterDelivery",
  "Sede",
  "StockMovement",
  "User",
];

export const APP_NAME = "Control Entrega de activos";
export const FORMAT_VERSION = "1.0";

// Campos que nunca se exportan (contraseñas, tokens, claves, credenciales).
const SENSITIVE_FIELD_RE = /password|passwd|token|secret|api_key|apikey|credential|credential/i;

// Para User solo se exportan campos públicos.
const USER_PUBLIC_FIELDS = [
  "id",
  "email",
  "full_name",
  "role",
  "created_date",
  "updated_date",
  "created_by_id",
];

const FILE_URL_RE = /^https?:\/\/[^/]*base44\.com\//i;

/**
 * Descarga todos los registros de una entidad usando paginación por cursor
 * hasta agotarla. Para User (sin cursor) usa list() con límite alto.
 */
export async function fetchAll(entityName) {
  if (entityName === "User") {
    const page = await base44.entities.User.list({ limit: 5000, sort: "created_date" });
    const items = Array.isArray(page) ? page : page.items || [];
    return items;
  }
  const all = [];
  let cursor = undefined;
  let hasMore = true;
  while (hasMore) {
    const res = await base44.entities[entityName].filter(
      {},
      { limit: 500, sort: "created_date", cursor }
    );
    all.push(...(res.items || []));
    cursor = res.next_cursor;
    hasMore = !!res.has_more && !!cursor;
  }
  return all;
}

/**
 * Limpia un registro: preserva id y campos de sistema, conserva nulls,
 * elimina campos sensibles. Para User aplica lista blanca de campos públicos.
 */
export function sanitizeRecord(record, entityName) {
  const cleaned = {};
  for (const [key, value] of Object.entries(record)) {
    if (entityName === "User" && !USER_PUBLIC_FIELDS.includes(key)) continue;
    if (SENSITIVE_FIELD_RE.test(key)) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

/**
 * Detecta URLs de archivos propios almacenados en Base44 dentro de los registros.
 */
function isBase44FileUrl(value) {
  return typeof value === "string" && FILE_URL_RE.test(value);
}

/**
 * Recorre todos los registros de una entidad y recolecta referencias a archivos.
 */
export function collectFileRefs(records, entityName) {
  const refs = [];
  records.forEach((r) => {
    if (!r || typeof r !== "object") return;
    for (const [key, value] of Object.entries(r)) {
      if (isBase44FileUrl(value)) {
        refs.push({ url: value, entity: entityName, record_id: r.id, field: key });
      }
    }
  });
  return refs;
}

function guessExtension(url, contentType) {
  const m = url.match(/\.([a-z0-9]{2,4})(\?|#|$)/i);
  if (m) return "." + m[1].toLowerCase();
  const map = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
  };
  return map[contentType] || "";
}

/**
 * Descarga un archivo desde una URL y devuelve { blob, filename }.
 */
async function downloadFile(ref, index) {
  const resp = await fetch(ref.url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const blob = await resp.blob();
  const ext = guessExtension(ref.url, blob.type);
  const filename = `file_${String(index + 1).padStart(4, "0")}${ext}`;
  return { blob, filename, contentType: blob.type, size: blob.size };
}

/**
 * Construye el ZIP completo de exportación.
 * onProgress recibe actualizaciones de estado: { type, ... }
 */
export async function buildFullExport({ onProgress } = {}) {
  const zip = new JSZip();
  const manifest = {
    exported_at: new Date().toISOString(),
    app_name: APP_NAME,
    format_version: FORMAT_VERSION,
    entities: {},
    total_records: 0,
    files_count: 0,
  };
  const errors = [];
  const entityCounts = {};
  const allFileRefs = [];

  for (let i = 0; i < EXPORT_ENTITIES.length; i++) {
    const entityName = EXPORT_ENTITIES[i];
    onProgress?.({ type: "entity", entity: entityName, status: "loading", index: i, total: EXPORT_ENTITIES.length });
    try {
      const records = await fetchAll(entityName);
      const cleaned = records.map((r) => sanitizeRecord(r, entityName));
      entityCounts[entityName] = cleaned.length;
      manifest.entities[entityName] = cleaned.length;
      manifest.total_records += cleaned.length;
      zip.file(`data/${entityName}.json`, JSON.stringify(cleaned, null, 2));
      allFileRefs.push(...collectFileRefs(records, entityName));
      onProgress?.({ type: "entity", entity: entityName, status: "done", count: cleaned.length, index: i, total: EXPORT_ENTITIES.length });
    } catch (e) {
      errors.push({ entity: entityName, error: e.message });
      entityCounts[entityName] = 0;
      manifest.entities[entityName] = 0;
      onProgress?.({ type: "entity", entity: entityName, status: "error", error: e.message, index: i, total: EXPORT_ENTITIES.length });
    }
  }

  // Descarga de archivos propios
  const filesManifest = await downloadFilesIntoZip(zip, allFileRefs, { onProgress });
  manifest.files_count = filesManifest.length;

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("files-manifest.json", JSON.stringify(filesManifest, null, 2));

  const blob = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
    (meta) => onProgress?.({ type: "zipping", percent: Math.round(meta.percent) })
  );

  return { blob, manifest, filesManifest, errors, entityCounts };
}

/**
 * Descarga solo los archivos propios en un ZIP (files/ + files-manifest.json).
 */
export async function buildFilesOnlyZip({ onProgress } = {}) {
  const zip = new JSZip();
  const errors = [];
  const allFileRefs = [];

  for (let i = 0; i < EXPORT_ENTITIES.length; i++) {
    const entityName = EXPORT_ENTITIES[i];
    onProgress?.({ type: "scan", entity: entityName, index: i, total: EXPORT_ENTITIES.length });
    try {
      const records = await fetchAll(entityName);
      allFileRefs.push(...collectFileRefs(records, entityName));
    } catch (e) {
      errors.push({ entity: entityName, error: e.message });
    }
  }

  const filesManifest = await downloadFilesIntoZip(zip, allFileRefs, { onProgress });
  zip.file("files-manifest.json", JSON.stringify(filesManifest, null, 2));

  const blob = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
    (meta) => onProgress?.({ type: "zipping", percent: Math.round(meta.percent) })
  );

  return { blob, filesManifest, errors };
}

/**
 * Descarga los archivos referenciados y los agrega al ZIP en files/.
 * Devuelve el manifiesto de archivos.
 */
async function downloadFilesIntoZip(zip, fileRefs, { onProgress } = {}) {
  const filesManifest = [];
  const errors = [];
  // Deduplica por URL conservando la primera referencia
  const unique = [];
  const seen = new Set();
  for (const ref of fileRefs) {
    if (!seen.has(ref.url)) {
      seen.add(ref.url);
      unique.push(ref);
    }
  }

  for (let i = 0; i < unique.length; i++) {
    const ref = unique[i];
    onProgress?.({ type: "file", index: i, total: unique.length, url: ref.url, status: "loading" });
    try {
      const { blob, filename, contentType, size } = await downloadFile(ref, i);
      zip.file(`files/${filename}`, blob);
      const usedBy = fileRefs
        .filter((f) => f.url === ref.url)
        .map((f) => ({ entity: f.entity, record_id: f.record_id, field: f.field }));
      filesManifest.push({
        original_url: ref.url,
        filename,
        content_type: contentType,
        size,
        used_by: usedBy,
      });
      onProgress?.({ type: "file", index: i, total: unique.length, status: "done" });
    } catch (e) {
      errors.push({ file: ref.url, error: e.message });
      onProgress?.({ type: "file", index: i, total: unique.length, status: "error", error: e.message });
    }
  }

  if (errors.length) {
    zip.file("files-errors.json", JSON.stringify(errors, null, 2));
  }
  return filesManifest;
}

/**
 * Exporta una sola entidad como array JSON (para descarga por partes).
 */
export async function exportSingleEntity(entityName) {
  const records = await fetchAll(entityName);
  return records.map((r) => sanitizeRecord(r, entityName));
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, filename);
}