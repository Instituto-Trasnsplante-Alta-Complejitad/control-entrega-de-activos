import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Printer, Cpu } from "lucide-react";

export default function SupplyHistory() {
  const [search, setSearch] = useState("");

  const { data: printerDeliveries = [] } = useQuery({
    queryKey: ["printer-deliveries"],
    queryFn: () => base44.entities.PrinterDelivery.list("-created_date", 500),
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["stock-movements"],
    queryFn: () => base44.entities.StockMovement.list("-created_date", 500),
  });

  const filteredPrinter = printerDeliveries.filter((item) => {
    const q = search.toLowerCase();
    return !search ||
      item.printer_asset_id?.toLowerCase().includes(q) ||
      item.printer_modelo?.toLowerCase().includes(q) ||
      item.receptor_nombre?.toLowerCase().includes(q) ||
      item.toner_codigo?.toLowerCase().includes(q);
  });

  const filteredMovements = movements.filter((item) => {
    const q = search.toLowerCase();
    return !search ||
      item.codigo?.toLowerCase().includes(q) ||
      item.tipo_movimiento?.toLowerCase().includes(q) ||
      item.motivo?.toLowerCase().includes(q) ||
      item.usuario_responsable?.toLowerCase().includes(q);
  });

  const estadoBadge = (estado) => {
    if (estado === "completada") return "bg-green-100 text-green-700";
    if (estado === "anulada") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const movBadge = (tipo) => {
    if (["entrada"].includes(tipo)) return "bg-green-100 text-green-700";
    if (["salida", "baja", "retiro"].includes(tipo)) return "bg-red-100 text-red-700";
    return "bg-blue-100 text-blue-700";
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historial de Consumos</h1>
        <p className="text-sm text-muted-foreground mt-1">Suministros de impresoras y movimientos de componentes de PC</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Tabs defaultValue="suministros">
        <TabsList>
          <TabsTrigger value="suministros" className="gap-1.5">
            <Printer className="w-4 h-4" /> Suministros ({filteredPrinter.length})
          </TabsTrigger>
          <TabsTrigger value="componentes" className="gap-1.5">
            <Cpu className="w-4 h-4" /> Componentes PC ({filteredMovements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suministros" className="mt-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Impresora</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Sector / Edificio</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Toner</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Unid. Imagen</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Receptor</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Fecha</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrinter.map((d) => (
                  <TableRow key={d.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <p className="font-mono text-xs font-semibold">{d.printer_asset_id}</p>
                      <p className="text-xs text-muted-foreground">{d.printer_marca} {d.printer_modelo}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {d.printer_sector || "—"} · {d.printer_edificio || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {d.toner_codigo ? <span>{d.toner_codigo} <span className="text-muted-foreground">×{d.toner_cantidad_entregada}</span></span> : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">
                      {d.unidad_imagen_codigo ? <span>{d.unidad_imagen_codigo} <span className="text-muted-foreground">×{d.unidad_imagen_cantidad_entregada}</span></span> : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{d.receptor_nombre || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {d.fecha_entrega ? new Date(d.fecha_entrega).toLocaleDateString("es-AR") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={estadoBadge(d.estado)}>{d.estado}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPrinter.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No hay entregas de suministros</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="componentes" className="mt-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Código</TableHead>
                  <TableHead className="font-semibold">Movimiento</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Cantidad</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Stock anterior → nuevo</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Motivo</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Responsable</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((m) => (
                  <TableRow key={m.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold">{m.codigo || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={movBadge(m.tipo_movimiento)}>{m.tipo_movimiento}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{m.cantidad}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {m.cantidad_anterior ?? "—"} → {m.cantidad_nueva ?? "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{m.motivo || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{m.usuario_responsable || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {m.fecha ? new Date(m.fecha).toLocaleDateString("es-AR") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMovements.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No hay movimientos registrados</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}