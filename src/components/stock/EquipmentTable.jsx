import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Printer, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

const statusMap = {
  disponible: { label: "Disponible", className: "bg-green-100 text-green-700 border-green-200" },
  asignado: { label: "Asignado", className: "bg-blue-100 text-blue-700 border-blue-200" },
  baja: { label: "Baja", className: "bg-red-100 text-red-700 border-red-200" },
  en_reparacion: { label: "En reparación", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
};

const typeMap = {
  notebook: "Notebook",
  all_in_one: "All in One",
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

export default function EquipmentTable({ equipment, onEdit, onDelete, highlightSpec, sedesMap = {}, planosMap = {} }) {
  const ubicacionLabel = (item) => {
    const parts = [];
    if (item.sede_id && sedesMap[item.sede_id]) parts.push(sedesMap[item.sede_id]);
    if (item.plano_id && planosMap[item.plano_id]) parts.push(planosMap[item.plano_id]);
    if (item.ubicacion_detalle) parts.push(item.ubicacion_detalle);
    if (parts.length) return parts.join(" · ");
    return item.department || "—";
  };
  const { canEdit, canDelete } = useCurrentUser();
  const [sortField, setSortField] = useState("asset_number");
  const [sortDir, setSortDir] = useState("asc");
  const [qrItem, setQrItem] = useState(null);
  const navigate = useNavigate();

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
            {th("Ubicación", "department", "hidden xl:table-cell max-w-[160px]")}
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
                <TableCell className="hidden xl:table-cell text-sm max-w-[160px] truncate" title={ubicacionLabel(item)}>{ubicacionLabel(item)}</TableCell>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/mapa?equipo=${item.id}`)} title="Ver en mapa">
                      <MapPin className="w-3.5 h-3.5" />
                    </Button>
                    {canEdit && onEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canDelete && onDelete && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(item)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR del Equipo — {qrItem?.asset_number}</DialogTitle>
          </DialogHeader>
          {qrItem && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div id="qr-print-area" className="flex flex-col items-center gap-3 p-4 w-full">
                <QRCodeSVG
                  value={`${window.location.origin}/equipo/${qrItem.id}`}
                  size={180}
                  level="M"
                />
                <div className="text-center space-y-1 w-full">
                  <p className="text-sm font-bold font-mono">{qrItem.asset_number}</p>
                  {(qrItem.brand || qrItem.model) && (
                    <p className="text-xs text-muted-foreground">{qrItem.brand} {safeVal(qrItem.model, 40)}</p>
                  )}
                </div>
              </div>
              <div className="w-full text-xs grid grid-cols-2 gap-x-4 gap-y-1 border rounded-lg p-3 bg-muted/40">
                <div><span className="font-medium text-muted-foreground">Tipo:</span> {typeMap[qrItem.type] || qrItem.type}{qrItem.subtype ? ` / ${qrItem.subtype}` : ""}</div>
                <div><span className="font-medium text-muted-foreground">Estado:</span> {statusMap[qrItem.status]?.label || qrItem.status}</div>
                {qrItem.serial_number && <div><span className="font-medium text-muted-foreground">Serie:</span> <span className="font-mono">{safeVal(qrItem.serial_number, 25)}</span></div>}
                {qrItem.assigned_to && <div><span className="font-medium text-muted-foreground">Asignado:</span> {qrItem.assigned_to}</div>}
                {qrItem.department && <div><span className="font-medium text-muted-foreground">Sector:</span> {qrItem.department}</div>}
                {qrItem.processor_model && <div className="col-span-2"><span className="font-medium text-muted-foreground">CPU:</span> {safeVal(qrItem.processor_model, 50)}</div>}
                {qrItem.ram_amount && <div><span className="font-medium text-muted-foreground">RAM:</span> {qrItem.ram_amount}{qrItem.ram_generation ? ` ${qrItem.ram_generation}` : ""}</div>}
                {qrItem.storage_capacity && <div><span className="font-medium text-muted-foreground">Disco:</span> {qrItem.storage_capacity} {qrItem.storage_type || ""}</div>}
                {qrItem.ocs_lastdate && <div className="col-span-2"><span className="font-medium text-muted-foreground">Último OCS:</span> {qrItem.ocs_lastdate}</div>}
              </div>
              <Button
                variant="outline"
                className="gap-2 w-full"
                onClick={() => {
                  const printWin = window.open("", "_blank", "width=420,height=580");
                  const url = `${window.location.origin}/equipo/${qrItem.id}`;
                  const info = [
                    qrItem.asset_number,
                    `${qrItem.brand || ""} ${safeVal(qrItem.model, 40)}`.trim(),
                    qrItem.assigned_to ? `Asignado: ${qrItem.assigned_to}` : "",
                    qrItem.department ? `Sector: ${qrItem.department}` : "",
                    qrItem.ram_amount ? `RAM: ${qrItem.ram_amount}` : "",
                    qrItem.storage_capacity ? `Disco: ${qrItem.storage_capacity} ${qrItem.storage_type || ""}` : "",
                  ].filter(Boolean).map(t => `<p style="margin:2px 0;font-size:11px">${t}</p>`).join("");
                  printWin.document.write(`<html><head><title>QR ${qrItem.asset_number}</title>
                    <style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;padding:20px;margin:0;gap:8px;}p{margin:0;}</style>
                    </head><body>${info}
                    <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"><\/script>
                    <script>window.onload=()=>{const c=document.createElement("canvas");document.body.prepend(c);QRCode.toCanvas(c,"${url}",{width:200},()=>{window.print();window.close();});}<\/script>
                    </body></html>`);
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