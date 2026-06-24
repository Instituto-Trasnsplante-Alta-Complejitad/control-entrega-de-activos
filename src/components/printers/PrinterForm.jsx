import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const CONSUMIBLES_CATALOGO = {
  "DCP-5650DN": { toner: "LBTN880/3479", unidad_imagen: "LBDR820/3400/3455/3405/3460" },
  "HL-L6200DW": { toner: "LBTN880/3479", unidad_imagen: "LBDR820/3400/3455/3405/3460" },
  "HL-L5100DN": { toner: "LBTN880/3479", unidad_imagen: "LBDR820/3400/3455/3405/3460" },
  "MFC-L2720DW": { toner: "TN 660/TN2370", unidad_imagen: "LBDR2340" },
  "HL-L2360DW": { toner: "TN 660/TN2370", unidad_imagen: "LBDR2340" },
  "DCP-L2540DW": { toner: "TN 660/TN2370", unidad_imagen: "LBDR2340" },
  "SP 3710 DN": { toner: "LRSP3710H", unidad_imagen: "" },
  "P 311": { toner: "LRSP3710H", unidad_imagen: "" },
  "IM430F": { toner: "IM430F", unidad_imagen: "" },
  "e-STUDIO 5008A": { toner: "T3008U", unidad_imagen: "" },
  "e-STUDIO 4508A": { toner: "T3008U", unidad_imagen: "" },
  "e-STUDIO5508A": { toner: "T5508U", unidad_imagen: "" },
  "MFC-L8900CDW": { toner: "", unidad_imagen: "DR-411CL" },
  "LaserJet Pro M201 dw": { toner: "CF283A", unidad_imagen: "" },
  "LaserJet Pro M102w": { toner: "CF219A", unidad_imagen: "" },
  "LaserJet 1022": { toner: "Q2612A", unidad_imagen: "" },
  "Phaser 3020": { toner: "XER 3020/3025", unidad_imagen: "" },
  "Laser Jet Pro MFP M426fdw": { toner: "CF226A", unidad_imagen: "" },
  "Laser Jet Pro MFP P1102W": { toner: "CE285A", unidad_imagen: "" },
  "LaserJet Pro M15w": { toner: "", unidad_imagen: "" },
};

const defaults = {
  printer_id: "", numero: "", marca: "", modelo: "", piso: "", sector: "",
  edificio: "", conexion: "", toner: "", unidad_imagen: "", proveedor: "",
  notas: "", estado: "activa",
};

export default function PrinterForm({ open, onClose, onSubmit, printer }) {
  const [form, setForm] = useState(defaults);

  useEffect(() => {
    setForm(printer ? { ...defaults, ...printer } : defaults);
  }, [printer, open]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleModeloChange = (modelo) => {
    set("modelo", modelo);
    const consumibles = Object.entries(CONSUMIBLES_CATALOGO).find(([k]) =>
      modelo.toLowerCase().includes(k.toLowerCase())
    );
    if (consumibles) {
      setForm((f) => ({ ...f, modelo, toner: consumibles[1].toner, unidad_imagen: consumibles[1].unidad_imagen }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (data.numero) data.numero = Number(data.numero);
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{printer ? "Editar Impresora" : "Nueva Impresora"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>N° Correlativo</Label>
              <Input type="number" value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="1" />
            </div>
            <div className="space-y-1">
              <Label>ID Impresora *</Label>
              <Input value={form.printer_id} onChange={(e) => set("printer_id", e.target.value)} placeholder="AR2150P001" required />
            </div>
            <div className="space-y-1">
              <Label>Marca *</Label>
              <Input value={form.marca} onChange={(e) => set("marca", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Modelo *</Label>
              <Input value={form.modelo} onChange={(e) => handleModeloChange(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Piso</Label>
              <Input value={form.piso} onChange={(e) => set("piso", e.target.value)} placeholder="ej: 1, pb, -1" />
            </div>
            <div className="space-y-1">
              <Label>Sector</Label>
              <Input value={form.sector} onChange={(e) => set("sector", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Edificio</Label>
              <Input value={form.edificio} onChange={(e) => set("edificio", e.target.value)} placeholder="clinica, adm, anexo..." />
            </div>
            <div className="space-y-1">
              <Label>Conexión / IP</Label>
              <Input value={form.conexion} onChange={(e) => set("conexion", e.target.value)} placeholder="10.0.0.1 o cable" />
            </div>
            <div className="space-y-1">
              <Label>Toner</Label>
              <Input value={form.toner} onChange={(e) => set("toner", e.target.value)} placeholder="Código de toner" />
            </div>
            <div className="space-y-1">
              <Label>Unidad de Imagen</Label>
              <Input value={form.unidad_imagen} onChange={(e) => set("unidad_imagen", e.target.value)} placeholder="Código unidad de imagen" />
            </div>
            <div className="space-y-1">
              <Label>Proveedor</Label>
              <Input value={form.proveedor} onChange={(e) => set("proveedor", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => set("estado", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="inactiva">Inactiva</SelectItem>
                  <SelectItem value="en_reparacion">En reparación</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea value={form.notas} onChange={(e) => set("notas", e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">{printer ? "Guardar cambios" : "Crear impresora"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}