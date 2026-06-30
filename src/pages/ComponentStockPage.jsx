import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, History, AlertTriangle } from "lucide-react";
import ComponentStockForm from "@/components/stock-components/ComponentStockForm";
import StockMovementForm from "@/components/stock-components/StockMovementForm";
import StockMovementHistory from "@/components/stock-components/StockMovementHistory";

export default function ComponentStockPage() {
  const { user, canEdit, canDelete, canAdjustStock } = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [movementItem, setMovementItem] = useState(null);
  const [movementType, setMovementType] = useState("entrada");
  const [historyItem, setHistoryItem] = useState(null);
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["component-stock"],
    queryFn: () => base44.entities.ComponentStock.list("codigo", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ComponentStock.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["component-stock"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComponentStock.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["component-stock"] }); setShowForm(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (item) => {
      await base44.entities.ComponentStock.update(item.id, { estado: "baja" });
      await base44.entities.AuditLog.create({
        usuario_email: user?.email || "desconocido",
        usuario_nombre: user?.full_name || "",
        accion: "baja",
        entidad: "ComponentStock",
        entidad_id: item.id,
        entidad_label: item.codigo,
        valor_anterior: item.estado,
        valor_nuevo: "baja",
        fecha: new Date().toISOString(),
      }).catch(() => {});
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["component-stock"] }); setDeleting(null); },
  });

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      item.codigo?.toLowerCase().includes(q) ||
      item.marca?.toLowerCase().includes(q) ||
      item.modelo?.toLowerCase().includes(q) ||
      item.tipo?.toLowerCase().includes(q) ||
      item.proveedor?.toLowerCase().includes(q);
    const matchCat = categoriaFilter === "all" || item.categoria === categoriaFilter;
    const matchTipo = tipoFilter === "all" || item.tipo === tipoFilter;
    const matchLow = !lowStockOnly || item.cantidad_actual <= item.cantidad_minima;
    return matchSearch && matchCat && matchTipo && matchLow;
  });

  const pcItems = filtered.filter((i) => i.categoria === "PC");
  const printerItems = filtered.filter((i) => i.categoria === "Impresora");
  const lowStockCount = items.filter((i) => i.cantidad_actual <= i.cantidad_minima).length;

  const tiposPC = ["RAM", "HDD", "SSD", "NVMe", "Fuente", "Otro"];
  const tiposImpresora = ["Toner", "Unidad de imagen", "Tambor", "Otro"];

  const renderTable = (list) => (
    <div className="rounded-xl border border-border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Código</TableHead>
            <TableHead className="font-semibold">Tipo</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Marca</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Modelo</TableHead>
            <TableHead className="font-semibold hidden lg:table-cell">Capacidad</TableHead>
            <TableHead className="font-semibold hidden lg:table-cell">Compatibilidad</TableHead>
            <TableHead className="font-semibold text-center w-24">Stock</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Proveedor</TableHead>
            <TableHead className="font-semibold text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((item) => {
            const isLow = item.cantidad_actual <= item.cantidad_minima;
            return (
              <TableRow key={item.id} className={`hover:bg-muted/30 transition-colors ${isLow ? "bg-red-50/50" : ""}`}>
                <TableCell className="font-mono text-xs font-semibold">{item.codigo}</TableCell>
                <TableCell className="text-sm">
                  <Badge variant="outline" className="text-xs">{item.tipo}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">{item.marca || "—"}</TableCell>
                <TableCell className="hidden md:table-cell text-sm max-w-[120px] truncate" title={item.modelo}>{item.modelo || "—"}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{item.capacidad || "—"}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs max-w-[150px] truncate" title={item.compatibilidad}>{item.compatibilidad || "—"}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                    <span className={`font-bold text-sm ${isLow ? "text-red-600" : "text-foreground"}`}>
                      {item.cantidad_actual ?? 0}
                    </span>
                    <span className="text-xs text-muted-foreground">/ mín {item.cantidad_minima ?? 1}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">{item.proveedor || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {canAdjustStock && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" title="Entrada" onClick={() => { setMovementItem(item); setMovementType("entrada"); }}>
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700" title="Salida" onClick={() => { setMovementItem(item); setMovementType("salida"); }}>
                          <ArrowDownCircle className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Historial" onClick={() => setHistoryItem(item)}>
                      <History className="w-3.5 h-3.5" />
                    </Button>
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(item); setShowForm(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(item)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {list.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No hay ítems registrados</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock de Componentes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} de {items.length} ítems
            {lowStockCount > 0 && (
              <span className="ml-2 text-red-600 font-medium">· {lowStockCount} con stock bajo</span>
            )}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2 self-start">
            <Plus className="w-4 h-4" /> Nuevo Ítem
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por código, marca, modelo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoriaFilter} onValueChange={(v) => { setCategoriaFilter(v); setTipoFilter("all"); }}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="PC">PC</SelectItem>
            <SelectItem value="Impresora">Impresora</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {(categoriaFilter === "Impresora" ? tiposImpresora : categoriaFilter === "PC" ? tiposPC : [...tiposPC, ...tiposImpresora]).map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={lowStockOnly ? "default" : "outline"}
          className="gap-2"
          onClick={() => setLowStockOnly(!lowStockOnly)}
        >
          <AlertTriangle className="w-4 h-4" /> Stock bajo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <Tabs defaultValue="pc">
          <TabsList>
            <TabsTrigger value="pc">Componentes PC ({pcItems.length})</TabsTrigger>
            <TabsTrigger value="impresora">Suministros Impresora ({printerItems.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pc" className="mt-4">{renderTable(pcItems)}</TabsContent>
          <TabsContent value="impresora" className="mt-4">{renderTable(printerItems)}</TabsContent>
        </Tabs>
      )}

      {canEdit && (
        <ComponentStockForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSubmit={(data) => editing ? updateMutation.mutate({ id: editing.id, data }) : createMutation.mutate(data)}
          item={editing}
        />
      )}

      {canAdjustStock && movementItem && (
        <StockMovementForm
          open={!!movementItem}
          item={movementItem}
          initialType={movementType}
          onClose={() => setMovementItem(null)}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ["component-stock"] }); setMovementItem(null); }}
        />
      )}

      {historyItem && (
        <StockMovementHistory
          open={!!historyItem}
          item={historyItem}
          onClose={() => setHistoryItem(null)}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dar de baja este ítem?</AlertDialogTitle>
            <AlertDialogDescription>
              El ítem {deleting?.codigo} ({deleting?.tipo}) pasará al estado "Baja". El registro se conservará en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleting)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Dar de baja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}