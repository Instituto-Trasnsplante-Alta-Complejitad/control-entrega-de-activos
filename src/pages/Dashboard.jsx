import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  Cpu,
  Database,
  HardDrive,
  Loader2,
  Monitor,
  PackageCheck,
  RefreshCw,
  ServerCrash,
  ShieldAlert,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { base44 } from "@/api/base44Client";
import StatCard from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const statusLabels = {
  disponible: "Disponibles",
  asignado: "Asignados",
  en_reparacion: "En reparación",
  baja: "Dados de baja",
  sin_estado: "Sin estado",
};

const statusColors = {
  disponible: "#22c55e",
  asignado: "#3b82f6",
  en_reparacion: "#f59e0b",
  baja: "#ef4444",
  sin_estado: "#94a3b8",
};

const severityStyles = {
  critical: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

const contractStatusLabels = {
  pendiente: "Pendiente",
  firmado: "Firmado",
  aceptado: "Aceptado en línea",
  rechazado: "Rechazado",
  devuelto: "Devuelto",
};

function formatDate(value) {
  if (!value) return "Sin registro";
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return "Sin registro";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function LoadingDashboard() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <Skeleton className="h-16 w-72" />
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-28" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { isAdmin } = useCurrentUser();
  const dashboardQuery = useQuery({
    queryKey: ["inventory-dashboard"],
    queryFn: async () => (await base44.functions.invoke("dashboard")).data,
    refetchInterval: (query) => query.state.data?.ocsSyncRunning ? 3_000 : false,
  });

  const syncMutation = useMutation({
    mutationFn: () => base44.functions.invoke("syncOcs"),
    onSuccess: () => {
      toast({ title: "Sincronización OCS iniciada", description: "El dashboard se actualizará al finalizar." });
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    },
    onError: (error) => {
      const alreadyRunning = error?.status === 409;
      toast({
        title: alreadyRunning ? "OCS ya se está sincronizando" : "No se pudo iniciar OCS",
        description: alreadyRunning ? "Esperá a que termine el proceso actual." : error.message,
        variant: alreadyRunning ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    },
  });

  if (dashboardQuery.isLoading) return <LoadingDashboard />;

  if (dashboardQuery.isError) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Card className="border-red-200">
          <CardContent className="py-12 text-center space-y-4">
            <ServerCrash className="w-12 h-12 mx-auto text-red-500" />
            <div>
              <h1 className="text-xl font-semibold">No se pudo cargar el dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">{dashboardQuery.error?.message}</p>
            </div>
            <Button onClick={() => dashboardQuery.refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = dashboardQuery.data;
  const byStatus = data.equipment?.byStatus || {};
  const linkedOcs = (data.ocs?.current || 0) + (data.ocs?.warning || 0) + (data.ocs?.critical || 0);
  const ocsCoverage = data.equipment?.active > 0 ? Math.round((linkedOcs / data.equipment.active) * 100) : 0;
  const ocsAlerts = (data.ocs?.warning || 0) + (data.ocs?.critical || 0);
  const chartData = Object.entries(byStatus).map(([name, value]) => ({
    name: statusLabels[name] || name,
    key: name,
    value,
  })).filter((item) => item.value > 0);
  const topAlerts = (data.alerts?.items || [])
    .filter((alert) => alert.severity === "critical" || alert.severity === "warning")
    .slice(0, 6);
  const priorityAlertCount = (data.alerts?.counts?.critical || 0) + (data.alerts?.counts?.warning || 0);
  const recentDeliveries = data.deliveries?.recent || [];
  const syncRunning = data.ocsSyncRunning;

  const stats = [
    { title: "Total equipos", value: data.equipment?.total || 0, icon: Monitor, color: "bg-blue-500" },
    { title: "Disponibles", value: byStatus.disponible || 0, icon: PackageCheck, color: "bg-green-500" },
    { title: "Asignados", value: byStatus.asignado || 0, icon: CheckCircle2, color: "bg-sky-500" },
    { title: "Alertas OCS", value: ocsAlerts, icon: Database, color: "bg-amber-500" },
    { title: "Hardware a revisar", value: data.equipment?.hardwareAtRisk || 0, icon: Cpu, color: "bg-orange-500" },
    { title: "Stock bajo", value: data.stock?.low || 0, icon: HardDrive, color: "bg-red-500" },
  ];

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard de activos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Estado del inventario, OCS y situaciones que requieren atención.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={syncRunning ? "border-blue-300 bg-blue-50 text-blue-700" : ""}>
            {syncRunning ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Clock3 className="w-3.5 h-3.5 mr-1" />}
            {syncRunning ? "Sincronizando OCS" : `Actualizado ${formatDate(data.generatedAt)}`}
          </Badge>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={syncRunning || syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
            >
              <RefreshCw className={`w-4 h-4 ${syncRunning || syncMutation.isPending ? "animate-spin" : ""}`} />
              Sincronizar OCS
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => <StatCard key={stat.title} {...stat} />)}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Estado de los equipos</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {chartData.length > 0 ? (
              <div className="grid grid-cols-[minmax(0,1fr)_150px] h-full items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                      {chartData.map((entry) => <Cell key={entry.key} fill={statusColors[entry.key] || "#94a3b8"} />)}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {chartData.map((entry) => (
                    <div key={entry.key} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: statusColors[entry.key] || "#94a3b8" }} />
                        {entry.name}
                      </span>
                      <strong>{entry.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="h-full grid place-items-center text-sm text-muted-foreground">Sin equipos cargados</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Cobertura OCS</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Alerta luego de 24 h sin reporte; crítica luego de 7 días.</p>
            </div>
            <Badge variant="outline">{ocsCoverage}% vinculado</Badge>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            <Progress value={ocsCoverage} className="h-3" />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-xs text-green-700">Al día</p>
                <p className="text-2xl font-bold text-green-800">{data.ocs?.current || 0}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-700">Más de 24 h</p>
                <p className="text-2xl font-bold text-amber-800">{data.ocs?.warning || 0}</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs text-red-700">Más de 7 días</p>
                <p className="text-2xl font-bold text-red-800">{data.ocs?.critical || 0}</p>
              </div>
              <div className="rounded-lg border bg-slate-50 p-3">
                <p className="text-xs text-slate-600">Sin vincular</p>
                <p className="text-2xl font-bold text-slate-800">{data.ocs?.unlinked || 0}</p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium">Última sincronización</p>
              <p className="text-muted-foreground mt-1">
                {data.lastSync ? `${formatDate(data.lastSync.finished_at || data.lastSync.started_at)} · ${data.lastSync.status}` : "Todavía no se ejecutó"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2"><BellRing className="w-5 h-5 text-amber-500" /> Alertas prioritarias</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{priorityAlertCount} requieren atención</p>
            </div>
            <Button asChild variant="outline" size="sm"><Link to="/alertas">Ver todas</Link></Button>
          </CardHeader>
          <CardContent>
            {topAlerts.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
                No hay alertas prioritarias.
              </div>
            ) : (
              <div className="space-y-2">
                {topAlerts.map((alert) => {
                  const content = (
                    <div className={`rounded-lg border p-3 flex gap-3 ${severityStyles[alert.severity]}`}>
                      {alert.severity === "critical" ? <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <p className="text-xs opacity-80 truncate">{alert.assetNumber || alert.description}</p>
                      </div>
                    </div>
                  );
                  return alert.href ? <Link key={alert.id} to={alert.href} className="block hover:opacity-90">{content}</Link> : <div key={alert.id}>{content}</div>;
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Últimas entregas</CardTitle>
          </CardHeader>
          <CardContent>
            {recentDeliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">No hay entregas registradas.</p>
            ) : (
              <div className="space-y-1">
                {recentDeliveries.slice(0, 6).map((delivery) => (
                  <div key={delivery.id} className="py-3 border-b last:border-0 flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{delivery.recipient_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{delivery.equipment_asset || "Sin activo"} · {delivery.department || "Sin sector"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {contractStatusLabels[delivery.status] || delivery.status || "Pendiente"}
                      </Badge>
                      <p className="text-[11px] text-muted-foreground mt-1">{formatDate(delivery.delivery_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
