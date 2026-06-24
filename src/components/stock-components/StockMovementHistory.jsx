import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const tipoColors = {
  entrada: "bg-green-100 text-green-700",
  salida: "bg-blue-100 text-blue-700",
  ajuste: "bg-yellow-100 text-yellow-700",
  instalacion: "bg-purple-100 text-purple-700",
  retiro: "bg-orange-100 text-orange-700",
  baja: "bg-red-100 text-red-700",
};

export default function StockMovementHistory({ open, item, onClose }) {
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["stock-movements", item?.id],
    queryFn: () => base44.entities.StockMovement.filter({ component_stock_id: item.id }, "-created_date", 100),
    enabled: !!item?.id,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial — <span className="font-mono">{item?.codigo}</span></DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Fecha</TableHead>
                <TableHead className="font-semibold">Tipo</TableHead>
                <TableHead className="font-semibold text-center">Cant.</TableHead>
                <TableHead className="font-semibold text-center">Anterior</TableHead>
                <TableHead className="font-semibold text-center">Nuevo</TableHead>
                <TableHead className="font-semibold">Usuario</TableHead>
                <TableHead className="font-semibold">Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs">{m.fecha || new Date(m.created_date).toLocaleDateString("es-AR")}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${tipoColors[m.tipo_movimiento] || ""}`}>
                      {m.tipo_movimiento}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-bold">{m.cantidad}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{m.cantidad_anterior ?? "—"}</TableCell>
                  <TableCell className="text-center font-medium">{m.cantidad_nueva ?? "—"}</TableCell>
                  <TableCell className="text-xs">{m.usuario_responsable || "—"}</TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate" title={m.motivo}>{m.motivo || "—"}</TableCell>
                </TableRow>
              ))}
              {movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sin movimientos registrados</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}