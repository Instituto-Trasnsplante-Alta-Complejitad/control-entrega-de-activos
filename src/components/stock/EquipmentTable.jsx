import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

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

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 ml-1 text-muted-foreground/50" />;
  return sortDir === "asc"
    ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-primary" />
    : <ChevronDown className="w-3.5 h-3.5 ml-1 text-primary" />;
}

export default function EquipmentTable({ equipment, onEdit, onDelete }) {
  const [sortField, setSortField] = useState("asset_number");
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = [...equipment].sort((a, b) => {
    const valA = a[sortField] ?? "";
    const valB = b[sortField] ?? "";
    const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  const th = (label, field, className = "") => (
    <TableHead
      className={`font-semibold cursor-pointer select-none hover:bg-muted/70 transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {label}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </div>
    </TableHead>
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {th("N° Activo", "asset_number")}
            {th("Tipo", "type")}
            {th("Marca", "brand")}
            {th("Modelo", "model")}
            {th("N° Serie", "serial_number", "hidden md:table-cell")}
            {th("Apellido y Nombre", "assigned_to", "hidden lg:table-cell")}
            {th("Usuario", "username", "hidden xl:table-cell")}
            {th("Sector", "department", "hidden xl:table-cell")}
            {th("Fecha Entrega", "delivery_date", "hidden lg:table-cell")}
            {th("Estado", "status")}
            <TableHead className="font-semibold text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((item) => {
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
          {sorted.length === 0 && (
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