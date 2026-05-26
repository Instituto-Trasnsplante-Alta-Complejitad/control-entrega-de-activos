import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

const statusMap = {
  disponible: { label: "Disponible", className: "bg-green-100 text-green-700 border-green-200" },
  asignado: { label: "Asignado", className: "bg-blue-100 text-blue-700 border-blue-200" },
  baja: { label: "Baja", className: "bg-red-100 text-red-700 border-red-200" },
  en_reparacion: { label: "En reparación", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
};

const typeMap = {
  notebook: "Notebook",
  tablet: "Tablet",
  celular: "Celular",
  cpu: "CPU",
  otro: "Otro",
};

export default function EquipmentTable({ equipment, onEdit, onDelete }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">N° Activo</TableHead>
            <TableHead className="font-semibold">Tipo</TableHead>
            <TableHead className="font-semibold">Marca</TableHead>
            <TableHead className="font-semibold">Modelo</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">N° Serie</TableHead>
            <TableHead className="font-semibold hidden lg:table-cell">Apellido y Nombre</TableHead>
            <TableHead className="font-semibold hidden xl:table-cell">Usuario</TableHead>
            <TableHead className="font-semibold hidden xl:table-cell">Sector</TableHead>
            <TableHead className="font-semibold hidden lg:table-cell">Fecha Entrega</TableHead>
            <TableHead className="font-semibold">Estado</TableHead>
            <TableHead className="font-semibold text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {equipment.map((item) => {
            const status = statusMap[item.status] || statusMap.disponible;
            return (
              <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-xs">{item.asset_number}</TableCell>
                <TableCell>{typeMap[item.type] || item.type}</TableCell>
                <TableCell className="font-medium">{item.brand}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.model}</TableCell>
                <TableCell className="hidden md:table-cell font-mono text-xs">{item.serial_number}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{item.assigned_to || "—"}</TableCell>
                <TableCell className="hidden xl:table-cell font-mono text-xs">{item.username || "—"}</TableCell>
                <TableCell className="hidden xl:table-cell text-sm">{item.department || "—"}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{item.delivery_date || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(item)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {equipment.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                No hay equipos registrados
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}