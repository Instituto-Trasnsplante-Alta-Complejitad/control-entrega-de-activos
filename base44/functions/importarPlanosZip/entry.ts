import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { unzipSync } from 'npm:fflate@0.8.2';

// Mapeo de palabras clave del nombre de archivo → orden y label del piso
const FLOOR_ORDER = [
  { kw: "subsuelo", order: 0, label: "Subsuelo" },
  { kw: "planta baja", order: 1, label: "Planta baja" },
  { kw: "planta_baja", order: 1, label: "Planta baja" },
  { kw: "plantabaja", order: 1, label: "Planta baja" },
  { kw: "pb", order: 1, label: "Planta baja" },
  { kw: "primer", order: 2, label: "Primer piso" },
  { kw: "1piso", order: 2, label: "Primer piso" },
  { kw: "piso1", order: 2, label: "Primer piso" },
  { kw: "segundo", order: 3, label: "Segundo piso" },
  { kw: "2piso", order: 3, label: "Segundo piso" },
  { kw: "piso2", order: 3, label: "Segundo piso" },
  { kw: "tercer", order: 4, label: "Tercer piso" },
  { kw: "3piso", order: 4, label: "Tercer piso" },
  { kw: "piso3", order: 4, label: "Tercer piso" },
  { kw: "cuarto", order: 5, label: "Cuarto piso" },
  { kw: "4piso", order: 5, label: "Cuarto piso" },
  { kw: "piso4", order: 5, label: "Cuarto piso" },
  { kw: "quinto", order: 6, label: "Quinto piso" },
  { kw: "5piso", order: 6, label: "Quinto piso" },
  { kw: "piso5", order: 6, label: "Quinto piso" },
  { kw: "sexto", order: 7, label: "Sexto piso" },
  { kw: "6piso", order: 7, label: "Sexto piso" },
  { kw: "piso6", order: 7, label: "Sexto piso" },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const zipUrl = body.zip_url;
    const sedeNombre = body.sede_nombre || "Clínica";
    const sedeDireccion = body.sede_direccion || "";

    if (!zipUrl) {
      return Response.json({ error: "zip_url requerido" }, { status: 400 });
    }

    // Descargar el ZIP
    const resp = await fetch(zipUrl);
    if (!resp.ok) {
      return Response.json({ error: "fetch_failed", status: resp.status }, { status: 500 });
    }
    const buf = new Uint8Array(await resp.arrayBuffer());

    // Descomprimir
    const files = unzipSync(buf);
    const names = Object.keys(files).filter(
      (n) => /\.(png|jpe?g|webp)$/i.test(n) && !n.startsWith("__MACOSX") && !n.includes("/.")
    );

    if (names.length === 0) {
      return Response.json({ error: "No se encontraron imágenes en el ZIP", entries: Object.keys(files) }, { status: 400 });
    }

    // Crear la sede
    const sede = await base44.asServiceRole.entities.Sede.create({
      nombre: sedeNombre,
      direccion: sedeDireccion,
      estado: "activa",
    });

    const created = [];
    for (const name of names) {
      const lower = name.toLowerCase();
      const match = FLOOR_ORDER.find((f) => lower.includes(f.kw));
      const order = match ? match.order : 99 + created.length;
      const label = match ? match.label : name.split("/").pop().replace(/\.[^.]+$/, "");
      const bytes = files[name];
      const ext = lower.match(/\.(\w+)$/)?.[1] || "png";
      const mime = ext === "png" ? "image/png" : (ext === "webp" ? "image/webp" : "image/jpeg");
      const fileName = `${label.replace(/\s+/g, "_")}.${ext}`;

      const file = new File([bytes], fileName, { type: mime });
      const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

      const plano = await base44.asServiceRole.entities.MapaPlano.create({
        sede_id: sede.id,
        nombre: label,
        imagen_url: file_url,
        orden: order,
      });
      created.push({ id: plano.id, nombre: label, orden: order, url: file_url });
    }

    created.sort((a, b) => a.orden - b.orden);
    return Response.json({ success: true, sede_id: sede.id, sede_nombre: sedeNombre, planos: created });
  } catch (error) {
    console.error("[importarPlanosZip] Error:", error.message);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});