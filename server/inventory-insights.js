const severityOrder = { critical: 0, warning: 1, info: 2 };

function numberFromEnvironment(name, fallback) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOcsDate(value) {
  if (!value) return null;
  let normalized = String(value).trim().replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) normalized += "T00:00:00";
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function ageInHours(value, now = new Date()) {
  const parsed = parseOcsDate(value);
  if (!parsed) return null;
  return Math.max(0, (now.getTime() - parsed.getTime()) / 3_600_000);
}

function capacityInGb(value) {
  if (value === null || value === undefined || value === "") return null;
  const match = String(value).replace(",", ".").match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const amount = Number(match[0]);
  if (!Number.isFinite(amount)) return null;
  return amount > 256 ? amount / 1024 : amount;
}

function storageCapacityInGb(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).replace(",", ".").toUpperCase();
  const match = text.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const amount = Number(match[0]);
  if (!Number.isFinite(amount)) return null;
  if (text.includes("TB")) return amount * 1024;
  if (text.includes("MB")) return amount / 1024;
  return amount;
}

function cpuRisk(processorModel) {
  const processor = String(processorModel || "").toLowerCase();
  if (!processor) return null;

  if (/\b(core\s*)?i[3579]-\d{3}\b/.test(processor)) {
    return "Intel Core de primera generación";
  }

  const intel = processor.match(/\bi[3579]-(\d{4,5})[a-z]*/);
  if (intel) {
    const digits = intel[1];
    const firstTwoDigits = Number(digits.slice(0, 2));
    const generation = firstTwoDigits >= 10 && firstTwoDigits <= 19
      ? firstTwoDigits
      : Number(digits[0]);
    if (generation > 0 && generation <= 7) return `Intel Core generación ${generation}`;
  }

  if (/\b(core\s*2|pentium\s*4)\b/.test(processor)) {
    return "Procesador Intel de familia legada";
  }
  if (/\b(intel\s+)?(atom|celeron|pentium)\b/.test(processor)) {
    return "Procesador Intel de gama básica o legado";
  }
  if (/\bamd\s+(a[4689]-|fx-|e[12]-|athlon\s+(ii|x[234]))/.test(processor)) {
    return "Procesador AMD de familia legada";
  }

  const ryzen = processor.match(/\bryzen\s+[3579]\s+(\d{4})/);
  if (ryzen && Number(ryzen[1][0]) <= 2) return "AMD Ryzen de primera generación comercial";
  return null;
}

function reportEquipment(item, extra = {}) {
  return {
    id: item.id,
    assetNumber: item.asset_number || "",
    type: item.type || "",
    brand: item.brand || "",
    model: item.model || "",
    serialNumber: item.serial_number || "",
    status: item.status || "",
    assignedTo: item.assigned_to || "",
    username: item.username || "",
    department: item.department || "",
    processor: item.processor_model || "",
    ram: item.ram_amount || "",
    storageCapacity: item.storage_capacity || "",
    storageType: item.storage_type || "",
    operatingSystem: item.operating_system || "",
    ocsId: item.ocs_id,
    ocsLastDate: item.ocs_lastdate || "",
    href: `/equipo/${encodeURIComponent(item.id)}`,
    ...extra,
  };
}

function pendingAgeInDays(value, now = new Date()) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.max(0, (now.getTime() - parsed.getTime()) / 86_400_000);
}

function addAlert(alerts, alert) {
  alerts.push({
    id: alert.id,
    severity: alert.severity,
    category: alert.category,
    title: alert.title,
    description: alert.description || "",
    assetNumber: alert.assetNumber || "",
    equipmentId: alert.equipmentId || null,
    href: alert.href || null,
  });
}

function duplicateValues(records, field) {
  const values = new Map();
  for (const record of records) {
    const value = String(record[field] || "").trim().toUpperCase();
    if (!value || value === "S/N") continue;
    const current = values.get(value) || [];
    current.push(record);
    values.set(value, current);
  }
  return [...values.entries()].filter(([, matches]) => matches.length > 1);
}

export async function getInventoryInsights(prisma) {
  const now = new Date();
  const warningHours = numberFromEnvironment("OCS_WARNING_HOURS", 24);
  const criticalHours = numberFromEnvironment("OCS_CRITICAL_DAYS", 7) * 24;
  const minimumRamGb = numberFromEnvironment("MIN_RAM_GB", 8);
  const oldOperatingSystems = String(process.env.OLD_OS_PATTERNS || "windows xp,windows vista,windows 7,windows 8")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const [equipment, deliveries, components, printerCount, lastSync] = await Promise.all([
    prisma.equipment.findMany({ orderBy: { asset_number: "asc" } }),
    prisma.delivery.findMany({ orderBy: { created_date: "desc" } }),
    prisma.componentStock.findMany({ where: { NOT: { estado: "historico" } }, orderBy: { codigo: "asc" } }),
    prisma.printer.count(),
    prisma.ocsSyncLog.findFirst({ orderBy: { created_date: "desc" } }),
  ]);

  const activeEquipment = equipment.filter((item) => String(item.status || "").toLowerCase() !== "baja");
  const byStatus = {};
  const byType = {};
  for (const item of equipment) {
    byStatus[item.status || "sin_estado"] = (byStatus[item.status || "sin_estado"] || 0) + 1;
    byType[item.type || "sin_tipo"] = (byType[item.type || "sin_tipo"] || 0) + 1;
  }

  const alerts = [];
  const hardwareRiskIds = new Set();
  const ocs = { current: 0, warning: 0, critical: 0, unlinked: 0 };

  for (const item of activeEquipment) {
    const asset = item.asset_number || item.serial_number || "Equipo sin identificar";
    const href = `/equipo/${encodeURIComponent(item.id)}`;
    const reportAge = ageInHours(item.ocs_lastdate, now);
    const linkedToOcs = item.ocs_id !== null && item.ocs_id !== undefined;

    if (!linkedToOcs) {
      ocs.unlinked += 1;
      addAlert(alerts, {
        id: `ocs-unlinked-${item.id}`,
        severity: "info",
        category: "ocs",
        title: "Equipo sin vinculación OCS",
        description: "No tiene un identificador OCS asociado.",
        assetNumber: asset,
        equipmentId: item.id,
        href,
      });
    } else if (reportAge === null || reportAge > criticalHours) {
      ocs.critical += 1;
      const days = reportAge === null ? null : Math.floor(reportAge / 24);
      addAlert(alerts, {
        id: `ocs-critical-${item.id}`,
        severity: "critical",
        category: "ocs",
        title: reportAge === null ? "OCS sin fecha de reporte" : `OCS sin reportar hace ${days} días`,
        description: "Revisar conectividad, agente OCS o estado físico del equipo.",
        assetNumber: asset,
        equipmentId: item.id,
        href,
      });
    } else if (reportAge > warningHours) {
      ocs.warning += 1;
      addAlert(alerts, {
        id: `ocs-warning-${item.id}`,
        severity: "warning",
        category: "ocs",
        title: `OCS sin reportar hace ${Math.floor(reportAge / 24)} días`,
        description: `Superó el umbral de ${Math.round(warningHours / 24)} días.`,
        assetNumber: asset,
        equipmentId: item.id,
        href,
      });
    } else {
      ocs.current += 1;
    }

    const ramGb = capacityInGb(item.ram_amount);
    if (ramGb !== null && ramGb < minimumRamGb) {
      hardwareRiskIds.add(item.id);
      addAlert(alerts, {
        id: `ram-${item.id}`,
        severity: "warning",
        category: "hardware",
        title: `RAM por debajo de ${minimumRamGb} GB`,
        description: `Memoria informada: ${item.ram_amount}.`,
        assetNumber: asset,
        equipmentId: item.id,
        href,
      });
    }

    if (String(item.storage_type || "").toUpperCase() === "HDD") {
      hardwareRiskIds.add(item.id);
      addAlert(alerts, {
        id: `hdd-${item.id}`,
        severity: "info",
        category: "hardware",
        title: "Almacenamiento HDD",
        description: "Candidato a actualización a SSD o NVMe.",
        assetNumber: asset,
        equipmentId: item.id,
        href,
      });
    }

    const operatingSystem = String(item.operating_system || "").toLowerCase();
    if (operatingSystem && oldOperatingSystems.some((pattern) => operatingSystem.includes(pattern))) {
      hardwareRiskIds.add(item.id);
      addAlert(alerts, {
        id: `os-${item.id}`,
        severity: "critical",
        category: "hardware",
        title: "Sistema operativo antiguo",
        description: item.operating_system,
        assetNumber: asset,
        equipmentId: item.id,
        href,
      });
    }

    const serial = String(item.serial_number || "").trim().toUpperCase();
    if (!serial || serial === "S/N") {
      addAlert(alerts, {
        id: `serial-${item.id}`,
        severity: "info",
        category: "data",
        title: "Número de serie pendiente",
        description: "Completar la identificación física del equipo.",
        assetNumber: asset,
        equipmentId: item.id,
        href,
      });
    }
  }

  for (const [field, label] of [["asset_number", "activo"], ["serial_number", "serie"]]) {
    for (const [value, matches] of duplicateValues(equipment, field)) {
      addAlert(alerts, {
        id: `duplicate-${field}-${value}`,
        severity: "warning",
        category: "data",
        title: `${label === "activo" ? "Activo" : "Serie"} duplicado: ${value}`,
        description: `${matches.length} equipos comparten el mismo valor.`,
      });
    }
  }

  const lowStock = components.filter((item) => item.cantidad_actual <= item.cantidad_minima);
  for (const item of lowStock) {
    addAlert(alerts, {
      id: `stock-${item.id}`,
      severity: item.cantidad_actual <= 0 ? "critical" : "warning",
      category: "stock",
      title: `Stock bajo: ${item.codigo}`,
      description: `${item.cantidad_actual} disponibles; mínimo ${item.cantidad_minima}.`,
    });
  }

  const pendingDeliveries = deliveries.filter((item) => String(item.status || "").toLowerCase() === "pendiente");
  for (const item of pendingDeliveries) {
    const ageDays = pendingAgeInDays(item.delivery_date, now);
    if (ageDays !== null && ageDays >= 7) {
      addAlert(alerts, {
        id: `delivery-${item.id}`,
        severity: ageDays >= 30 ? "critical" : "warning",
        category: "delivery",
        title: `Entrega pendiente hace ${Math.floor(ageDays)} días`,
        description: `${item.recipient_name} · ${item.equipment_asset || "sin activo"}`,
      });
    }
  }

  alerts.sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity]
    || left.category.localeCompare(right.category)
    || left.assetNumber.localeCompare(right.assetNumber));

  const alertCounts = alerts.reduce((counts, alert) => {
    counts.total += 1;
    counts[alert.severity] += 1;
    counts.byCategory[alert.category] = (counts.byCategory[alert.category] || 0) + 1;
    return counts;
  }, { total: 0, critical: 0, warning: 0, info: 0, byCategory: {} });

  return {
    generatedAt: now.toISOString(),
    thresholds: { warningHours, criticalHours, minimumRamGb },
    equipment: {
      total: equipment.length,
      active: activeEquipment.length,
      byStatus,
      byType,
      hardwareAtRisk: hardwareRiskIds.size,
    },
    ocs,
    printers: { total: printerCount },
    stock: { low: lowStock.length },
    deliveries: {
      total: deliveries.length,
      pending: pendingDeliveries.length,
      recent: deliveries.slice(0, 8),
    },
    alerts: { counts: alertCounts, items: alerts },
    lastSync,
  };
}

export async function getInventoryReports(prisma) {
  const now = new Date();
  const reportDays = numberFromEnvironment("OCS_REPORT_DAYS", 30);
  const minimumRamGb = numberFromEnvironment("MIN_RAM_GB", 8);
  const criticalRamGb = numberFromEnvironment("CRITICAL_RAM_GB", 4);
  const renewalMinimumScore = numberFromEnvironment("RENEWAL_MIN_SCORE", 3);
  const oldOperatingSystems = String(process.env.OLD_OS_PATTERNS || "windows xp,windows vista,windows 7,windows 8")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const equipment = await prisma.equipment.findMany({ orderBy: { asset_number: "asc" } });
  const activeEquipment = equipment.filter((item) => String(item.status || "").toLowerCase() !== "baja");

  const ocsOver30Days = [];
  const missingOcsDate = [];
  const renewalCandidates = [];

  for (const item of activeEquipment) {
    const linkedToOcs = item.ocs_id !== null && item.ocs_id !== undefined;
    const reportAgeHours = ageInHours(item.ocs_lastdate, now);
    if (linkedToOcs && reportAgeHours !== null && reportAgeHours > reportDays * 24) {
      ocsOver30Days.push(reportEquipment(item, {
        daysWithoutReport: Math.floor(reportAgeHours / 24),
        severity: "critical",
      }));
    } else if (linkedToOcs && reportAgeHours === null) {
      missingOcsDate.push(reportEquipment(item, {
        daysWithoutReport: null,
        severity: "critical",
      }));
    }

    const reasons = [];
    let riskScore = 0;
    let criticalCondition = false;
    const ramGb = capacityInGb(item.ram_amount);
    if (ramGb !== null && ramGb <= criticalRamGb) {
      riskScore += 3;
      criticalCondition = true;
      reasons.push(`RAM crítica: ${item.ram_amount}`);
    } else if (ramGb !== null && ramGb < minimumRamGb) {
      riskScore += 2;
      reasons.push(`RAM menor a ${minimumRamGb} GB: ${item.ram_amount}`);
    }

    if (String(item.storage_type || "").toUpperCase() === "HDD") {
      riskScore += 1;
      reasons.push("Disco HDD");
    }
    const storageGb = storageCapacityInGb(item.storage_capacity);
    if (storageGb !== null && storageGb < 128) {
      riskScore += 1;
      reasons.push(`Almacenamiento menor a 128 GB: ${item.storage_capacity}`);
    }

    const operatingSystem = String(item.operating_system || "").toLowerCase();
    if (operatingSystem && oldOperatingSystems.some((pattern) => operatingSystem.includes(pattern))) {
      riskScore += 3;
      criticalCondition = true;
      reasons.push(`Sistema operativo antiguo: ${item.operating_system}`);
    }
    const processorRisk = cpuRisk(item.processor_model);
    if (processorRisk) {
      riskScore += 2;
      reasons.push(processorRisk);
    }

    if (riskScore >= renewalMinimumScore) {
      renewalCandidates.push(reportEquipment(item, {
        riskScore,
        severity: criticalCondition || riskScore >= 5 ? "critical" : "warning",
        reasons,
      }));
    }
  }

  ocsOver30Days.sort((left, right) => right.daysWithoutReport - left.daysWithoutReport);
  renewalCandidates.sort((left, right) => right.riskScore - left.riskScore
    || left.assetNumber.localeCompare(right.assetNumber));

  return {
    generatedAt: now.toISOString(),
    criteria: {
      ocsReportDays: reportDays,
      minimumRamGb,
      criticalRamGb,
      renewalMinimumScore,
      note: "La antigüedad se estima por procesador y sistema operativo; no existe una fecha de compra confiable en el inventario actual.",
    },
    counts: {
      ocsOver30Days: ocsOver30Days.length,
      missingOcsDate: missingOcsDate.length,
      renewalCandidates: renewalCandidates.length,
    },
    ocsOver30Days,
    missingOcsDate,
    renewalCandidates,
  };
}

