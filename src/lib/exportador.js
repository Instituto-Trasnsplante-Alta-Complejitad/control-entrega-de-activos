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
 * Calcula el hash SHA-256 de un ArrayBuffer (Web Crypto).
 */
async function sha256(arrayBuffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Sanitiza un ID de registro para usarlo en un nombre de archivo seguro.
 */
function sanitizeId(id) {
  return String(id || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
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
  const { filesManifest, downloaded, failed } = await downloadFilesIntoZip(zip, allFileRefs, { onProgress });
  manifest.files_count = filesManifest.length;
  manifest.files_downloaded = downloaded;
  manifest.files_failed = failed;

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

  const { filesManifest, downloaded, failed } = await downloadFilesIntoZip(zip, allFileRefs, { onProgress });
  zip.file("files-manifest.json", JSON.stringify(filesManifest, null, 2));

  const blob = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
    (meta) => onProgress?.({ type: "zipping", percent: Math.round(meta.percent) })
  );

  return { blob, filesManifest, errors, downloaded, failed };
}

/**
 * Descarga los archivos referenciados y los agrega al ZIP en files/.
 * Devuelve el manifiesto de archivos.
 */
async function downloadFilesIntoZip(zip, fileRefs, { onProgress } = {}) {
  const filesManifest = [];
  let downloaded = 0;
  let failed = 0;

  for (let i = 0; i < fileRefs.length; i++) {
    const ref = fileRefs[i];
    onProgress?.({ type: "file", index: i, total: fileRefs.length, url: ref.url, status: "loading" });

    const baseName = `${ref.entity}_${sanitizeId(ref.record_id)}_${ref.field}`;
    const entry = {
      entidad_origen: ref.entity,
      registro_id: ref.record_id,
      campo: ref.field,
      url_original: ref.url,
      ruta_relativa: null,
      nombre_archivo: null,
      tipo_mime: null,
      tamaño_bytes: null,
      hash_sha256: null,
      estado: "pendiente",
      error: null,
    };

    try {
      const resp = await fetch(ref.url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const hash = await sha256(arrayBuffer);
      const ext = guessExtension(ref.url, blob.type);
      const filename = `${baseName}${ext}`;
      const relPath = `files/${filename}`;
      zip.file(relPath, blob);
      entry.ruta_relativa = relPath;
      entry.nombre_archivo = filename;
      entry.tipo_mime = blob.type || null;
      entry.tamaño_bytes = blob.size;
      entry.hash_sha256 = hash;
      entry.estado = "ok";
      downloaded += 1;
      onProgress?.({ type: "file", index: i, total: fileRefs.length, status: "done" });
    } catch (e) {
      entry.estado = "error";
      entry.error = e.message;
      failed += 1;
      onProgress?.({ type: "file", index: i, total: fileRefs.length, status: "error", error: e.message });
    }
    filesManifest.push(entry);
  }

  return { filesManifest, downloaded, failed };
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