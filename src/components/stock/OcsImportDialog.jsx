import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import readXlsxFile from "read-excel-file/browser";

// Limpia valores '31' (placeholder vacío del Excel) y strings vacíos
const clean = (v) => {
  if (v === undefined || v === null) return "";
  const s = String(v).trim();
  return s === "31" || s === "" ? "" : s;
};

const cleanBool = (v) => {
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1" || v === "TRUE" || v === "true") return true;
  return false;
};

// Determina el tipo: si asset_number empieza con AR2150L → notebook, si no lo que viene del Excel
const resolveType = (row) => {
  const asset = clean(row.asset_number);
  if (asset.toUpperCase().startsWith("AR2150L")) return "notebook";
  const t = clean(row.type)?.toLowerCase();
  const valid = ["notebook", "tablet", "celular", "cpu", "otro"];
  return valid.includes(t) ? t : "cpu";
};

// Construye el objeto de equipo desde una fila del Excel
const rowToEquipment = (row) => {
  const data = {};
  const stringFields = [
    "asset_number", "brand", "model", "serial_number", "assigned_to",
    "username", "department", "delivery_date", "comments",
    "processor_model", "storage_capacity", "ram_amount", "ram_slots",
    "ram_speed", "ram_generation", "ram_format", "operating_system",
  ];
  const storageTypes = ["HDD", "SSD", "NVMe"];
  const statusValues = ["disponible", "asignado", "baja", "en_reparacion"];
  const userTypeValues = ["interno", "externo"];

  stringFields.forEach((f) => {
    const v = clean(row[f]);
    if (v) data[f] = v;
  });

  const st = clean(row.storage_type);
  if (storageTypes.includes(st)) data.storage_type = st;

  const status = clean(row.status);
  data.status = statusValues.includes(status) ? status : "disponible";

  const ut = clean(row.user_type);
  if (userTypeValues.includes(ut)) data.user_type = ut;

  data.type = resolveType(row);

  data.peripherals_mouse = cleanBool(row.peripherals_mouse);
  data.peripherals_keyboard = cleanBool(row.peripherals_keyboard);
  data.peripherals_monitor = cleanBool(row.peripherals_monitor);
  data.peripherals_camera = cleanBool(row.peripherals_camera);

  return data;
};

export default function OcsImportDialog({ open, onClose, onDone }) {
  const [step, setStep] = useState("idle"); // idle | preview | importing | done
  const [rows, setRows] = useState([]);
  const [result, setResult] = useState({ created: 0, updated: 0, errors: [] });
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const [headers = [], ...values] = await readXlsxFile(file);
      const normalizedHeaders = headers.map((header) => String(header || "").trim());
      const data = values.map((row) => Object.fromEntries(
        normalizedHeaders
          .map((header, index) => [header, row[index] ?? ""])
          .filter(([header]) => header),
      ));
      setRows(data);
      setStep("preview");
    } catch (error) {
      setResult({ created: 0, updated: 0, errors: [error.message || "No se pudo leer el archivo"] });
      setStep("done");
    }
  };

  const handleImport = async () => {
    setStep("importing");
    const existing = await base44.entities.Equipment.list("asset_number", 1000);

    // Índices para búsqueda rápida
    const byAsset = {};
    const bySerial = {};
    existing.forEach((e) => {
      if (e.asset_number) byAsset[e.asset_number.toUpperCase()] = e;
      if (e.serial_number) bySerial[e.serial_number.toUpperCase()] = e;
    });

    let created = 0, updated = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const newData = rowToEquipment(row);
        if (!newData.asset_number && !newData.serial_number) continue;

        // Buscar duplicado
        let existing_rec = null;
        if (newData.asset_number) existing_rec = byAsset[newData.asset_number.toUpperCase()];
        if (!existing_rec && newData.serial_number) existing_rec = bySerial[newData.serial_number.toUpperCase()];

        if (existing_rec) {
          // Merge: solo sobreescribir campos que vienen con valor en el Excel
          const merged = {};
          Object.entries(newData).forEach(([k, v]) => {
            if (v !== "" && v !== undefined && v !== null) merged[k] = v;
          });
          await base44.entities.Equipment.update(existing_rec.id, merged);
          updated++;
        } else {
          if (!newData.brand) newData.brand = "Sin datos";
          if (!newData.model) newData.model = "Sin datos";
          if (!newData.serial_number) newData.serial_number = "S/N";
          await base44.entities.Equipment.create(newData);
          created++;
        }
      } catch (err) {
        errors.push(`Fila ${rows.indexOf(row) + 2}: ${err.message}`);
      }
    }

    setResult({ created, updated, errors });
    setStep("done");
    onDone();
  };

  const handleClose = () => {
    setStep("idle");
    setRows([]);
    setResult({ created: 0, updated: 0, errors: [] });
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar desde OCS</DialogTitle>
        </DialogHeader>

        {step === "idle" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Seleccioná el archivo Excel exportado de OCS. Los registros existentes se actualizarán con prioridad al archivo nuevo; los nuevos se crearán.
            </p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            <Button className="w-full gap-2" onClick={() => fileRef.current.click()}>
              <Upload className="w-4 h-4" /> Seleccionar archivo Excel
            </Button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
              <p><span className="font-semibold">{rows.length}</span> filas encontradas en el archivo</p>
              <p className="text-muted-foreground text-xs">Se buscarán duplicados por asset_number y serial_number. Los registros existentes serán actualizados con los datos del Excel.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setStep("idle"); setRows([]); if (fileRef.current) fileRef.current.value = ""; }}>
                Cambiar archivo
              </Button>
              <Button className="flex-1" onClick={handleImport}>
                Importar {rows.length} registros
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Procesando registros...</p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700 font-semibold">
                <CheckCircle className="w-5 h-5" /> Importación completada
              </div>
              <p className="text-sm text-green-700">✅ <span className="font-medium">{result.updated}</span> equipos actualizados</p>
              <p className="text-sm text-green-700">➕ <span className="font-medium">{result.created}</span> equipos nuevos creados</p>
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-1">
                <div className="flex items-center gap-2 text-red-700 text-sm font-semibold">
                  <AlertCircle className="w-4 h-4" /> {result.errors.length} errores
                </div>
                {result.errors.slice(0, 5).map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
              </div>
            )}
            <Button className="w-full" onClick={handleClose}>Cerrar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
