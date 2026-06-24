import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileText } from "lucide-react";

export default function Contracts() {
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(null);

  const { data: deliveries = [] } = useQuery({
    queryKey: ["deliveries"],
    queryFn: () => base44.entities.Delivery.list("-created_date", 500),
  });

  const filtered = deliveries.filter((item) => {
    const q = search.toLowerCase();
    return !search ||
      item.recipient_name?.toLowerCase().includes(q) ||
      item.equipment_asset?.toLowerCase().includes(q) ||
      item.equipment_model?.toLowerCase().includes(q);
  });

  const handleOpen = async (deliveryId) => {
    try {
      setDownloading(deliveryId);
      const response = await base44.functions.invoke('generateContractPdf', { deliveryId, format: 'pdf' });
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contratos</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} contratos de equipos</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, activo o modelo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

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
            {filtered.map((delivery) => (
              <TableRow key={delivery.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">{delivery.recipient_name}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {delivery.equipment_brand} {delivery.equipment_model}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  {delivery.delivery_date ? new Date(delivery.delivery_date).toLocaleDateString('es-AR') : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => handleOpen(delivery.id)} disabled={!!downloading}>
                    {downloading === delivery.id
                      ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      : <FileText className="w-3.5 h-3.5" />}
                    Ver contrato
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No hay contratos</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}