import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

const USER_TYPES = [
  { value: "interno", label: "Interno ITAC" },
  { value: "externo", label: "Externo" },
];

const STORAGE_TYPES = [
  { value: "HDD", label: "HDD" },
  { value: "SSD", label: "SSD" },
  { value: "NVMe", label: "NVMe" },
];

const INITIAL_FORM = {
  asset_number: "",
  type: "notebook",
  brand: "",
  model: "",
  serial_number: "",
  status: "disponible",
  user_type: "",
  assigned_to: "",
  username: "",
  department: "",
  delivery_date: "",
  comments: "",
  peripherals_mouse: false,
  peripherals_keyboard: false,
  peripherals_monitor: false,
  peripherals_camera: false,
  processor_model: "",
  storage_capacity: "",
  storage_type: "",
  ram_amount: "",
  ram_slots: "",
  ram_speed: "",
  ram_generation: "",
  ram_format: "",
  operating_system: "",
};

async function logAudit({ user, accion, entidad_id, entidad_label, valor_anterior, valor_nuevo }) {
  try {
    await base44.entities.AuditLog.create({
      usuario_email: user?.email || "desconocido",
      usuario_nombre: user?.full_name || "",
      accion,
      entidad: "Equipment",
      entidad_id,
      entidad_label,
      valor_anterior: valor_anterior ? JSON.stringify(valor_anterior) : undefined,
      valor_nuevo: valor_nuevo ? JSON.stringify(valor_nuevo) : undefined,
      fecha: new Date().toISOString(),
    });
  } catch {
    // auditoría no bloqueante
  }
}

export default function EquipmentForm({ open, onClose, onSubmit, equipment }) {
  const { user, canEdit } = useCurrentUser();
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (equipment) {
      setForm({
        asset_number: equipment.asset_number || "",
        type: equipment.type || "notebook",
        brand: equipment.brand || "",
        model: equipment.model || "",
        serial_number: equipment.serial_number || "",
        status: equipment.status || "disponible",
        user_type: equipment.user_type || "",
        assigned_to: equipment.assigned_to || "",
        username: equipment.username || "",
        department: equipment.department || "",
        delivery_date: equipment.delivery_date || "",
        comments: equipment.comments || "",
        peripherals_mouse: equipment.peripherals_mouse || false,
        peripherals_keyboard: equipment.peripherals_keyboard || false,
        peripherals_monitor: equipment.peripherals_monitor || false,
        peripherals_camera: equipment.peripherals_camera || false,
        processor_model: equipment.processor_model || "",
        storage_capacity: equipment.storage_capacity || "",
        storage_type: equipment.storage_type || "",
        ram_amount: equipment.ram_amount || "",
        ram_slots: equipment.ram_slots || "",
        ram_speed: equipment.ram_speed || "",
        ram_generation: equipment.ram_generation || "",
        ram_format: equipment.ram_format || "",
        operating_system: equipment.operating_system || "",
      });
    } else {
      setForm(INITIAL_FORM);
    }
  }, [equipment, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canEdit) return;
    // Auditoría
    if (equipment) {
      logAudit({
        user,
        accion: "editar",
        entidad_id: equipment.id,
        entidad_label: equipment.asset_number,
        valor_anterior: equipment,
        valor_nuevo: form,
      });
    } else {
      logAudit({
        user,
        accion: "crear",
        entidad_label: form.asset_number,
        valor_nuevo: form,
      });
    }
    onSubmit(form);
  };

  const isCpu = form.type === "cpu";
  const showHardwareSpecs = form.type === "cpu" || form.type === "notebook";

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={showHardwareSpecs ? "sm:max-w-2xl max-h-[90vh] overflow-y-auto" : "sm:max-w-lg"}>
        <DialogHeader>
          <DialogTitle>{equipment ? "Editar Equipo" : "Nuevo Equipo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>N° Activo</Label>
              <Input value={form.asset_number} onChange={(e) => updateField("asset_number", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => updateField("type", v)}>
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
              <Input value={form.brand} onChange={(e) => updateField("brand", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={form.model} onChange={(e) => updateField("model", e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>N° Serie</Label>
              <Input value={form.serial_number} onChange={(e) => updateField("serial_number", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Apellido y Nombre</Label>
              <Input value={form.assigned_to} onChange={(e) => updateField("assigned_to", e.target.value)} placeholder="Ej: García Juan" />
            </div>
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Input value={form.username} onChange={(e) => updateField("username", e.target.value)} placeholder="Ej: jgarnph" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Usuario</Label>
              <Select value={form.user_type} onValueChange={(v) => updateField("user_type", v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {USER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ubicación / Sector</Label>
              <Input value={form.department} onChange={(e) => updateField("department", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha de entrega</Label>
              <Input type="date" value={form.delivery_date} onChange={(e) => updateField("delivery_date", e.target.value)} />
            </div>
          </div>

          {showHardwareSpecs && (
            <>
              {isCpu && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Periféricos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: "peripherals_mouse", label: "Mouse" },
                    { key: "peripherals_keyboard", label: "Teclado" },
                    { key: "peripherals_monitor", label: "Monitor" },
                    { key: "peripherals_camera", label: "Cámara" },
                  ].map((p) => (
                    <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={form[p.key]} onCheckedChange={(v) => updateField(p.key, !!v)} />
                      <span className="text-sm">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              )}

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Hardware</h3>

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Procesador</Label>
                    <Input value={form.processor_model} onChange={(e) => updateField("processor_model", e.target.value)} placeholder="Ej: Intel Core i7-12700" />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Almacenamiento</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Input value={form.storage_capacity} onChange={(e) => updateField("storage_capacity", e.target.value)} placeholder="Ej: 512 GB" />
                      <Select value={form.storage_type} onValueChange={(v) => updateField("storage_type", v)}>
                        <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                        <SelectContent>
                          {STORAGE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Memoria RAM</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <Input value={form.ram_amount} onChange={(e) => updateField("ram_amount", e.target.value)} placeholder="Ej: 16 GB" />
                      <Input value={form.ram_slots} onChange={(e) => updateField("ram_slots", e.target.value)} placeholder="Slots (ej: 2)" type="number" />
                      <Input value={form.ram_speed} onChange={(e) => updateField("ram_speed", e.target.value)} placeholder="Ej: 3200 MHz" />
                      <Input value={form.ram_generation} onChange={(e) => updateField("ram_generation", e.target.value)} placeholder="Ej: DDR4" />
                      <Input value={form.ram_format} onChange={(e) => updateField("ram_format", e.target.value)} placeholder="Ej: DIMM" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Sistema Operativo</h3>
                <Input value={form.operating_system} onChange={(e) => updateField("operating_system", e.target.value)} placeholder="Ej: Windows 11 Pro" />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Comentarios</Label>
            <Textarea value={form.comments} onChange={(e) => updateField("comments", e.target.value)} rows={2} />
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