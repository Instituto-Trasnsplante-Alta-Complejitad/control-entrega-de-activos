import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Mail } from "lucide-react";

const statusMap = {
  pendiente: { label: "Pendiente", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  aceptado: { label: "Aceptado", className: "bg-green-100 text-green-700 border-green-200" },
  rechazado: { label: "Rechazado", className: "bg-red-100 text-red-700 border-red-200" },
  devuelto: { label: "Devuelto", className: "bg-gray-100 text-gray-700 border-gray-200" },
};

export default function Contracts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [downloading, setDownloading] = useState(null);
  const [sending, setSending] = useState(null);

  const { data: deliveries = [] } = useQuery({
    queryKey: ["deliveries"],
    queryFn: () => base44.entities.Delivery.list("-created_date", 500),
  });

  const filtered = deliveries.filter((item) => {
    const matchSearch = !search || 
      item.recipient_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.equipment_asset?.toLowerCase().includes(search.toLowerCase()) ||
      item.equipment_model?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDownload = async (deliveryId, recipientName) => {
    try {
      setDownloading(deliveryId);
      const response = await base44.functions.invoke('generateContractPdf', { deliveryId });
      
      if (response.data) {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Contrato-${recipientName}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error descargando contrato:', error);
      alert('Error al descargar el contrato');
    } finally {
      setDownloading(null);
    }
  };

  const handleResendEmail = async (deliveryId, recipientEmail, recipientName) => {
    try {
      setSending(deliveryId);
      const response = await base44.functions.invoke('sendDeliveryEmail', { deliveryId });
      if (response.data?.requiresInvite) {
        alert('El usuario debe estar registrado en la app primero. Por favor invítalo desde el dashboard.');
      } else {
        alert('Contrato reenviado por email');
      }
    } catch (error) {
      console.error('Error reenviando contrato:', error);
      alert('Error al reenviar el contrato: ' + (error.response?.data?.error || error.message));
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contratos</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} de {deliveries.length} contratos</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre, activo o modelo..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9" 
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="aceptado">Aceptado</SelectItem>
            <SelectItem value="rechazado">Rechazado</SelectItem>
            <SelectItem value="devuelto">Devuelto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Empleado</TableHead>
              <TableHead className="font-semibold hidden md:table-cell">Equipo</TableHead>
              <TableHead className="font-semibold hidden lg:table-cell">Fecha Entrega</TableHead>
              <TableHead className="font-semibold">Estado</TableHead>
              <TableHead className="font-semibold text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((delivery) => {
              const status = statusMap[delivery.status] || statusMap.pendiente;
              return (
                <TableRow key={delivery.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{delivery.recipient_name}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {delivery.equipment_brand} {delivery.equipment_model}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {new Date(delivery.delivery_date).toLocaleDateString('es-AR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleDownload(delivery.id, delivery.recipient_name)}
                      disabled={downloading === delivery.id}
                      title="Descargar PDF"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleResendEmail(delivery.id, delivery.recipient_email, delivery.recipient_name)}
                      disabled={sending === delivery.id}
                      title="Reenviar por email"
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No hay contratos
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}