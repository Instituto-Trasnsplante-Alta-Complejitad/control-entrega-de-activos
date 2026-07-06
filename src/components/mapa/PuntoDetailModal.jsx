import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

const TYPE_LABELS = { notebook: "Notebook", tablet: "Tablet", celular: "Celular", cpu: "CPU", otro: "Otro" };
const STATUS_LABELS = { disponible: "Disponible", asignado: "Asignado", en_reparacion: "En reparación", baja: "Baja" };
const STATUS_COLORS = {
  disponible: "bg-emerald-100 text-emerald-700",
  asignado: "bg-blue-100 text-blue-700",
  en_reparacion: "bg-amber-100 text-amber-700",
  baja: "bg-red-100 text-red-700",
};

function Field({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value || "-"}</span>
    </div>
  );
}

export default function PuntoDetailModal({ punto, equipment, open, onClose, canEdit, onEdit, onDelete }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {equipment?.asset_number || "Equipo"}
            {equipment && (
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[equipment.status] || ""}`}>
                {STATUS_LABELS[equipment.status] || equipment.status}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        {equipment ? (
          <div className="py-2">
            <Field label="Tipo" value={TYPE_LABELS[equipment.type] || equipment.type} />
            <Field label="Asset number" value={equipment.asset_number} />
            <Field label="Serial" value={equipment.serial_number} />
            <Field label="Marca / Modelo" value={`${equipment.brand || ""} ${equipment.model || ""}`.trim()} />
            <Field label="Usuario" value={equipment.assigned_to} />
            <Field label="Usuario de red" value={equipment.username} />
            <Field label="Sector" value={equipment.department} />
            <Field label="Procesador" value={equipment.processor_model} />
            <Field label="RAM" value={equipment.ram_amount} />
            <Field label="Almacenamiento" value={[equipment.storage_capacity, equipment.storage_type].filter(Boolean).join(" ")} />
            <Field label="Sistema operativo" value={equipment.operating_system} />
            {punto?.observacion && <Field label="Observación del punto" value={punto.observacion} />}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">Equipo no encontrado.</p>
        )}
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
          <div className="flex gap-2 flex-wrap">
            {canEdit && equipment && (
              <Button variant="outline" size="lg" onClick={onEdit}>
                Cambiar equipo
              </Button>
            )}
            {canEdit && (
              <Button variant="destructive" size="lg" onClick={onDelete}>
                Eliminar punto
              </Button>
            )}
          </div>
          {equipment && (
            <Button size="lg" asChild>
              <Link to={`/equipo/${equipment.id}`} target="_blank">
                Ver ficha completa <ExternalLink className="w-4 h-4" />
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}