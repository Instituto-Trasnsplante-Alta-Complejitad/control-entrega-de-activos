import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, Cpu, Download, FileBarChart, Info } from "lucide-react";
import writeXlsxFile from "write-excel-file/browser";

import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatDate(value) {
  if (!value) return "Sin fecha";
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function textColumn(header, value, width = 18) {
  return {
    header: { value: header, fontWeight: "bold" },
    cell: (row) => ({ value: String(value(row) ?? ""), type: String }),
    width,
  };
}

function numberColumn(header, value, width = 12) {
  return {
    header: { value: header, fontWeight: "bold" },
    cell: (row) => ({ value: Number(value(row) || 0), type: Number }),
    width,
  };
}

const commonColumns = [
  textColumn("Activo", (row) => row.assetNumber, 16),
  textColumn("Tipo", (row) => row.type, 14),
  textColumn("Marca", (row) => row.brand),
  textColumn("Modelo", (row) => row.model, 24),
  textColumn("Serie", (row) => row.serialNumber, 22),
  textColumn("Asignado a", (row) => row.assignedTo, 24),
  textColumn("Usuario OCS", (row) => row.username, 20),
  textColumn("Sector", (row) => row.department, 22),
];

function EmptyReport({ children }) {
  return <div className="py-14 text-center text-sm text-muted-foreground">{children}</div>;
}

export default function Reports() {
  const reportsQuery = useQuery({
    queryKey: ["inventory-reports"],
    queryFn: async () => (await base44.functions.invoke("inventoryReports")).data,
  });

  if (reportsQuery.isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-5">
        <Skeleton className="h-16 w-72" />
        <div className="grid md:grid-cols-2 gap-4"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (reportsQuery.isError) {
    return <div className="p-8 text-center text-red-700">{reportsQuery.error?.message || "No se pudieron generar los reportes."}</div>;
  }

  const data = reportsQuery.data;
  const ocsRows = [...data.ocsOver30Days, ...data.missingOcsDate];
  const renewalRows = data.renewalCandidates;

  const exportOcs = async () => {
    const columns = [
      ...commonColumns,
      textColumn("Último reporte OCS", (row) => row.ocsLastDate || "Sin fecha", 22),
      textColumn("Días sin reportar", (row) => row.daysWithoutReport === null ? "Sin fecha" : row.daysWithoutReport, 18),
    ];
    await writeXlsxFile(ocsRows, { columns })
      .toFile(`equipos_sin_reporte_ocs_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportRenewal = async () => {
    const columns = [
      ...commonColumns,
      textColumn("Procesador", (row) => row.processor, 36),
      textColumn("RAM", (row) => row.ram, 14),
      textColumn("Disco", (row) => [row.storageCapacity, row.storageType].filter(Boolean).join(" · "), 20),
      textColumn("Sistema operativo", (row) => row.operatingSystem, 28),
      numberColumn("Puntaje", (row) => row.riskScore),
      textColumn("Motivos", (row) => row.reasons.join("; "), 60),
    ];
    await writeXlsxFile(renewalRows, { columns })
      .toFile(`candidatos_renovacion_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileBarChart className="w-6 h-6 text-primary" /> Reportes técnicos</h1>
        <p className="text-sm text-muted-foreground mt-1">Listados listos para revisar, compartir o exportar a Excel.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Más de {data.criteria.ocsReportDays} días sin reportar</p>
              <p className="text-3xl font-bold text-red-900 mt-1">{data.counts.ocsOver30Days}</p>
              {data.counts.missingOcsDate > 0 && <p className="text-xs text-red-700 mt-1">+ {data.counts.missingOcsDate} vinculados sin fecha OCS</p>}
            </div>
            <CalendarClock className="w-9 h-9 text-red-600" />
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700">Candidatos a renovación</p>
              <p className="text-3xl font-bold text-amber-900 mt-1">{data.counts.renewalCandidates}</p>
              <p className="text-xs text-amber-700 mt-1">Según RAM, disco, SO y procesador</p>
            </div>
            <Cpu className="w-9 h-9 text-amber-600" />
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <Info className="w-5 h-5 shrink-0" />
        <p>{data.criteria.note} El reporte indica los motivos utilizados para que cada decisión pueda revisarse.</p>
      </div>

      <Tabs defaultValue="ocs" className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="ocs">Sin reporte OCS ({ocsRows.length})</TabsTrigger>
          <TabsTrigger value="renewal">Candidatos a renovación ({renewalRows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="ocs">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Equipos sin informar a OCS</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Equipos activos que superaron el umbral o están vinculados sin una fecha OCS válida.</p>
              </div>
              <Button variant="outline" className="gap-2" disabled={ocsRows.length === 0} onClick={exportOcs}>
                <Download className="w-4 h-4" /> Excel
              </Button>
            </CardHeader>
            <CardContent>
              {ocsRows.length === 0 ? <EmptyReport>No hay equipos en este reporte.</EmptyReport> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Activo</th><th className="pb-2 pr-4">Equipo</th><th className="pb-2 pr-4">Asignado / sector</th><th className="pb-2 pr-4">Último reporte</th><th className="pb-2 text-right">Días</th>
                    </tr></thead>
                    <tbody>{ocsRows.map((row) => (
                      <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-3 pr-4"><Link to={row.href} className="font-mono font-medium text-primary hover:underline">{row.assetNumber || "Sin activo"}</Link></td>
                        <td className="py-3 pr-4">{row.brand} {row.model}<p className="text-xs text-muted-foreground">{row.serialNumber || "Sin serie"}</p></td>
                        <td className="py-3 pr-4">{row.assignedTo || row.username || "Sin asignar"}<p className="text-xs text-muted-foreground">{row.department || "Sin sector"}</p></td>
                        <td className="py-3 pr-4">{formatDate(row.ocsLastDate)}</td>
                        <td className="py-3 text-right"><Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">{row.daysWithoutReport ?? "Sin fecha"}</Badge></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renewal">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Candidatos a renovación o mejora</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Solo aparecen equipos que alcanzan el puntaje mínimo configurado.</p>
              </div>
              <Button variant="outline" className="gap-2" disabled={renewalRows.length === 0} onClick={exportRenewal}>
                <Download className="w-4 h-4" /> Excel
              </Button>
            </CardHeader>
            <CardContent>
              {renewalRows.length === 0 ? <EmptyReport>No hay candidatos según los criterios actuales.</EmptyReport> : (
                <div className="space-y-3">
                  {renewalRows.map((row) => (
                    <Link key={row.id} to={row.href} className="block">
                      <div className={`rounded-lg border p-4 hover:shadow-sm transition ${row.severity === "critical" ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-semibold text-primary">{row.assetNumber || "Sin activo"}</span>
                              <Badge variant="outline" className={row.severity === "critical" ? "border-red-300 text-red-700" : "border-amber-300 text-amber-700"}>{row.severity === "critical" ? "Prioridad alta" : "Revisar"}</Badge>
                              <span className="text-sm font-medium">{row.brand} {row.model}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">{row.processor || "Procesador sin informar"} · {row.ram || "RAM sin informar"} · {[row.storageCapacity, row.storageType].filter(Boolean).join(" ") || "Disco sin informar"}</p>
                            <div className="flex flex-wrap gap-2 mt-3">{row.reasons.map((reason) => <span key={reason} className="rounded-full bg-white/80 border px-2.5 py-1 text-xs">{reason}</span>)}</div>
                          </div>
                          <div className="text-sm lg:text-right shrink-0">
                            <p className="font-medium">Puntaje {row.riskScore}</p>
                            <p className="text-muted-foreground">{row.assignedTo || row.username || "Sin asignar"}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Generado {formatDate(data.generatedAt)}. Los reportes son una ayuda para priorizar; la decisión final requiere revisión técnica.</p>
    </div>
  );
}
