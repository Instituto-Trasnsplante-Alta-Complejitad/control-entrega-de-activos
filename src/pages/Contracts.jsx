import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, Printer, Cpu } from "lucide-react";

export default function Contracts() {
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(null);

  const { data: deliveries = [] } = useQuery({
    queryKey: ["deliveries"],
    queryFn: () => base44.entities.Delivery.list("-created_date", 500),
  });

  const { data: printerDeliveries = [] } = useQuery({
    queryKey: ["printer-deliveries"],
    queryFn: () => base44.entities.PrinterDelivery.list("-created_date", 500),
  });

  const filteredEquip = deliveries.filter((item) => {
    const q = search.toLowerCase();
    return !search ||
      item.recipient_name?.toLowerCase().includes(q) ||
      item.equipment_asset?.toLowerCase().includes(q) ||
      item.equipment_model?.toLowerCase().includes(q);
  });

  const filteredPrinter = printerDeliveries.filter((item) => {
    const q = search.toLowerCase();
    return !search ||
      item.printer_asset_id?.toLowerCase().includes(q) ||
      item.printer_modelo?.toLowerCase().includes(q) ||
      item.receptor_nombre?.toLowerCase().includes(q) ||
      item.toner_codigo?.toLowerCase().includes(q);
  });

  const handleOpen = async (deliveryId, format = 'pdf') => {
    const key = `${deliveryId}-${format}`;
    try {
      setDownloading(key);
      const response = await base44.functions.invoke('generateContractPdf', { deliveryId, format });
      if (response.data) {
        const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const win = window.open('', '_blank');
        win.document.open();
        win.document.write(html);
        win.document.close();
      }
    } catch {
      alert('Error al generar el contrato');
    } finally {
      setDownloading(null);
    }
  };

  const totalContracts = filteredEquip.length + filteredPrinter.length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contratos</h1>
          <p className="text-sm text-muted-foreground mt-1">{totalContracts} contratos</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Tabs defaultValue="equipos">
        <TabsList>
          <TabsTrigger value="equipos" className="gap-1.5">
            <FileText className="w-4 h-4" /> Equipos ({filteredEquip.length})
          </TabsTrigger>
          <TabsTrigger value="suministros" className="gap-1.5">
            <Printer className="w-4 h-4" /> Suministros ({filteredPrinter.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="equipos" className="mt-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Empleado</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Equipo</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Fecha Entrega</TableHead>
                  <TableHead className="font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquip.map((delivery) => (
                  <TableRow key={delivery.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{delivery.recipient_name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {delivery.equipment_brand} {delivery.equipment_model}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {delivery.delivery_date ? new Date(delivery.delivery_date).toLocaleDateString('es-AR') : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => handleOpen(delivery.id, 'pdf')} disabled={!!downloading}>
                        {downloading === `${delivery.id}-pdf`
                          ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          : <FileText className="w-3.5 h-3.5" />}
                        Ver contrato
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEquip.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No hay contratos de equipos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

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
                      {d.toner_codigo ? (
                        <span>{d.toner_codigo} <span className="text-muted-foreground">×{d.toner_cantidad_entregada}</span></span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">
                      {d.unidad_imagen_codigo ? (
                        <span>{d.unidad_imagen_codigo} <span className="text-muted-foreground">×{d.unidad_imagen_cantidad_entregada}</span></span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{d.receptor_nombre || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {d.fecha_entrega ? new Date(d.fecha_entrega).toLocaleDateString("es-AR") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={d.estado === "completada" ? "bg-green-100 text-green-700" : d.estado === "anulada" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}>
                        {d.estado}
                      </Badge>
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
      </Tabs>
    </div>
  );
}