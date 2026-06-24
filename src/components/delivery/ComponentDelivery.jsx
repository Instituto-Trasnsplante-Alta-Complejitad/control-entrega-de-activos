import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Search, CheckCircle2, Plus, Minus } from "lucide-react";
import { format } from "date-fns";

const COMPONENT_TYPES = ["RAM", "SSD", "HDD", "NVMe", "Fuente", "Otro"];

export default function ComponentDelivery({ onSuccess }) {
  const { toast } = useToast();
  const [equipSearch, setEquipSearch] = useState("");
  const [selectedEquip, setSelectedEquip] = useState(null);
  const [action, setAction] = useState("instalar"); // instalar | retirar | intercambiar
  const [installType, setInstallType] = useState("RAM");
  const [installStockId, setInstallStockId] = useState("");
  const [installQty, setInstallQty] = useState(1);
  const [removeType, setRemoveType] = useState("RAM");
  const [removeDesc, setRemoveDesc] = useState("");
  const [removeQty, setRemoveQty] = useState(1);
  const [removeToStock, setRemoveToStock] = useState("si");
  const [usuario, setUsuario] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);

  const { data: equipment = [] } = useQuery({
    queryKey: ["equipment"],
    queryFn: () => base44.entities.Equipment.list("asset_number", 500),
  });

  const { data: stockItems = [] } = useQuery({
    queryKey: ["component-stock"],
    queryFn: () => base44.entities.ComponentStock.list("codigo", 500),
  });

  const searchResults = equipSearch.length >= 2
    ? equipment.filter((e) => {
        const q = equipSearch.toLowerCase();
        return e.asset_number?.toLowerCase().includes(q) ||
          e.brand?.toLowerCase().includes(q) ||
          e.model?.toLowerCase().includes(q) ||
          e.assigned_to?.toLowerCase().includes(q) ||
          e.username?.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  const pcStock = stockItems.filter((s) => s.categoria === "PC" && s.cantidad_actual > 0);
  const selectedInstallStock = stockItems.find((s) => s.id === installStockId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEquip) return;

    const installQtyN = Number(installQty);
    const removeQtyN = Number(removeQty);

    // Validar stock para instalación
    if ((action === "instalar" || action === "intercambiar") && installStockId) {
      if (selectedInstallStock && selectedInstallStock.cantidad_actual < installQtyN) {
        toast({ title: "Stock insuficiente", description: `Stock disponible: ${selectedInstallStock.cantidad_actual}`, variant: "destructive", duration: 3000 });
        return;
      }
    }

    setLoading(true);
    try {
      const movRef = `${selectedEquip.asset_number}-${fechaEntrega}`;

      // Descontar componente instalado
      if ((action === "instalar" || action === "intercambiar") && installStockId && selectedInstallStock) {
        const nuevaCant = selectedInstallStock.cantidad_actual - installQtyN;
        await base44.entities.ComponentStock.update(selectedInstallStock.id, { cantidad_actual: nuevaCant });
        await base44.entities.StockMovement.create({
          component_stock_id: selectedInstallStock.id,
          codigo: selectedInstallStock.codigo,
          tipo_movimiento: "instalacion",
          cantidad: installQtyN,
          cantidad_anterior: selectedInstallStock.cantidad_actual,
          cantidad_nueva: nuevaCant,
          motivo: `Instalación en equipo ${selectedEquip.asset_number}: ${motivo}`,
          referencia_id: selectedEquip.id,
          referencia_tipo: "equipo",
          usuario_responsable: usuario,
          fecha: fechaEntrega,
          observaciones,
        });

        // Actualizar ficha del equipo si es RAM o almacenamiento
        const updates = {};
        if (installType === "RAM") updates.ram_amount = selectedInstallStock.capacidad || selectedInstallStock.modelo;
        if (installType === "SSD" || installType === "HDD" || installType === "NVMe") {
          updates.storage_capacity = selectedInstallStock.capacidad || selectedInstallStock.modelo;
          updates.storage_type = installType;
        }
        if (Object.keys(updates).length > 0) {
          await base44.entities.Equipment.update(selectedEquip.id, updates);
        }
      }

      // Agregar al stock el componente retirado
      if ((action === "retirar" || action === "intercambiar") && removeDesc) {
        if (removeToStock === "si") {
          // Buscar si ya existe en stock
          const existing = stockItems.find((s) => s.codigo === removeDesc && s.categoria === "PC");
          if (existing) {
            const nuevaCant = existing.cantidad_actual + removeQtyN;
            await base44.entities.ComponentStock.update(existing.id, { cantidad_actual: nuevaCant });
            await base44.entities.StockMovement.create({
              component_stock_id: existing.id,
              codigo: existing.codigo,
              tipo_movimiento: "retiro",
              cantidad: removeQtyN,
              cantidad_anterior: existing.cantidad_actual,
              cantidad_nueva: nuevaCant,
              motivo: `Retiro de equipo ${selectedEquip.asset_number}: ${motivo}`,
              referencia_id: selectedEquip.id,
              referencia_tipo: "equipo",
              usuario_responsable: usuario,
              fecha: fechaEntrega,
              observaciones,
            });
          }
        } else {
          // Dar de baja
          const existing = stockItems.find((s) => s.codigo === removeDesc && s.categoria === "PC");
          if (existing) {
            await base44.entities.StockMovement.create({
              component_stock_id: existing.id,
              codigo: removeDesc,
              tipo_movimiento: "baja",
              cantidad: removeQtyN,
              cantidad_anterior: existing.cantidad_actual,
              cantidad_nueva: existing.cantidad_actual,
              motivo: `Baja desde equipo ${selectedEquip.asset_number}: ${motivo}`,
              referencia_id: selectedEquip.id,
              referencia_tipo: "equipo",
              usuario_responsable: usuario,
              fecha: fechaEntrega,
              observaciones,
            });
          }
        }
      }

      toast({ title: "Movimiento registrado", description: "El componente fue registrado y el equipo actualizado", duration: 2000 });
      onSuccess?.();
    } catch {
      toast({ title: "Error", description: "No se pudo registrar el movimiento", variant: "destructive", duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Buscar Equipo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por activo, marca, modelo, usuario..."
              value={equipSearch}
              onChange={(e) => { setEquipSearch(e.target.value); setSelectedEquip(null); }}
              className="pl-9"
            />
          </div>
          {searchResults.length > 0 && !selectedEquip && (
            <div className="border rounded-lg divide-y">
              {searchResults.map((eq) => (
                <button
                  key={eq.id}
                  type="button"
                  className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors text-sm"
                  onClick={() => { setSelectedEquip(eq); setEquipSearch(`${eq.asset_number} — ${eq.brand} ${eq.model}`); }}
                >
                  <span className="font-mono font-semibold">{eq.asset_number}</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span>{eq.brand} {eq.model}</span>
                  {eq.assigned_to && <span className="text-muted-foreground ml-2">· {eq.assigned_to}</span>}
                </button>
              ))}
            </div>
          )}
          {selectedEquip && (
            <div className="p-3 bg-muted rounded-lg text-sm grid grid-cols-2 gap-x-4 gap-y-1">
              <p><span className="font-medium">Activo:</span> {selectedEquip.asset_number}</p>
              <p><span className="font-medium">Modelo:</span> {selectedEquip.brand} {selectedEquip.model}</p>
              <p><span className="font-medium">RAM actual:</span> {selectedEquip.ram_amount || "—"}</p>
              <p><span className="font-medium">Almacenamiento:</span> {selectedEquip.storage_capacity || "—"} {selectedEquip.storage_type || ""}</p>
              <p><span className="font-medium">Asignado a:</span> {selectedEquip.assigned_to || "—"}</p>
              <p><span className="font-medium">Sector:</span> {selectedEquip.department || "—"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedEquip && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tipo de operación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                {[
                  { v: "instalar", label: "Instalar componente", icon: <Plus className="w-4 h-4" /> },
                  { v: "retirar", label: "Retirar componente", icon: <Minus className="w-4 h-4" /> },
                  { v: "intercambiar", label: "Intercambiar (retirar + instalar)", icon: <CheckCircle2 className="w-4 h-4" /> },
                ].map(({ v, label, icon }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAction(v)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      action === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {(action === "instalar" || action === "intercambiar") && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Componente a instalar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Tipo de componente</Label>
                    <Select value={installType} onValueChange={setInstallType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COMPONENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Cantidad</Label>
                    <Input type="number" min="1" value={installQty} onChange={(e) => setInstallQty(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Seleccionar del stock</Label>
                  <Select value={installStockId} onValueChange={setInstallStockId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar ítem de stock..." /></SelectTrigger>
                    <SelectContent>
                      {pcStock.filter((s) => s.tipo === installType || installType === "Otro").map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.codigo} {s.capacidad ? `· ${s.capacidad}` : ""} · Stock: {s.cantidad_actual}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedInstallStock && (
                    <p className="text-xs text-muted-foreground">
                      Stock disponible: <span className={selectedInstallStock.cantidad_actual <= selectedInstallStock.cantidad_minima ? "text-red-600 font-bold" : "font-medium"}>{selectedInstallStock.cantidad_actual}</span> unidades
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {(action === "retirar" || action === "intercambiar") && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Componente a retirar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Tipo de componente</Label>
                    <Select value={removeType} onValueChange={setRemoveType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COMPONENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Cantidad</Label>
                    <Input type="number" min="1" value={removeQty} onChange={(e) => setRemoveQty(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Código / descripción del componente retirado</Label>
                  <Input value={removeDesc} onChange={(e) => setRemoveDesc(e.target.value)} placeholder="Ej: RAM 4GB DDR4, SSD 256GB..." />
                </div>
                <div className="space-y-1">
                  <Label>¿El componente vuelve al stock?</Label>
                  <Select value={removeToStock} onValueChange={setRemoveToStock}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sí, vuelve al stock</SelectItem>
                      <SelectItem value="no">No, se da de baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Datos del movimiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Usuario responsable</Label>
                  <Input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Apellido y Nombre" />
                </div>
                <div className="space-y-1">
                  <Label>Fecha</Label>
                  <Input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Motivo</Label>
                <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo del movimiento..." />
              </div>
              <div className="space-y-1">
                <Label>Observaciones</Label>
                <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={loading} className="w-full gap-2" size="lg">
            <CheckCircle2 className="w-4 h-4" />
            {loading ? "Registrando..." : "Confirmar Movimiento de Componente"}
          </Button>
        </>
      )}
    </form>
  );
}