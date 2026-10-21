import fs from "node:fs";
import pg from "pg";

const { Client } = pg;
const OCS_ADVISORY_LOCK_KEY = 240108;

const technicalFields = [
  "asset_number",
  "type",
  "username",
  "brand",
  "model",
  "serial_number",
  "processor_model",
  "storage_capacity",
  "storage_type",
  "ram_amount",
  "ram_slots",
  "ram_speed",
  "ram_generation",
  "operating_system",
  "ocs_id",
  "ocs_lastdate",
  "ocs_is_outdated",
  "ocs_days_without_report",
];

const auditedFields = new Set([
  "asset_number",
  "type",
  "username",
  "brand",
  "model",
  "serial_number",
  "processor_model",
  "storage_capacity",
  "storage_type",
  "ram_amount",
  "ram_slots",
  "ram_speed",
  "ram_generation",
  "operating_system",
  "ocs_is_outdated",
]);

let activeSync = null;

async function acquireGlobalLock() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const result = await client.query(
    "SELECT pg_try_advisory_lock($1) AS acquired",
    [OCS_ADVISORY_LOCK_KEY],
  );
  if (!result.rows[0]?.acquired) {
    await client.end();
    return null;
  }
  return async () => {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [OCS_ADVISORY_LOCK_KEY]);
    } finally {
      await client.end();
    }
  };
}

async function releaseGlobalLockSafely(releaseLock) {
  if (!releaseLock) return;
  try {
    await releaseLock();
  } catch (error) {
    console.error("No se pudo liberar el bloqueo global de OCS:", error);
  }
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readOptionalSecret(valueName, fileName) {
  const direct = String(process.env[valueName] || "").trim();
  if (direct) return direct;
  const filePath = String(process.env[fileName] || "").trim();
  if (!filePath) return "";
  return fs.readFileSync(filePath, "utf8").trim();
}

function ocsConfiguration() {
  const baseUrl = String(process.env.OCS_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!baseUrl) throw new Error("OCS_BASE_URL no está configurada");
  return {
    baseUrl,
    user: readOptionalSecret("OCS_USER", "OCS_USER_FILE"),
    password: readOptionalSecret("OCS_PASSWORD", "OCS_PASSWORD_FILE"),
    timeoutMs: positiveNumber(process.env.OCS_TIMEOUT_MS, 20_000),
    concurrency: Math.min(positiveNumber(process.env.OCS_CONCURRENCY, 6), 12),
    warningHours: positiveNumber(process.env.OCS_WARNING_HOURS, 24),
    createMissing: process.env.OCS_CREATE_MISSING === "true",
  };
}

function requestHeaders(config) {
  const headers = { Accept: "application/json" };
  if (config.user && config.password) {
    headers.Authorization = `Basic ${Buffer.from(`${config.user}:${config.password}`).toString("base64")}`;
  }
  return headers;
}

async function requestJson(config, endpoint) {
  const url = `${config.baseUrl}/${String(endpoint).replace(/^\/+/, "")}`;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: requestHeaders(config),
        signal: AbortSignal.timeout(config.timeoutMs),
      });
      if (!response.ok) {
        const error = new Error(`OCS respondió HTTP ${response.status} en ${endpoint}`);
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt === 2 || error.retryable === false) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function fetchSection(config, computerId, section) {
  const response = await requestJson(config, `computer/${computerId}/${section}`);
  const wrapper = response && typeof response === "object" ? response[String(computerId)] : null;
  return wrapper?.[section] ?? response?.[section] ?? null;
}

function firstRecord(value) {
  if (Array.isArray(value)) return value.find(Boolean) || {};
  return value && typeof value === "object" ? value : {};
}

function parseOcsDate(value) {
  if (!value) return null;
  let normalized = String(value).trim().replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) normalized += "T00:00:00";
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function reportAge(value) {
  const parsed = parseOcsDate(value);
  if (!parsed) return { hours: null, days: null };
  const hours = Math.max(0, (Date.now() - parsed.getTime()) / 3_600_000);
  return { hours, days: hours / 24 };
}

function diskSizeInGb(value) {
  const sizeKb = Number(value);
  return Number.isFinite(sizeKb) && sizeKb > 0 ? `${Math.round(sizeKb / 1024 / 1024)} GB` : "";
}

function storageType(entry) {
  const text = `${entry.TYPE || ""} ${entry.MODEL || ""}`.toUpperCase();
  if (text.includes("NVME") || text.includes("NVM")) return "NVMe";
  if (text.includes("SSD") || text.includes("SOLID")) return "SSD";
  return text ? "HDD" : "";
}

function validSerial(value) {
  const serial = String(value || "").trim();
  if (!serial) return "";
  const invalid = ["S/N", "NONE", "UNKNOWN", "DEFAULT STRING", "TO BE FILLED BY O.E.M."];
  return invalid.includes(serial.toUpperCase()) ? "" : serial;
}

function normalizeKey(value) {
  return String(value || "").trim().toUpperCase();
}

function inferType(assetNumber) {
  return normalizeKey(assetNumber).startsWith("AR2150L") ? "notebook" : "cpu";
}

function normalizeOcsRecord(computerId, hardware, bios, storages, memories) {
  const biosEntry = firstRecord(bios);
  const storageEntry = firstRecord(storages);
  const memoryList = Array.isArray(memories) ? memories : [];
  const validMemories = memoryList.filter((item) => Number(item?.CAPACITY) > 0);
  const firstMemory = firstRecord(validMemories);
  const memoryMb = Number(hardware.MEMORY);
  const memorySpeed = Number(firstMemory.SPEED);
  const assetNumber = String(hardware.NAME || "").trim();
  const lastDate = String(hardware.LASTDATE || "").trim();
  const age = reportAge(lastDate);
  const memoryDescription = `${firstMemory.TYPE || ""} ${firstMemory.DESCRIPTION || ""}`.toUpperCase();
  const generation = memoryDescription.match(/DDR[2-5]/)?.[0] || "";

  return {
    asset_number: assetNumber,
    type: inferType(assetNumber),
    username: String(hardware.USERID || "").trim(),
    brand: String(biosEntry.SMANUFACTURER || "").trim(),
    model: String(biosEntry.SMODEL || "").trim(),
    serial_number: validSerial(biosEntry.SSN),
    processor_model: String(hardware.PROCESSORT || "").replace(/\s+/g, " ").trim(),
    storage_capacity: diskSizeInGb(storageEntry.DISKSIZE),
    storage_type: storageType(storageEntry),
    ram_amount: Number.isFinite(memoryMb) && memoryMb > 0 ? `${Math.round(memoryMb / 1024)} GB` : "",
    ram_slots: validMemories.length || undefined,
    ram_speed: Number.isFinite(memorySpeed) && memorySpeed > 0 ? `${memorySpeed} MHz` : "",
    ram_generation: generation,
    operating_system: String(hardware.OSNAME || "").trim(),
    ocs_id: Number(computerId),
    ocs_lastdate: lastDate,
    ocs_is_outdated: age.hours === null,
    ocs_days_without_report: age.days,
  };
}

function addToIndex(index, value, record) {
  const key = normalizeKey(value);
  if (!key) return;
  const records = index.get(key) || [];
  if (!records.some((item) => item.id === record.id)) records.push(record);
  index.set(key, records);
}

function buildIndexes(records) {
  const indexes = { byOcsId: new Map(), byAsset: new Map(), bySerial: new Map() };
  for (const record of records) {
    addToIndex(indexes.byOcsId, record.ocs_id, record);
    addToIndex(indexes.byAsset, record.asset_number, record);
    addToIndex(indexes.bySerial, validSerial(record.serial_number), record);
  }
  return indexes;
}

function uniqueMatch(index, value) {
  const matches = index.get(normalizeKey(value)) || [];
  return matches.length === 1 ? { record: matches[0], conflict: false }
    : { record: null, conflict: matches.length > 1 };
}

function findMatch(indexes, candidate) {
  for (const [index, value, method] of [
    [indexes.byOcsId, candidate.ocs_id, "ocs_id"],
    [indexes.byAsset, candidate.asset_number, "asset_number"],
    [indexes.bySerial, candidate.serial_number, "serial_number"],
  ]) {
    if (!value) continue;
    const match = uniqueMatch(index, value);
    if (match.conflict) return { record: null, method, conflict: true };
    if (match.record) return { record: match.record, method, conflict: false };
  }
  return { record: null, method: null, conflict: false };
}

function comparable(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function changedData(existing, candidate) {
  const data = {};
  const audit = [];
  for (const field of technicalFields) {
    const value = candidate[field];
    if (value === "" || value === null || value === undefined || Number.isNaN(value)) continue;
    if (comparable(existing[field]) === comparable(value)) continue;
    data[field] = value;
    if (auditedFields.has(field)) audit.push({ field, before: existing[field], after: value });
  }
  return { data, audit };
}

async function mapWithConcurrency(items, limit, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

async function updateExisting(prisma, existing, candidate, actor) {
  const { data, audit } = changedData(existing, candidate);
  if (Object.keys(data).length === 0) return { updated: false, record: existing };
  const operations = [prisma.equipment.update({ where: { id: existing.id }, data })];
  if (audit.length > 0) {
    operations.push(prisma.equipmentChangeLog.createMany({
      data: audit.map((change) => ({
        equipment_id: existing.id,
        asset_number: candidate.asset_number || existing.asset_number,
        field_name: change.field,
        old_value: comparable(change.before),
        new_value: comparable(change.after),
        source: "ocs",
        ocs_lastdate: candidate.ocs_lastdate,
        created_by: actor,
      })),
    }));
  }
  const [record] = await prisma.$transaction(operations);
  return { updated: true, record };
}

function creationData(candidate) {
  return {
    ...candidate,
    asset_number: candidate.asset_number || `OCS-${candidate.ocs_id}`,
    type: candidate.type || "cpu",
    brand: candidate.brand || "Sin datos",
    model: candidate.model || "Sin datos",
    serial_number: candidate.serial_number || "S/N",
    status: "disponible",
  };
}

async function performSync(prisma, log, actor) {
  const counters = {
    total_ids: 0,
    skipped_outdated: 0,
    processed: 0,
    created: 0,
    updated: 0,
    no_changes: 0,
    deduplicated: 0,
    marked_outdated: 0,
    errors: 0,
  };
  const details = { errors: [], conflicts: [], discovered: [] };

  try {
    const config = ocsConfiguration();
    const idResponse = await requestJson(config, "computers/listID");
    const ids = Array.isArray(idResponse)
      ? [...new Set(idResponse.map((entry) => entry?.ID).filter((id) => id !== null && id !== undefined))]
      : [];
    if (ids.length === 0) throw new Error("OCS no devolvió identificadores de equipos");
    counters.total_ids = ids.length;
    await prisma.ocsSyncLog.update({ where: { id: log.id }, data: { total_ids: ids.length } });

    const existingRecords = await prisma.equipment.findMany();
    const indexes = buildIndexes(existingRecords);
    const claimedEquipmentIds = new Set();

    await mapWithConcurrency(ids, config.concurrency, async (computerId) => {
      try {
        const hardware = await fetchSection(config, computerId, "hardware");
        if (!hardware || typeof hardware !== "object") throw new Error("sección hardware vacía");
        const lastDate = String(hardware.LASTDATE || "").trim();
        const age = reportAge(lastDate);
        const preliminary = normalizeOcsRecord(computerId, hardware, null, null, null);
        let match = findMatch(indexes, preliminary);

        if (age.hours === null || age.hours > config.warningHours) {
          counters.skipped_outdated += 1;
          preliminary.ocs_is_outdated = true;
          if (match.conflict) {
            counters.deduplicated += 1;
            if (details.conflicts.length < 100) {
              details.conflicts.push({ computerId, asset: preliminary.asset_number, field: match.method });
            }
          } else if (match.record) {
            if (claimedEquipmentIds.has(match.record.id)) {
              counters.deduplicated += 1;
              if (details.conflicts.length < 100) {
                details.conflicts.push({ computerId, asset: preliminary.asset_number, field: "equipment_claimed" });
              }
            } else {
              claimedEquipmentIds.add(match.record.id);
              const result = await updateExisting(prisma, match.record, preliminary, actor);
              if (result.updated) counters.updated += 1;
              else counters.no_changes += 1;
            }
          } else {
            if (details.discovered.length < 100) {
              details.discovered.push({ computerId, asset: preliminary.asset_number, reason: "outdated" });
            }
          }
          counters.processed += 1;
          return;
        }

        const [biosResult, storagesResult, memoriesResult] = await Promise.allSettled([
          fetchSection(config, computerId, "bios"),
          fetchSection(config, computerId, "storages"),
          fetchSection(config, computerId, "memories"),
        ]);
        const candidate = normalizeOcsRecord(
          computerId,
          hardware,
          biosResult.status === "fulfilled" ? biosResult.value : null,
          storagesResult.status === "fulfilled" ? storagesResult.value : null,
          memoriesResult.status === "fulfilled" ? memoriesResult.value : null,
        );
        candidate.ocs_is_outdated = false;
        match = findMatch(indexes, candidate);

        if (match.conflict) {
          counters.deduplicated += 1;
          if (details.conflicts.length < 100) {
            details.conflicts.push({ computerId, asset: candidate.asset_number, serial: candidate.serial_number, field: match.method });
          }
        } else if (match.record) {
          if (claimedEquipmentIds.has(match.record.id)) {
            counters.deduplicated += 1;
            if (details.conflicts.length < 100) {
              details.conflicts.push({ computerId, asset: candidate.asset_number, field: "equipment_claimed" });
            }
          } else {
            claimedEquipmentIds.add(match.record.id);
            const result = await updateExisting(prisma, match.record, candidate, actor);
            if (result.updated) counters.updated += 1;
            else counters.no_changes += 1;
            addToIndex(indexes.byOcsId, candidate.ocs_id, result.record);
            addToIndex(indexes.byAsset, result.record.asset_number, result.record);
            addToIndex(indexes.bySerial, result.record.serial_number, result.record);
          }
        } else if (config.createMissing) {
          const created = await prisma.equipment.create({ data: creationData(candidate) });
          counters.created += 1;
          addToIndex(indexes.byOcsId, created.ocs_id, created);
          addToIndex(indexes.byAsset, created.asset_number, created);
          addToIndex(indexes.bySerial, created.serial_number, created);
        } else {
          if (details.discovered.length < 100) {
            details.discovered.push({ computerId, asset: candidate.asset_number, serial: candidate.serial_number });
          }
        }
        counters.processed += 1;

        if (counters.processed % 25 === 0) {
          await prisma.ocsSyncLog.update({ where: { id: log.id }, data: counters });
        }
      } catch (error) {
        counters.errors += 1;
        counters.processed += 1;
        if (details.errors.length < 100) details.errors.push({ computerId, message: error.message });
      }
    });

    const linkedRecords = await prisma.equipment.findMany({ where: { ocs_id: { not: null } } });
    for (const record of linkedRecords) {
      const age = reportAge(record.ocs_lastdate);
      const outdated = age.hours === null || age.hours > config.warningHours;
      if (record.ocs_is_outdated !== outdated || (age.days !== null && comparable(record.ocs_days_without_report) !== comparable(age.days))) {
        await prisma.equipment.update({
          where: { id: record.id },
          data: { ocs_is_outdated: outdated, ocs_days_without_report: age.days },
        });
        if (outdated && !record.ocs_is_outdated) counters.marked_outdated += 1;
      }
    }

    const status = counters.errors > 0 || details.conflicts.length > 0 ? "completed_with_warnings" : "completed";
    const finished = await prisma.ocsSyncLog.update({
      where: { id: log.id },
      data: {
        ...counters,
        finished_at: new Date().toISOString(),
        status,
        error_details: JSON.stringify(details),
      },
    });
    return finished;
  } catch (error) {
    await prisma.ocsSyncLog.update({
      where: { id: log.id },
      data: {
        ...counters,
        finished_at: new Date().toISOString(),
        status: "failed",
        errors: counters.errors + 1,
        error_details: JSON.stringify({ ...details, fatal: error.message }),
      },
    });
    throw error;
  }
}

async function createLog(prisma, actor) {
  return prisma.ocsSyncLog.create({
    data: {
      started_at: new Date().toISOString(),
      status: "running",
      total_ids: 0,
      processed: 0,
      created: 0,
      updated: 0,
      no_changes: 0,
      errors: 0,
      created_by: actor,
    },
  });
}

export function isOcsSyncRunning() {
  return Boolean(activeSync);
}

export async function isOcsSyncGloballyRunning() {
  if (activeSync) return true;
  const releaseLock = await acquireGlobalLock();
  if (!releaseLock) return true;
  await releaseGlobalLockSafely(releaseLock);
  return false;
}

export async function startOcsSync(prisma, actor = "manual") {
  if (activeSync) return { started: false, reason: "already_running" };
  activeSync = Promise.resolve();
  let releaseLock;
  try {
    releaseLock = await acquireGlobalLock();
    if (!releaseLock) {
      activeSync = null;
      return { started: false, reason: "already_running" };
    }
  } catch (error) {
    activeSync = null;
    throw error;
  }

  let log;
  try {
    log = await createLog(prisma, actor);
  } catch (error) {
    try {
      await releaseGlobalLockSafely(releaseLock);
    } finally {
      activeSync = null;
    }
    throw error;
  }
  activeSync = performSync(prisma, log, actor)
    .catch((error) => console.error("Sincronización OCS fallida:", error))
    .finally(async () => {
      try {
        await releaseGlobalLockSafely(releaseLock);
      } finally {
        activeSync = null;
      }
    });
  return { started: true, log, completion: activeSync };
}

export async function runOcsSync(prisma, actor = "scheduled") {
  if (activeSync) throw new Error("Ya hay una sincronización OCS en curso");
  activeSync = Promise.resolve();
  let releaseLock;
  try {
    releaseLock = await acquireGlobalLock();
  } catch (error) {
    activeSync = null;
    throw error;
  }
  if (!releaseLock) {
    activeSync = null;
    throw new Error("Ya hay una sincronización OCS en curso en otra instancia");
  }
  let log;
  try {
    log = await createLog(prisma, actor);
  } catch (error) {
    try {
      await releaseGlobalLockSafely(releaseLock);
    } finally {
      activeSync = null;
    }
    throw error;
  }
  activeSync = performSync(prisma, log, actor).finally(async () => {
    try {
      await releaseGlobalLockSafely(releaseLock);
    } finally {
      activeSync = null;
    }
  });
  return activeSync;
}

