import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TYPES = [
  { value: "notebook", label: "Notebook" },
  { value: "tablet", label: "Tablet" },
  { value: "celular", label: "Celular" },
  { value: "cpu", label: "CPU" },
  { value: "otro", label: "Otro" },
];

const STATUSES = [
  { value: "disponible", label: "Disponible" },
  { value: "asignado", label: "Asignado" },
  { value: "baja", label: "Baja" },
  { value: "en_reparacion", label: "En reparación" },
];

export default function EquipmentForm({ open, onClose, onSubmit, equipment }) {
  const [form, setForm] = useState({
    asset_number: "",
    type: "notebook",
    brand: "",
    model: "",
    serial_number: "",
    status: "disponible",
    assigned_to: "",
    department: "",
    comments: "",
  });

  useEffect(() => {
    if (equipment) {
      setForm({
        asset_number: equipment.asset_number || "",
        type: equipment.type || "notebook",
        brand: equipment.brand || "",
        model: equipment.model || "",
        serial_number: equipment.serial_number || "",
        status: equipment.status || "disponible",
        assigned_to: equipment.assigned_to || "",
        department: equipment.department || "",
        comments: equipment.comments || "",
      });
    } else {
      setForm({ asset_number: "", type: "notebook", brand: "", model: "", serial_number: "", status: "disponible", assigned_to: "", department: "", comments: "" });
    }
  }, [equipment, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{equipment ? "Editar Equipo" : "Nuevo Equipo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>N° Activo</Label>
              <Input value={form.asset_number} onChange={(e) => setForm({ ...form, asset_number: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>N° Serie</Label>
              <Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Asignado a</Label>
            <Input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder="Nombre del usuario" />
          </div>
          <div className="space-y-2">
            <Label>Sector / Gerencia</Label>
            <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Comentarios</Label>
            <Textarea value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">{equipment ? "Guardar Cambios" : "Crear Equipo"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}