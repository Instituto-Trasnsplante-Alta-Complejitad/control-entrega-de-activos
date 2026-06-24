import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function PrinterSupplyDelivery({ onSuccess }) {
  const { toast } = useToast();
  const [printerSearch, setPrinterSearch] = useState("");
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [tonerQtySol, setTonerQtySol] = useState(1);
  const [tonerQtyEnt, setTonerQtyEnt] = useState(1);
  const [uiQtySol, setUiQtySol] = useState(0);
  const [uiQtyEnt, setUiQtyEnt] = useState(0);
  const [receptor, setReceptor] = useState("");
  const [receptorSector, setReceptorSector] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);

  const { data: printers = [] } = useQuery({
    queryKey: ["printers"],
    queryFn: () => base44.entities.Printer.list("numero", 500),
  });

  const { data: stockItems = [] } = useQuery({
    queryKey: ["component-stock"],
    queryFn: () => base44.entities.ComponentStock.list("codigo", 500),
  });

  const searchResults = printerSearch.length >= 2
    ? printers.filter((p) => {
        const q = printerSearch.toLowerCase();
        return p.printer_id?.toLowerCase().includes(q) ||
          p.modelo?.toLowerCase().includes(q) ||
          p.marca?.toLowerCase().includes(q) ||
          p.sector?.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  const tonerStock = selectedPrinter?.toner
    ? stockItems.find((s) => s.codigo === selectedPrinter.toner && s.tipo === "Toner")
    : null;

  const uiStock = selectedPrinter?.unidad_imagen
    ? stockItems.find((s) => s.codigo === selectedPrinter.unidad_imagen && (s.tipo === "Unidad de imagen" || s.tipo === "Tambor"))
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPrinter) return;

    const tonerEnt = Number(tonerQtyEnt);
    const uiEnt = Number(uiQtyEnt);

    if (tonerEnt === 0 && uiEnt === 0) {
      toast({ title: "Error", description: "Debés entregar al menos toner o unidad de imagen", variant: "destructive", duration: 3000 });
      return;
    }

    if (tonerEnt > 0 && tonerStock && tonerStock.cantidad_actual < tonerEnt) {
      toast({ title: "Stock insuficiente", description: `Toner disponible: ${tonerStock.cantidad_actual}`, variant: "destructive", duration: 3000 });
      return;
    }

    if (uiEnt > 0 && uiStock && uiStock.cantidad_actual < uiEnt) {
      toast({ title: "Stock insuficiente", description: `Unidad de imagen disponible: ${uiStock.cantidad_actual}`, variant: "destructive", duration: 3000 });
      return;
    }

    setLoading(true);
    try {
      // Crear registro de entrega
      const delivery = await base44.entities.PrinterDelivery.create({
        printer_id_ref: selectedPrinter.id,
        printer_asset_id: selectedPrinter.printer_id,
        printer_marca: selectedPrinter.marca,
        printer_modelo: selectedPrinter.modelo,
        printer_piso: selectedPrinter.piso,
        printer_sector: selectedPrinter.sector,
        printer_edificio: selectedPrinter.edificio,
        printer_conexion: selectedPrinter.conexion,
        toner_codigo: selectedPrinter.toner || "",
        toner_cantidad_solicitada: Number(tonerQtySol),
        toner_cantidad_entregada: tonerEnt,
        toner_stock_id: tonerStock?.id || "",
        unidad_imagen_codigo: selectedPrinter.unidad_imagen || "",
        unidad_imagen_cantidad_solicitada: Number(uiQtySol),
        unidad_imagen_cantidad_entregada: uiEnt,
        unidad_imagen_stock_id: uiStock?.id || "",
        receptor_nombre: receptor,
        receptor_sector: receptorSector,
        fecha_entrega: fechaEntrega,
        observaciones,
        estado: "completada",
      });

      // Descontar toner del stock
      if (tonerEnt > 0 && tonerStock) {
        const nuevaCant = tonerStock.cantidad_actual - tonerEnt;
        await base44.entities.ComponentStock.update(tonerStock.id, { cantidad_actual: nuevaCant });
        await base44.entities.StockMovement.create({
          component_stock_id: tonerStock.id,
          codigo: tonerStock.codigo,
          tipo_movimiento: "salida",
          cantidad: tonerEnt,
          cantidad_anterior: tonerStock.cantidad_actual,
          cantidad_nueva: nuevaCant,
          motivo: `Entrega a impresora ${selectedPrinter.printer_id}`,
          referencia_id: delivery.id,
          referencia_tipo: "impresora",
          usuario_responsable: receptor,
          fecha: fechaEntrega,
          observaciones,
        });
      }

      // Descontar unidad de imagen del stock
      if (uiEnt > 0 && uiStock) {
        const nuevaCant = uiStock.cantidad_actual - uiEnt;
        await base44.entities.ComponentStock.update(uiStock.id, { cantidad_actual: nuevaCant });
        await base44.entities.StockMovement.create({
          component_stock_id: uiStock.id,
          codigo: uiStock.codigo,
          tipo_movimiento: "salida",
          cantidad: uiEnt,
          cantidad_anterior: uiStock.cantidad_actual,
          cantidad_nueva: nuevaCant,
          motivo: `Entrega a impresora ${selectedPrinter.printer_id}`,
          referencia_id: delivery.id,
          referencia_tipo: "impresora",
          usuario_responsable: receptor,
          fecha: fechaEntrega,
          observaciones,
        });
      }

      toast({ title: "Entrega registrada", description: "Suministros entregados y stock actualizado", duration: 2000 });
      onSuccess?.();
    } catch (err) {
      toast({ title: "Error", description: "No se pudo registrar la entrega", variant: "destructive", duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Buscar Impresora</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID, modelo, marca, sector..."
              value={printerSearch}
              onChange={(e) => { setPrinterSearch(e.target.value); setSelectedPrinter(null); }}
              className="pl-9"
            />
          </div>
          {searchResults.length > 0 && !selectedPrinter && (
            <div className="border rounded-lg divide-y">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors text-sm"
                  onClick={() => { setSelectedPrinter(p); setPrinterSearch(`${p.printer_id} — ${p.marca} ${p.modelo}`); }}
                >
                  <span className="font-mono font-semibold">{p.printer_id}</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span>{p.marca} {p.modelo}</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{p.edificio} · Piso {p.piso} · {p.sector}</span>
                </button>
              ))}
            </div>
          )}
          {selectedPrinter && (
            <div className="p-3 bg-muted rounded-lg text-sm grid grid-cols-2 gap-x-4 gap-y-1">
              <p><span className="font-medium">ID:</span> {selectedPrinter.printer_id}</p>
              <p><span className="font-medium">Marca/Modelo:</span> {selectedPrinter.marca} {selectedPrinter.modelo}</p>
              <p><span className="font-medium">Edificio:</span> {selectedPrinter.edificio || "—"}</p>
              <p><span className="font-medium">Piso:</span> {selectedPrinter.piso || "—"}</p>
              <p><span className="font-medium">Sector:</span> {selectedPrinter.sector || "—"}</p>
              <p><span className="font-medium">Conexión:</span> {selectedPrinter.conexion || "—"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPrinter && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">A. Toner — <span className="font-mono text-primary">{selectedPrinter.toner || "Sin código"}</span></CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedPrinter.toner ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <AlertCircle className="w-4 h-4" /> Este modelo no tiene toner asociado.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Stock disponible:</span>
                    {tonerStock ? (
                      <Badge variant="outline" className={tonerStock.cantidad_actual <= tonerStock.cantidad_minima ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                        {tonerStock.cantidad_actual} unidades
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-700">Sin registro en stock</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Cantidad solicitada</Label>
                      <Input type="number" min="0" value={tonerQtySol} onChange={(e) => setTonerQtySol(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Cantidad entregada</Label>
                      <Input type="number" min="0" value={tonerQtyEnt} onChange={(e) => setTonerQtyEnt(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">B. Unidad de Imagen — <span className="font-mono text-primary">{selectedPrinter.unidad_imagen || "Sin código"}</span></CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedPrinter.unidad_imagen ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <AlertCircle className="w-4 h-4" /> Este modelo no tiene unidad de imagen asociada.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Stock disponible:</span>
                    {uiStock ? (
                      <Badge variant="outline" className={uiStock.cantidad_actual <= uiStock.cantidad_minima ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                        {uiStock.cantidad_actual} unidades
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-700">Sin registro en stock</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Cantidad solicitada</Label>
                      <Input type="number" min="0" value={uiQtySol} onChange={(e) => setUiQtySol(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Cantidad entregada</Label>
                      <Input type="number" min="0" value={uiQtyEnt} onChange={(e) => setUiQtyEnt(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Datos de la entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Receptor / Responsable</Label>
                  <Input value={receptor} onChange={(e) => setReceptor(e.target.value)} placeholder="Apellido y Nombre" />
                </div>
                <div className="space-y-1">
                  <Label>Sector receptor</Label>
                  <Input value={receptorSector} onChange={(e) => setReceptorSector(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Fecha de entrega</Label>
                  <Input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Observaciones</Label>
                <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {selectedPrinter && (
        <Button type="submit" disabled={loading} className="w-full gap-2" size="lg">
          <CheckCircle2 className="w-4 h-4" />
          {loading ? "Registrando..." : "Confirmar Entrega de Suministros"}
        </Button>
      )}
    </form>
  );
}