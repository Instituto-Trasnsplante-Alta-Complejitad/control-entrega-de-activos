import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Loader2, Search } from "lucide-react";

import { base44 } from "@/api/base44Client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const statusMeta = {
  pendiente: { label: "Pendiente", className: "border-amber-200 bg-amber-50 text-amber-700" },
  firmado: { label: "Firmado", className: "border-green-200 bg-green-50 text-green-700" },
  aceptado: { label: "Aceptado en línea", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  rechazado: { label: "Rechazado", className: "border-red-200 bg-red-50 text-red-700" },
  devuelto: { label: "Devuelto", className: "border-slate-200 bg-slate-100 text-slate-700" },
};

const statusOrder = ["pendiente", "firmado", "aceptado", "rechazado", "devuelto"];
const administrableStatusOrder = ["pendiente", "firmado", "rechazado", "devuelto"];
const normalizedStatus = (delivery) => delivery.status || "pendiente";

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR").format(parsed);
}

function StatusBadge({ status }) {
  const meta = statusMeta[status] || { label: status || "Sin estado", className: "" };
  return <Badge variant="outline" className={meta.className}>{meta.label}</Badge>;
}

function confirmationCopy(status, count) {
  const plural = count === 1 ? "contrato" : "contratos";
  if (status === "firmado") {
    return {
      title: `Marcar ${count} ${plural} como ${count === 1 ? "firmado" : "firmados"}`,
      description: "Se registrará una firma manual o histórica sin modificar la fecha de aceptación digital. Esta acción quedará identificada en la auditoría.",
    };
  }
  const label = statusMeta[status]?.label || status;
  return {
    title: `Cambiar ${count} ${plural} a ${label}`,
    description: "El cambio afecta únicamente al contrato y quedará registrado en la auditoría; no modifica el estado del equipo.",
  };
}

export default function Contracts() {
  const queryClient = useQueryClient();
  const { isAdmin } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [pendingChange, setPendingChange] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const deliveriesQuery = useQuery({
    queryKey: ["deliveries"],
    queryFn: () => base44.entities.Delivery.list("-created_date", 500),
  });
  const deliveries = deliveriesQuery.data || [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return deliveries.filter((item) => {
      if (statusFilter !== "all" && normalizedStatus(item) !== statusFilter) return false;
      if (!term) return true;
      return [item.recipient_name, item.recipient_email, item.equipment_asset, item.equipment_model]
        .some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [deliveries, search, statusFilter]);

  const counts = useMemo(() => deliveries.reduce((result, delivery) => {
    const status = normalizedStatus(delivery);
    result[status] = (result[status] || 0) + 1;
    return result;
  }, {}), [deliveries]);

  const selectableVisibleIds = filtered
    .filter((delivery) => normalizedStatus(delivery) === "pendiente")
    .map((delivery) => delivery.id);
  const selectedVisibleCount = selectableVisibleIds.filter((id) => selectedIds.has(id)).length;
  const allVisibleSelected = selectableVisibleIds.length > 0 && selectedVisibleCount === selectableVisibleIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  const updateStatusMutation = useMutation({
    mutationFn: ({ ids, status }) => base44.functions.invoke("updateDeliveryStatus", { ids, status }),
    onSuccess: ({ data }) => {
      setSelectedIds(new Set());
      setPendingChange(null);
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-alerts"] });
      toast({
        title: data.updated === 1 ? "Contrato actualizado" : `${data.updated} contratos actualizados`,
        description: data.omitted > 0 ? `${data.omitted} no requirieron cambios o ya no estaban disponibles.` : "El estado se guardó correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "No se pudo cambiar el estado",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleVisiblePending = (checked) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      selectableVisibleIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const toggleOne = (id, checked) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const requestStatusChange = (ids, status) => {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return;
    setPendingChange({ ids: uniqueIds, status, ...confirmationCopy(status, uniqueIds.length) });
  };

  const changeSearch = (value) => {
    setSearch(value);
    setSelectedIds(new Set());
  };

  const changeStatusFilter = (value) => {
    setStatusFilter(value);
    setSelectedIds(new Set());
  };

  const handleOpen = async (deliveryId) => {
    try {
      setDownloading(deliveryId);
      const response = await base44.functions.invoke("generateContractPdf", { deliveryId, format: "pdf" });
      if (response.data) {
        const html = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
        const win = window.open("", "_blank");
        if (!win) throw new Error("El navegador bloqueó la nueva ventana");
        win.document.open();
        win.document.write(html);
        win.document.close();
      }
    } catch (error) {
      toast({ title: "No se pudo abrir el contrato", description: error.message, variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  if (deliveriesQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl p-6 md:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-xl font-semibold text-red-900">No se pudieron cargar los contratos</h1>
          <p className="mt-2 text-sm text-red-700">{deliveriesQuery.error?.message || "Ocurrió un error al consultar las entregas."}</p>
          <Button className="mt-5" variant="outline" onClick={() => deliveriesQuery.refetch()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-5 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contratos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Seguimiento de firma de las entregas de equipos.</p>
        </div>
        {isAdmin && selectedIds.size > 0 && (
          <Button className="gap-2 self-start" onClick={() => requestStatusChange([...selectedIds], "firmado")}>
            <CheckCircle2 className="h-4 w-4" />
            Marcar {selectedIds.size} como {selectedIds.size === 1 ? "firmado" : "firmados"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {statusOrder.map((status) => (
          <button
            key={status}
            type="button"
            className="text-left"
            aria-pressed={statusFilter === status}
            onClick={() => changeStatusFilter(statusFilter === status ? "all" : status)}
          >
            <div className={`rounded-xl border bg-card px-4 py-3 transition hover:bg-muted/30 ${statusFilter === status ? "ring-2 ring-primary" : ""}`}>
              <p className="text-xl font-bold">{counts[status] || 0}</p>
              <p className="text-xs text-muted-foreground">{statusMeta[status].label}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por persona, correo, activo o modelo..."
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
            className="pl-9"
            aria-label="Buscar contratos"
          />
        </div>
        <Select value={statusFilter} onValueChange={changeStatusFilter}>
          <SelectTrigger className="w-full md:w-48" aria-label="Filtrar contratos por estado">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {statusOrder.map((status) => (
              <SelectItem key={status} value={status}>{statusMeta[status].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isAdmin && selectableVisibleIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-visible-pending"
              checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
              onCheckedChange={(checked) => toggleVisiblePending(checked === true)}
            />
            <label htmlFor="select-visible-pending" className="cursor-pointer font-medium text-amber-900">
              Seleccionar los {selectableVisibleIds.length} pendientes visibles
            </label>
          </div>
          <span className="text-xs text-amber-700">La selección nunca incluye contratos ya firmados.</span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {isAdmin && <TableHead className="w-12"><span className="sr-only">Seleccionar</span></TableHead>}
              <TableHead className="font-semibold">Empleado</TableHead>
              <TableHead className="hidden font-semibold md:table-cell">Equipo</TableHead>
              <TableHead className="hidden font-semibold lg:table-cell">Fecha de entrega</TableHead>
              <TableHead className="font-semibold">Estado</TableHead>
              <TableHead className="text-right font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((delivery) => {
              const currentStatus = normalizedStatus(delivery);
              const canSelect = isAdmin && currentStatus === "pendiente";
              return (
                <TableRow key={delivery.id} className="transition-colors hover:bg-muted/30">
                  {isAdmin && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(delivery.id)}
                        disabled={!canSelect}
                        onCheckedChange={(checked) => toggleOne(delivery.id, checked === true)}
                        aria-label={`Seleccionar contrato de ${delivery.recipient_name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <p className="font-medium">{delivery.recipient_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{delivery.equipment_asset || delivery.recipient_email}</p>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {[delivery.equipment_brand, delivery.equipment_model].filter(Boolean).join(" ") || "—"}
                  </TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">{formatDate(delivery.delivery_date)}</TableCell>
                  <TableCell>
                    {isAdmin && currentStatus !== "aceptado" ? (
                      <Select
                        value={currentStatus}
                        onValueChange={(status) => requestStatusChange([delivery.id], status)}
                        disabled={updateStatusMutation.isPending}
                      >
                        <SelectTrigger className="h-8 w-32 border-0 bg-transparent px-0 shadow-none focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {administrableStatusOrder.map((status) => (
                            <SelectItem key={status} value={status}>{statusMeta[status].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : <StatusBadge status={currentStatus} />}
                    {currentStatus === "aceptado" && delivery.acceptance_date && (
                      <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(delivery.acceptance_date)}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => handleOpen(delivery.id)}
                      disabled={Boolean(downloading)}
                    >
                      {downloading === delivery.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <FileText className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">Ver contrato</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-muted-foreground">
                  {deliveriesQuery.isLoading ? "Cargando contratos..." : "No hay contratos que coincidan con los filtros."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={Boolean(pendingChange)} onOpenChange={(open) => !open && !updateStatusMutation.isPending && setPendingChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingChange?.title}</AlertDialogTitle>
            <AlertDialogDescription>{pendingChange?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatusMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateStatusMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (pendingChange) updateStatusMutation.mutate({ ids: pendingChange.ids, status: pendingChange.status });
              }}
            >
              {updateStatusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar cambio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
