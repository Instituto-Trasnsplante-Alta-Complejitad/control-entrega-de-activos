import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import helmet from "helmet";
import multer from "multer";

import { requireAdmin, requireIdentity } from "./auth.js";
import { getEntityDefinition, parseFilter, parseSort, pickAllowed } from "./entity-registry.js";
import { prisma } from "./prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distPath = path.join(projectRoot, "dist");
const storagePath = path.resolve(process.env.STORAGE_PATH || path.join(projectRoot, "storage"));
const uploadPath = path.join(storagePath, "uploads");
const port = Number(process.env.PORT || 8080);

fs.mkdirSync(uploadPath, { recursive: true });

const app = express();
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "2mb" }));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function safeRecord(record) {
  if (!record || typeof record !== "object") return record;
  const { acceptance_token_hash: _tokenHash, ...safe } = record;
  return safe;
}

function boundedLimit(rawLimit) {
  const parsed = Number.parseInt(String(rawLimit || "500"), 10);
  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : 500, 1), 5000);
}

function sanitizeFileName(originalName) {
  const extension = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 10);
  const stem = path.basename(originalName, path.extname(originalName))
    .normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "archivo";
  return `${Date.now()}-${crypto.randomUUID()}-${stem}${extension}`;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadPath,
    filename(_req, file, callback) {
      callback(null, sanitizeFileName(file.originalname));
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"]);
    const accepted = allowed.has(file.mimetype);
    callback(accepted ? null : new Error("Tipo de archivo no permitido"), accepted);
  },
});

app.get("/api/health", asyncRoute(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ok", service: "control-entrega-de-activos" });
}));

app.get("/api/public/deliveries/:id/acceptance", asyncRoute(async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) return res.status(400).json({ message: "Enlace inválido" });
  const delivery = await prisma.delivery.findFirst({ where: { id: req.params.id, acceptance_token_hash: sha256(token) } });
  if (!delivery) return res.status(404).json({ message: "Entrega no encontrada" });
  if (delivery.acceptance_token_expires_at && delivery.acceptance_token_expires_at < new Date()) {
    return res.status(410).json({ message: "El enlace venció" });
  }
  res.json(safeRecord(delivery));
}));

app.post("/api/public/deliveries/:id/acceptance", asyncRoute(async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  if (!token) return res.status(400).json({ message: "Enlace inválido" });
  const delivery = await prisma.delivery.findFirst({ where: { id: req.params.id, acceptance_token_hash: sha256(token) } });
  if (!delivery) return res.status(404).json({ message: "Entrega no encontrada" });
  if (delivery.acceptance_token_expires_at && delivery.acceptance_token_expires_at < new Date()) {
    return res.status(410).json({ message: "El enlace venció" });
  }
  if (delivery.status === "aceptado") return res.json(safeRecord(delivery));
  if (delivery.status !== "pendiente") return res.status(409).json({ message: "La entrega ya no está pendiente" });
  const updated = await prisma.delivery.update({
    where: { id: delivery.id },
    data: { status: "aceptado", acceptance_date: new Date().toISOString() },
  });
  res.json(safeRecord(updated));
}));

app.use("/api", requireIdentity);

app.get("/api/auth/me", asyncRoute(async (req, res) => {
  const identity = req.identity;
  await prisma.appUser.upsert({
    where: { issuer_subject: { issuer: identity.issuer, subject: identity.subject } },
    update: { email: identity.email, displayName: identity.name, realmRoles: identity.roles, groups: identity.groups },
    create: { issuer: identity.issuer, subject: identity.subject, email: identity.email, displayName: identity.name, realmRoles: identity.roles, groups: identity.groups },
  });
  res.json({
    id: identity.subject,
    email: identity.email,
    full_name: identity.name,
    role: identity.isAdmin ? "admin" : "user",
    groups: identity.groups,
    realm_roles: identity.roles,
  });
}));

app.get("/api/entities/:entity", asyncRoute(async (req, res) => {
  const definition = getEntityDefinition(req.params.entity);
  if (!definition) return res.status(404).json({ message: "Entidad desconocida" });
  const records = await prisma[definition.delegateName].findMany({
    where: parseFilter(req.query.filter, definition.fields),
    orderBy: parseSort(req.query.sort, definition.fields),
    take: boundedLimit(req.query.limit),
  });
  if (definition.name === "User") {
    return res.json(records.map((record) => ({
      id: record.id,
      email: record.email,
      full_name: record.displayName,
      role: record.groups?.includes?.(process.env.APP_ADMIN_GROUP || "/ARR-ITAC-IT") ? "admin" : "user",
      groups: record.groups,
      created_date: record.createdAt,
      updated_date: record.updatedAt,
    })));
  }
  res.json(records.map(safeRecord));
}));

app.post("/api/entities/:entity", requireAdmin, asyncRoute(async (req, res) => {
  const definition = getEntityDefinition(req.params.entity);
  if (!definition || definition.readOnly) return res.status(404).json({ message: "Entidad desconocida" });
  const data = pickAllowed(req.body, definition.writableFields);
  data.created_by = data.created_by || req.identity.email;
  data.created_by_id = data.created_by_id || req.identity.subject;

  let acceptanceToken = null;
  if (definition.name === "Delivery") {
    acceptanceToken = crypto.randomBytes(32).toString("base64url");
    data.acceptance_token_hash = sha256(acceptanceToken);
    data.acceptance_token_issued_at = new Date();
    data.acceptance_token_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  const created = await prisma[definition.delegateName].create({ data });
  const response = safeRecord(created);
  if (acceptanceToken) {
    response.acceptance_url = `${process.env.APP_URL || ""}/aceptar?id=${encodeURIComponent(created.id)}&token=${encodeURIComponent(acceptanceToken)}`;
  }
  res.status(201).json(response);
}));

app.patch("/api/entities/:entity/:id", requireAdmin, asyncRoute(async (req, res) => {
  const definition = getEntityDefinition(req.params.entity);
  if (!definition || definition.readOnly) return res.status(404).json({ message: "Entidad desconocida" });
  const data = pickAllowed(req.body, definition.writableFields);
  const updated = await prisma[definition.delegateName].update({ where: { id: req.params.id }, data });
  res.json(safeRecord(updated));
}));

app.delete("/api/entities/:entity/:id", requireAdmin, asyncRoute(async (req, res) => {
  const definition = getEntityDefinition(req.params.entity);
  if (!definition || definition.readOnly) return res.status(404).json({ message: "Entidad desconocida" });
  await prisma[definition.delegateName].delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

app.delete("/api/entities/:entity", requireAdmin, asyncRoute(async (req, res) => {
  const definition = getEntityDefinition(req.params.entity);
  if (!definition || definition.readOnly) return res.status(404).json({ message: "Entidad desconocida" });
  const where = parseFilter(req.query.filter, definition.fields);
  if (Object.keys(where).length === 0) return res.status(400).json({ message: "Se requiere al menos un filtro" });
  const result = await prisma[definition.delegateName].deleteMany({ where });
  res.json({ deleted: result.count });
}));

app.post("/api/functions/getMapData", asyncRoute(async (_req, res) => {
  const [equipment, printers] = await Promise.all([
    prisma.equipment.findMany({ orderBy: { updated_date: "desc" }, take: 2000 }),
    prisma.printer.findMany({ orderBy: { updated_date: "desc" }, take: 500 }),
  ]);
  res.json({ equipment, printers });
}));

app.post("/api/functions/generateContractPdf", asyncRoute(async (req, res) => {
  const deliveryId = req.body?.deliveryId;
  if (!deliveryId) return res.status(400).json({ message: "deliveryId requerido" });
  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
  if (!delivery) return res.status(404).json({ message: "Entrega no encontrada" });
  const escape = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);
  res.type("html").send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Entrega ${escape(delivery.equipment_asset)}</title><style>body{font:16px Georgia,serif;line-height:1.6;max-width:850px;margin:40px auto;padding:24px}h1{text-align:center}dl{display:grid;grid-template-columns:180px 1fr;gap:8px}dt{font-weight:bold}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Imprimir / Guardar PDF</button><h1>Constancia de entrega de equipo</h1><dl><dt>Destinatario</dt><dd>${escape(delivery.recipient_name)}</dd><dt>DNI</dt><dd>${escape(delivery.recipient_dni)}</dd><dt>Fecha</dt><dd>${escape(delivery.delivery_date)}</dd><dt>Equipo</dt><dd>${escape(delivery.equipment_brand)} ${escape(delivery.equipment_model)}</dd><dt>Activo</dt><dd>${escape(delivery.equipment_asset)}</dd><dt>Serie</dt><dd>${escape(delivery.equipment_serial)}</dd></dl><p>El destinatario confirma haber recibido el equipo indicado y acepta la normativa corporativa aplicable al uso, cuidado y devolución de los activos de la organización.</p></body></html>`);
}));

app.post("/api/uploads", requireAdmin, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Archivo requerido" });
  res.status(201).json({ file_url: `/uploads/${encodeURIComponent(req.file.filename)}` });
});

app.use("/uploads", requireIdentity, express.static(uploadPath, { fallthrough: false }));

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { index: false }));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

app.use((req, res) => res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.path}` }));
app.use((error, _req, res, _next) => {
  console.error(error);
  const status = Number(error.status || error.statusCode || 500);
  res.status(status).json({ message: status >= 500 ? "Error interno del servidor" : error.message });
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`control-entrega-de-activos escuchando en 0.0.0.0:${port}`);
});

async function shutdown(signal) {
  console.log(`Cierre solicitado por ${signal}`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
