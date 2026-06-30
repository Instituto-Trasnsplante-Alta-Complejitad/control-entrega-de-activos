import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function StockMovementForm({ open, item, initialType, onClose, onSuccess }) {
  const { toast } = useToast();
  const { user, canAdjustStock } = useCurrentUser();
  const [tipo, setTipo] = useState(initialType || "entrada");
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [usuario, setUsuario] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canAdjustStock) {
      toast({ title: "Sin permisos", description: "No tenés permisos para realizar esta acción.", variant: "destructive", duration: 3000 });
      return;
    }
    const cant = Number(cantidad);
    if (!cant || cant <= 0) {
      toast({ title: "Error", description: "La cantidad debe ser mayor a 0", variant: "destructive", duration: 2000 });
      return;
    }

    const cantActual = item.cantidad_actual ?? 0;
    let cantNueva;

    if (tipo === "entrada" || tipo === "ajuste") {
      cantNueva = tipo === "ajuste" ? cant : cantActual + cant;
    } else {
      // salida, instalacion, retiro, baja
      if (tipo !== "ajuste" && cantActual < cant) {
        toast({ title: "Stock insuficiente", description: `Stock disponible: ${cantActual}`, variant: "destructive", duration: 3000 });
        return;
      }
      cantNueva = cantActual - cant;
    }

    setLoading(true);
    try {
      await base44.entities.ComponentStock.update(item.id, { cantidad_actual: cantNueva });
      await base44.entities.StockMovement.create({
        component_stock_id: item.id,
        codigo: item.codigo,
        tipo_movimiento: tipo,
        cantidad: cant,
        cantidad_anterior: cantActual,
        cantidad_nueva: cantNueva,
        motivo,
        usuario_responsable: usuario || user?.full_name || "",
        fecha: format(new Date(), "yyyy-MM-dd"),
        observaciones,
        referencia_tipo: "ajuste manual",
      });
      // Auditoría
      await base44.entities.AuditLog.create({
        usuario_email: user?.email || "desconocido",
        usuario_nombre: user?.full_name || "",
        accion: "ajuste_stock",
        entidad: "ComponentStock",
        entidad_id: item.id,
        entidad_label: item.codigo,
        valor_anterior: String(cantActual),
        valor_nuevo: String(cantNueva),
        observacion: `${tipo} · motivo: ${motivo || "—"}`,
        fecha: new Date().toISOString(),
      }).catch(() => {});
      toast({ title: "Movimiento registrado", description: `Stock actualizado: ${cantNueva}`, duration: 1500 });
      setLoading(false);
      onClose();
      setTimeout(() => onSuccess(), 300);
    } catch {
      setLoading(false);
      toast({ title: "Error", description: "No se pudo registrar el movimiento", variant: "destructive", duration: 3000 });
    }
  };

  const tipoLabels = {
    entrada: "Entrada de stock",
    salida: "Salida de stock",
    ajuste: "Ajuste manual",
    instalacion: "Instalación en equipo",
    retiro: "Retiro de equipo",
    baja: "Dar de baja",
  };

  const handleClose = () => {
    setTipo(initialType || "entrada");
    setCantidad(1);
    setMotivo("");
    setObservaciones("");
    setUsuario("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Movimiento de Stock</DialogTitle>
        </DialogHeader>
        <div className="mb-2 p-3 bg-muted rounded-lg text-sm space-y-1">
          <p><span className="font-medium">Ítem:</span> <span className="font-mono">{item.codigo}</span></p>
          <p><span className="font-medium">Tipo:</span> {item.tipo}</p>
          <p>
            <span className="font-medium">Stock actual:</span>{" "}
            <Badge variant="outline" className={item.cantidad_actual <= item.cantidad_minima ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
              {item.cantidad_actual ?? 0} unidades
            </Badge>
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Tipo de movimiento</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(tipoLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Cantidad *</Label>
            <Input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
            {tipo === "ajuste" && <p className="text-xs text-muted-foreground">El ajuste establece la cantidad exacta.</p>}
          </div>
          <div className="space-y-1">
            <Label>Motivo</Label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo del movimiento..." />
          </div>
          <div className="space-y-1">
            <Label>Usuario responsable</Label>
            <Input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Apellido y Nombre" />
          </div>
          <div className="space-y-1">
            <Label>Observaciones</Label>
            <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Registrar movimiento"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}