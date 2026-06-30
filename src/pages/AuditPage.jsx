import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ShieldAlert } from "lucide-react";

const accionBadge = {
  crear: "bg-green-100 text-green-700",
  editar: "bg-blue-100 text-blue-700",
  baja: "bg-red-100 text-red-700",
  eliminar: "bg-red-100 text-red-700",
  ajuste_stock: "bg-yellow-100 text-yellow-700",
  editar_consumo: "bg-purple-100 text-purple-700",
  cambio_compatibilidad: "bg-orange-100 text-orange-700",
};

export default function AuditPage() {
  const { isAdmin } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [entidadFilter, setEntidadFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 500),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldAlert className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acceso restringido</h2>
        <p className="text-muted-foreground text-center">No tenés permisos para ver el historial de auditoría. Esta sección es exclusiva para administradores.</p>
      </div>
    );
  }

  const filtered = logs.filter((log) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      log.usuario_email?.toLowerCase().includes(q) ||
      log.usuario_nombre?.toLowerCase().includes(q) ||
      log.entidad_label?.toLowerCase().includes(q) ||
      log.accion?.toLowerCase().includes(q) ||
      log.observacion?.toLowerCase().includes(q);
    const matchEntidad = entidadFilter === "all" || log.entidad === entidadFilter;
    return matchSearch && matchEntidad;
  });

  const entidades = [...new Set(logs.map((l) => l.entidad).filter(Boolean))].sort();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoría</h1>
        <p className="text-sm text-muted-foreground mt-1">Historial de modificaciones realizadas por administradores — {filtered.length} registros</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuario, entidad, acción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={entidadFilter} onValueChange={setEntidadFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Entidad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las entidades</SelectItem>
            {entidades.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Fecha</TableHead>
                <TableHead className="font-semibold">Usuario</TableHead>
                <TableHead className="font-semibold">Acción</TableHead>
                <TableHead className="font-semibold">Entidad</TableHead>
                <TableHead className="font-semibold">Registro</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Anterior</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Nuevo</TableHead>
                <TableHead className="font-semibold hidden xl:table-cell">Observación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {log.fecha ? new Date(log.fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    <p className="font-medium">{log.usuario_nombre || "—"}</p>
                    <p className="text-xs text-muted-foreground">{log.usuario_email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={accionBadge[log.accion] || ""}>{log.accion}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.entidad}</TableCell>
                  <TableCell className="font-mono text-xs">{log.entidad_label || log.entidad_id || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs max-w-[160px] truncate text-muted-foreground" title={log.valor_anterior}>
                    {log.valor_anterior ? (log.valor_anterior.length > 60 ? log.valor_anterior.slice(0, 60) + "…" : log.valor_anterior) : "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs max-w-[160px] truncate" title={log.valor_nuevo}>
                    {log.valor_nuevo ? (log.valor_nuevo.length > 60 ? log.valor_nuevo.slice(0, 60) + "…" : log.valor_nuevo) : "—"}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">{log.observacion || "—"}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No hay registros de auditoría</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}