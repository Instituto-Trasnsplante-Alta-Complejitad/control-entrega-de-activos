import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Download,
  Info,
  Search,
  ShieldAlert,
} from "lucide-react";
import writeXlsxFile from "write-excel-file/browser";

import { base44 } from "@/api/base44Client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const categoryLabels = {
  ocs: "OCS",
  hardware: "Hardware",
  data: "Calidad de datos",
  stock: "Stock",
  delivery: "Contratos",
};

const severityMeta = {
  critical: {
    label: "Críticas",
    helper: "Requieren atención prioritaria",
    icon: ShieldAlert,
    section: "border-red-200 bg-red-50/60",
    iconClass: "text-red-600",
    countClass: "bg-red-100 text-red-700",
    rowAccent: "border-l-red-500",
  },
  warning: {
    label: "A revisar",
    helper: "Conviene resolverlas próximamente",
    icon: AlertTriangle,
    section: "border-amber-200 bg-amber-50/50",
    iconClass: "text-amber-600",
    countClass: "bg-amber-100 text-amber-700",
    rowAccent: "border-l-amber-500",
  },
  info: {
    label: "Informativas",
    helper: "Datos para completar o controlar",
    icon: Info,
    section: "border-blue-200 bg-blue-50/40",
    iconClass: "text-blue-600",
    countClass: "bg-blue-100 text-blue-700",
    rowAccent: "border-l-blue-500",
  },
};

const severityOrder = ["critical", "warning", "info"];

function AlertRow({ alert, rowAccent }) {
  const content = (
    <div className={`group flex items-start gap-3 rounded-lg border border-border border-l-4 bg-background px-4 py-3 transition-colors hover:bg-muted/40 ${rowAccent}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium leading-5 text-foreground">{alert.title}</p>
          <Badge variant="outline" className="h-5 bg-background px-1.5 text-[10px] font-normal">
            {categoryLabels[alert.category] || alert.category}
          </Badge>
        </div>
        <div className="mt-1 flex flex-col gap-0.5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-2">
          {alert.assetNumber && (
            <span className="shrink-0 font-mono text-xs text-foreground">{alert.assetNumber}</span>
          )}
          {alert.assetNumber && alert.description && <span className="hidden sm:inline">·</span>}
          {alert.description && <span className="line-clamp-2">{alert.description}</span>}
        </div>
      </div>
      {alert.href && (
        <span className="mt-0.5 flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
          <span className="hidden sm:inline">Ver equipo</span>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      )}
    </div>
  );

  return alert.href ? (
    <Link to={alert.href} className="block">{content}</Link>
  ) : content;
}

export default function Alerts() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const alertsQuery = useQuery({
    queryKey: ["inventory-alerts"],
    queryFn: async () => (await base44.functions.invoke("inventoryAlerts")).data,
  });

  const alerts = alertsQuery.data?.alerts?.items || [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return alerts.filter((alert) => {
      if (category !== "all" && alert.category !== category) return false;
      if (!term) return true;
      return [alert.title, alert.description, alert.assetNumber]
        .some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [alerts, category, search]);

  const groupedAlerts = useMemo(() => Object.fromEntries(
    severityOrder.map((severity) => [severity, filtered.filter((alert) => alert.severity === severity)]),
  ), [filtered]);

  const exportAlerts = async () => {
    const textColumn = (header, value, width) => ({
      header: { value: header, fontWeight: "bold" },
      cell: (row) => ({ value: String(value(row) ?? ""), type: String }),
      width,
    });
    const columns = [
      textColumn("Severidad", (row) => severityMeta[row.severity]?.label || row.severity, 14),
      textColumn("Categoría", (row) => categoryLabels[row.category] || row.category, 20),
      textColumn("Alerta", (row) => row.title, 42),
      textColumn("Activo", (row) => row.assetNumber, 18),
      textColumn("Detalle", (row) => row.description, 60),
    ];
    await writeXlsxFile(filtered, { columns })
      .toFile(`alertas_inventario_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (alertsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-5 p-6 md:p-8">
        <Skeleton className="h-16 w-64" />
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const counts = alertsQuery.data?.alerts?.counts || { total: 0, critical: 0, warning: 0, info: 0 };
  const filteredCounts = Object.fromEntries(
    severityOrder.map((severity) => [severity, groupedAlerts[severity].length]),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-5 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BellRing className="h-6 w-6 text-amber-500" /> Alertas del inventario
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length === counts.total
              ? `${counts.total} observaciones ordenadas por prioridad.`
              : `${filtered.length} de ${counts.total} observaciones coinciden con la vista.`}
          </p>
        </div>
        <Button variant="outline" className="self-start gap-2" onClick={exportAlerts} disabled={filtered.length === 0}>
          <Download className="h-4 w-4" /> Exportar vista
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-3 divide-x">
            {severityOrder.map((severity) => {
              const meta = severityMeta[severity];
              const Icon = meta.icon;
              return (
                <div key={severity} className="flex items-center gap-2 px-3 py-3 sm:px-5">
                  <Icon className={`hidden h-5 w-5 sm:block ${meta.iconClass}`} />
                  <div>
                    <p className="text-xl font-bold leading-none">{filteredCounts[severity] || 0}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{meta.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Buscar activo, alerta o detalle..."
                aria-label="Buscar alertas"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full md:w-52" aria-label="Filtrar alertas por categoría">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {alertsQuery.isError ? (
        <Card className="border-red-200">
          <CardContent className="py-10 text-center text-red-700">
            {alertsQuery.error?.message || "No se pudieron cargar las alertas."}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-3 h-11 w-11 text-green-500" />
            No hay alertas que coincidan con los filtros.
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={["critical", "warning"]} className="space-y-3">
          {severityOrder.map((severity) => {
            const items = groupedAlerts[severity];
            if (items.length === 0) return null;
            const meta = severityMeta[severity];
            const Icon = meta.icon;
            return (
              <AccordionItem key={severity} value={severity} className={`rounded-xl border px-0 ${meta.section}`}>
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <Icon className={`h-5 w-5 shrink-0 ${meta.iconClass}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{meta.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${meta.countClass}`}>{items.length}</span>
                      </div>
                      <p className="mt-0.5 text-xs font-normal text-muted-foreground">{meta.helper}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-2">
                  <div className="space-y-2">
                    {items.map((alert) => (
                      <AlertRow key={alert.id} alert={alert} rowAccent={meta.rowAccent} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
