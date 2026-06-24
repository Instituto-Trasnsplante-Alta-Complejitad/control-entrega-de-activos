import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

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

function truncate(str, max = 30) {
  if (!str) return "—";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function isGarbled(str) {
  if (!str) return false;
  // Detectar cadenas con caracteres repetidos inválidos (ÿ, null bytes, etc.)
  const garbled = (str.match(/[ÿ\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
  return garbled > 3 || garbled / str.length > 0.3;
}

function safeVal(str, max = 30) {
  if (!str || isGarbled(str)) return "—";
  return truncate(str, max);
}

const SPEC_LABELS = {
  ram_amount: "RAM",
  storage_capacity: "Almacenamiento",
};

export default function EquipmentTable({ equipment, onEdit, onDelete, highlightSpec }) {
  const [sortField, setSortField] = useState("asset_number");
  const [sortDir, setSortDir] = useState("asc");
  const [qrItem, setQrItem] = useState(null);

  const handleSort = (field) => {
    if (highlightSpec) return; // cuando hay filtro hardware activo, no permitir re-orden
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Si hay highlightSpec activo, respetar el orden que viene del panel
  const sorted = highlightSpec
    ? [...equipment]
    : [...equipment].sort((a, b) => {
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
    <div className="rounded-xl border border-border bg-card overflow-x-auto">
      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow className="bg-muted/50">
            {th("N° Activo", "asset_number", "w-28")}
            {th("Tipo", "type", "w-20")}
            {th("Marca", "brand", "w-24")}
            {th("Modelo", "model", "max-w-[150px]")}
            {th("N° Serie", "serial_number", "hidden md:table-cell max-w-[130px]")}
            {th("Apellido y Nombre", "assigned_to", "hidden lg:table-cell max-w-[150px]")}
            {th("Usuario", "username", "hidden xl:table-cell w-24")}
            {th("Sector", "department", "hidden xl:table-cell max-w-[120px]")}
            {highlightSpec && (
              <TableHead className="font-semibold w-24 text-primary">{SPEC_LABELS[highlightSpec] || highlightSpec}</TableHead>
            )}
            {th("Estado", "status", "w-28")}
            <TableHead className="font-semibold text-right w-24">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((item) => {
            const status = statusMap[item.status] || statusMap.disponible;
            return (
              <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-xs whitespace-nowrap">{item.asset_number}</TableCell>
                <TableCell className="text-xs">{typeMap[item.type] || item.type}</TableCell>
                <TableCell className="font-medium text-sm max-w-[96px] truncate" title={item.brand}>{safeVal(item.brand, 14)}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate" title={isGarbled(item.model) ? "" : item.model}>{safeVal(item.model, 22)}</TableCell>
                <TableCell className="hidden md:table-cell font-mono text-xs max-w-[130px] truncate" title={isGarbled(item.serial_number) ? "" : item.serial_number}>{safeVal(item.serial_number, 20)}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm max-w-[150px] truncate" title={item.assigned_to}>{item.assigned_to || "—"}</TableCell>
                <TableCell className="hidden xl:table-cell font-mono text-xs">{item.username || "—"}</TableCell>
                <TableCell className="hidden xl:table-cell text-sm max-w-[120px] truncate" title={item.department}>{item.department || "—"}</TableCell>
                {highlightSpec && (
                  <TableCell className="font-semibold text-sm text-primary">
                    {item[highlightSpec] || "—"}
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQrItem(item)} title="QR">
                      <QrCode className="w-3.5 h-3.5" />
                    </Button>
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
              <TableCell colSpan={highlightSpec ? 11 : 10} className="text-center py-12 text-muted-foreground">
                No hay equipos registrados
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={!!qrItem} onOpenChange={() => setQrItem(null)}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>QR del Equipo</DialogTitle>
          </DialogHeader>
          {qrItem && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div id="qr-print-area" className="flex flex-col items-center gap-3 p-4">
                <QRCodeSVG
                  value={`${window.location.origin}/equipo/${qrItem.id}`}
                  size={200}
                  level="M"
                />
                <p className="text-sm font-semibold">{qrItem.asset_number}</p>
                <p className="text-xs text-muted-foreground">{qrItem.brand} {safeVal(qrItem.model, 30)}</p>
              </div>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const printWin = window.open("", "_blank", "width=400,height=500");
                  const url = `${window.location.origin}/equipo/${qrItem.id}`;
                  printWin.document.write(`
                    <html><head><title>QR ${qrItem.asset_number}</title>
                    <style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;gap:12px;}p{margin:0;}canvas,svg{display:block;}</style>
                    </head><body>
                    ${document.getElementById("qr-print-area").innerHTML}
                    <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"><\/script>
                    <script>window.onload=()=>{document.querySelectorAll("svg").forEach(el=>el.remove());const c=document.createElement("canvas");document.body.prepend(c);QRCode.toCanvas(c,"${url}",{width:200},()=>{window.print();window.close();});}<\/script>
                    </body></html>
                  `);
                  printWin.document.close();
                }}
              >
                <Printer className="w-4 h-4" /> Imprimir QR
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}