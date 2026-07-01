import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import EquipmentSearch from "./EquipmentSearch";

export default function PuntoForm({ open, onClose, onSave, initial, existingEquipoIds }) {
  const [equipo, setEquipo] = useState(null);
  const [observacion, setObservacion] = useState("");

  useEffect(() => {
    if (open) {
      setEquipo(initial?.equipo || null);
      setObservacion(initial?.observacion || "");
    }
  }, [open, initial]);

  const isDuplicate = equipo && existingEquipoIds?.includes(equipo.id) && initial?.equipo?.id !== equipo.id;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar punto" : "Asociar equipo al punto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Equipo</Label>
            <EquipmentSearch selected={equipo} onSelect={setEquipo} />
            {isDuplicate && (
              <p className="text-xs text-amber-600">
                Este equipo ya tiene un punto en este plano. ¿Continuar igualmente?
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Observación</Label>
            <Textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} rows={2} placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!equipo} onClick={() => onSave({ equipo_id: equipo.id, observacion })}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}