import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, BellRing, CheckCircle2, Download, Info, Search, ShieldAlert } from "lucide-react";
import writeXlsxFile from "write-excel-file/browser";

import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const severityLabels = { critical: "Crítica", warning: "Atención", info: "Información" };
const categoryLabels = {
  ocs: "OCS",
  hardware: "Hardware",
  data: "Calidad de datos",
  stock: "Stock",
  delivery: "Entregas",
};

const severityStyles = {
  critical: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

const severityIcons = {
  critical: ShieldAlert,
  warning: AlertTriangle,
  info: Info,
};

export default function Alerts() {
  const [severity, setSeverity] = useState("all");
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
      if (severity !== "all" && alert.severity !== severity) return false;
      if (category !== "all" && alert.category !== category) return false;
      if (!term) return true;
      return [alert.title, alert.description, alert.assetNumber]
        .some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [alerts, severity, category, search]);

  const exportAlerts = async () => {
    const textColumn = (header, value, width) => ({
      header: { value: header, fontWeight: "bold" },
      cell: (row) => ({ value: String(value(row) ?? ""), type: String }),
      width,
    });
    const columns = [
      textColumn("Severidad", (row) => severityLabels[row.severity] || row.severity, 14),
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
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-5">
        <Skeleton className="w-64 h-16" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const counts = alertsQuery.data?.alerts?.counts || { total: 0, critical: 0, warning: 0, info: 0 };
  const countCards = [
    { key: "all", label: "Total", value: counts.total, className: "border-slate-200", icon: BellRing },
    { key: "critical", label: "Críticas", value: counts.critical, className: "border-red-200 bg-red-50", icon: ShieldAlert },
    { key: "warning", label: "Atención", value: counts.warning, className: "border-amber-200 bg-amber-50", icon: AlertTriangle },
    { key: "info", label: "Informativas", value: counts.info, className: "border-blue-200 bg-blue-50", icon: Info },
  ];

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BellRing className="w-6 h-6 text-amber-500" /> Alertas del inventario</h1>
          <p className="text-sm text-muted-foreground mt-1">
            OCS, antigüedad, hardware, datos incompletos, stock y entregas pendientes.
          </p>
        </div>
        <Button variant="outline" className="gap-2 self-start" onClick={exportAlerts} disabled={filtered.length === 0}>
          <Download className="w-4 h-4" /> Exportar Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {countCards.map((item) => (
          <button key={item.key} onClick={() => setSeverity(item.key)} className="text-left">
            <Card className={`${item.className} transition ${severity === item.key ? "ring-2 ring-primary" : "hover:shadow-sm"}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-2xl font-bold mt-1">{item.value}</p></div>
                <item.icon className="w-6 h-6 text-muted-foreground" />
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Buscar activo, alerta o detalle..." />
            </div>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Severidad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las severidades</SelectItem>
                <SelectItem value="critical">Críticas</SelectItem>
                <SelectItem value="warning">Atención</SelectItem>
                <SelectItem value="info">Informativas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {alertsQuery.isError ? (
          <Card className="border-red-200"><CardContent className="py-10 text-center text-red-700">{alertsQuery.error?.message || "No se pudieron cargar las alertas."}</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-14 text-center text-muted-foreground"><CheckCircle2 className="w-11 h-11 mx-auto mb-3 text-green-500" />No hay alertas que coincidan con los filtros.</CardContent></Card>
        ) : filtered.map((alert) => {
          const Icon = severityIcons[alert.severity] || Info;
          const body = (
            <Card className={`transition hover:shadow-sm ${severityStyles[alert.severity] || ""}`}>
              <CardContent className="p-4 flex items-start gap-4">
                <Icon className="w-6 h-6 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{alert.title}</h2>
                    <Badge variant="outline" className="bg-white/60">{categoryLabels[alert.category] || alert.category}</Badge>
                    <Badge variant="outline" className="bg-white/60">{severityLabels[alert.severity] || alert.severity}</Badge>
                  </div>
                  {alert.assetNumber && <p className="font-mono text-xs mt-2">Activo: {alert.assetNumber}</p>}
                  {alert.description && <p className="text-sm opacity-80 mt-1">{alert.description}</p>}
                </div>
                {alert.href && <span className="text-xs font-medium shrink-0">Ver equipo →</span>}
              </CardContent>
            </Card>
          );
          return alert.href ? <Link key={alert.id} to={alert.href} className="block">{body}</Link> : <div key={alert.id}>{body}</div>;
        })}
      </div>
    </div>
  );
}
