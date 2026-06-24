import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const TIPOS_PC = ["RAM", "HDD", "SSD", "NVMe", "Fuente", "Otro"];
const TIPOS_IMP = ["Toner", "Unidad de imagen", "Tambor", "Otro"];

const defaults = {
  categoria: "PC", tipo: "RAM", codigo: "", marca: "", modelo: "",
  capacidad: "", compatibilidad: "", cantidad_actual: 0, cantidad_minima: 1,
  proveedor: "", ubicacion: "", notas: "", estado: "disponible",
};

export default function ComponentStockForm({ open, onClose, onSubmit, item }) {
  const [form, setForm] = useState(defaults);

  useEffect(() => {
    setForm(item ? { ...defaults, ...item } : defaults);
  }, [item, open]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const tipos = form.categoria === "Impresora" ? TIPOS_IMP : TIPOS_PC;

  const handleCategoriaChange = (v) => {
    const firstTipo = v === "Impresora" ? TIPOS_IMP[0] : TIPOS_PC[0];
    setForm((f) => ({ ...f, categoria: v, tipo: firstTipo }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      cantidad_actual: Number(form.cantidad_actual),
      cantidad_minima: Number(form.cantidad_minima),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Editar Ítem" : "Nuevo Ítem de Stock"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Categoría *</Label>
              <Select value={form.categoria} onValueChange={handleCategoriaChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PC">PC</SelectItem>
                  <SelectItem value="Impresora">Impresora</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Código *</Label>
              <Input value={form.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="Ej: LBTN880/3479" required />
            </div>
            <div className="space-y-1">
              <Label>Marca</Label>
              <Input value={form.marca} onChange={(e) => set("marca", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Modelo</Label>
              <Input value={form.modelo} onChange={(e) => set("modelo", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Capacidad</Label>
              <Input value={form.capacidad} onChange={(e) => set("capacidad", e.target.value)} placeholder="Ej: 16 GB" />
            </div>
            <div className="space-y-1">
              <Label>Proveedor</Label>
              <Input value={form.proveedor} onChange={(e) => set("proveedor", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Stock actual</Label>
              <Input type="number" min="0" value={form.cantidad_actual} onChange={(e) => set("cantidad_actual", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Stock mínimo</Label>
              <Input type="number" min="0" value={form.cantidad_minima} onChange={(e) => set("cantidad_minima", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Ubicación</Label>
              <Input value={form.ubicacion} onChange={(e) => set("ubicacion", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => set("estado", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="reservado">Reservado</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Compatibilidad</Label>
            <Input value={form.compatibilidad} onChange={(e) => set("compatibilidad", e.target.value)} placeholder="Modelos compatibles..." />
          </div>
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea value={form.notas} onChange={(e) => set("notas", e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">{item ? "Guardar cambios" : "Crear ítem"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}