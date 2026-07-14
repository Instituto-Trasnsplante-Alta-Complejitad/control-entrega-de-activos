import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ExternalLink, Printer, Monitor } from "lucide-react";

const TYPE_LABELS = { notebook: "Notebook", all_in_one: "All in One", tablet: "Tablet", celular: "Celular", cpu: "CPU", otro: "Otro" };
const STATUS_LABELS = { disponible: "Disponible", asignado: "Asignado", en_reparacion: "En reparación", baja: "Baja" };
const STATUS_COLORS = {
  disponible: "bg-emerald-100 text-emerald-700",
  asignado: "bg-blue-100 text-blue-700",
  en_reparacion: "bg-amber-100 text-amber-700",
  baja: "bg-red-100 text-red-700",
};

function EquipoBlock({ entity }) {
  return (
    <div className="border rounded-lg p-3 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Monitor className="w-4 h-4 text-muted-foreground" />
        <span className="font-semibold">{entity?.asset_number || "Equipo no encontrado"}</span>
        {entity && (
          <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[entity.status] || ""}`}>
            {STATUS_LABELS[entity.status] || entity.status}
          </span>
        )}
        {entity && (
          <Button size="sm" variant="ghost" asChild className="ml-auto h-7 px-2">
            <Link to={`/equipo/${entity.id}`} target="_blank">
              Ficha <ExternalLink className="w-3 h-3" />
            </Link>
          </Button>
        )}
      </div>
      {entity ? (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>{TYPE_LABELS[entity.type] || entity.type} · {[entity.brand, entity.model].filter(Boolean).join(" ")}</div>
          {entity.assigned_to && <div>Usuario: {entity.assigned_to}</div>}
          {entity.department && <div>Sector: {entity.department}</div>}
          {entity.processor_model && <div>CPU: {entity.processor_model}</div>}
          {(entity.ram_amount || entity.storage_capacity) && (
            <div>RAM: {entity.ram_amount || "-"} · Alm: {[entity.storage_capacity, entity.storage_type].filter(Boolean).join(" ") || "-"}</div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Equipo no encontrado.</p>
      )}
    </div>
  );
}

function ImpresoraBlock({ entity }) {
  return (
    <div className="border rounded-lg p-3 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Printer className="w-4 h-4 text-muted-foreground" />
        <span className="font-semibold">{entity?.printer_id || "Impresora no encontrada"}</span>
        {entity?.estado && (
          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{entity.estado}</span>
        )}
      </div>
      {entity ? (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>{[entity.marca, entity.modelo].filter(Boolean).join(" ")}</div>
          {entity.sector && <div>Sector: {entity.sector}</div>}
          {entity.piso && <div>Piso: {entity.piso}</div>}
          {entity.conexion && <div>Conexión: {entity.conexion}</div>}
          {entity.toner && <div>Toner: {entity.toner}</div>}
          {entity.unidad_imagen && <div>Unidad imagen: {entity.unidad_imagen}</div>}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Impresora no encontrada.</p>
      )}
    </div>
  );
}

export default function PuntoDetailModal({ punto, items, equiposById, impresorasById, open, onClose, canEdit, onEdit, onDelete }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Punto del mapa
            <Badge variant="secondary">{items.length} ítem{items.length !== 1 ? "s" : ""}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-2 max-h-[50vh] overflow-auto">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este punto no tiene ítems asociados.</p>
          ) : (
            items.map((it, idx) =>
              it.tipo === "equipo" ? (
                <EquipoBlock key={`eq:${it.id}:${idx}`} entity={equiposById?.[it.id]} />
              ) : (
                <ImpresoraBlock key={`imp:${it.id}:${idx}`} entity={impresorasById?.[it.id]} />
              )
            )
          )}
          {punto?.observacion && (
            <div className="text-sm text-muted-foreground pt-1">
              <span className="font-medium text-foreground">Observación: </span>{punto.observacion}
            </div>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
          <div className="flex gap-2 flex-wrap">
            {canEdit && (
              <Button variant="outline" size="lg" onClick={onEdit}>
                Editar ítems
              </Button>
            )}
            {canEdit && (
              <Button variant="destructive" size="lg" onClick={onDelete}>
                Eliminar punto
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}