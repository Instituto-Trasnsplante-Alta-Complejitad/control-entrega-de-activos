import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import PrinterForm from "@/components/printers/PrinterForm";

const estadoMap = {
  activa: { label: "Activa", className: "bg-green-100 text-green-700 border-green-200" },
  inactiva: { label: "Inactiva", className: "bg-gray-100 text-gray-600 border-gray-200" },
  en_reparacion: { label: "En reparación", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  baja: { label: "Baja", className: "bg-red-100 text-red-700 border-red-200" },
};

export default function Printers() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState("");
  const [edificioFilter, setEdificioFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: printers = [], isLoading } = useQuery({
    queryKey: ["printers"],
    queryFn: () => base44.entities.Printer.list("numero", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Printer.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["printers"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Printer.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["printers"] }); setShowForm(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Printer.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["printers"] }); setDeleting(null); },
  });

  const filtered = printers.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      p.printer_id?.toLowerCase().includes(q) ||
      p.marca?.toLowerCase().includes(q) ||
      p.modelo?.toLowerCase().includes(q) ||
      p.sector?.toLowerCase().includes(q) ||
      p.piso?.toLowerCase().includes(q) ||
      p.edificio?.toLowerCase().includes(q) ||
      p.conexion?.toLowerCase().includes(q);
    const matchEdificio = edificioFilter === "all" || p.edificio === edificioFilter;
    return matchSearch && matchEdificio;
  });

  const edificios = [...new Set(printers.map((p) => p.edificio).filter(Boolean))].sort();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Impresoras</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} de {printers.length} impresoras</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2 self-start">
          <Plus className="w-4 h-4" /> Nueva Impresora
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por ID, marca, modelo, sector, piso, edificio, IP..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={edificioFilter} onValueChange={setEdificioFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Edificio" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los edificios</SelectItem>
            {edificios.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
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
                <TableHead className="font-semibold w-28">ID</TableHead>
                <TableHead className="font-semibold w-20">Marca</TableHead>
                <TableHead className="font-semibold">Modelo</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Piso</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Sector</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Edificio</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Conexión/IP</TableHead>
                <TableHead className="font-semibold hidden xl:table-cell">Toner</TableHead>
                <TableHead className="font-semibold hidden xl:table-cell">Unid. Imagen</TableHead>
                <TableHead className="font-semibold w-24">Estado</TableHead>
                <TableHead className="font-semibold text-right w-20">Acc.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const estado = estadoMap[p.estado] || estadoMap.activa;
                return (
                  <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs">{p.printer_id}</TableCell>
                    <TableCell className="text-sm font-medium">{p.marca}</TableCell>
                    <TableCell className="text-sm">{p.modelo}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{p.piso || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm max-w-[120px] truncate" title={p.sector}>{p.sector || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{p.edificio || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-xs">{p.conexion || "—"}</TableCell>
                    <TableCell className="hidden xl:table-cell text-xs max-w-[120px] truncate" title={p.toner}>{p.toner || "—"}</TableCell>
                    <TableCell className="hidden xl:table-cell text-xs max-w-[120px] truncate" title={p.unidad_imagen}>{p.unidad_imagen || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={estado.className}>{estado.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(p); setShowForm(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(p)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">No hay impresoras registradas</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <PrinterForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSubmit={(data) => editing ? updateMutation.mutate({ id: editing.id, data }) : createMutation.mutate(data)}
        printer={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar impresora?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará {deleting?.marca} {deleting?.modelo} ({deleting?.printer_id}). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleting.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}