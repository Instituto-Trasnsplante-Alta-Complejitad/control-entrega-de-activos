import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Monitor, PackageCheck, Clock, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import StatCard from "@/components/dashboard/StatCard";

export default function Dashboard() {
  const { data: equipment = [] } = useQuery({
    queryKey: ["equipment"],
    queryFn: () => base44.entities.Equipment.list("-created_date", 200),
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["deliveries"],
    queryFn: () => base44.entities.Delivery.list("-created_date", 200),
  });

  const stats = {
    total: equipment.length,
    available: equipment.filter((e) => e.status === "disponible").length,
    assigned: equipment.filter((e) => e.status === "asignado").length,
    contracts: deliveries.length,
  };

  const recentDeliveries = deliveries.slice(0, 8);

  const statusBadge = {
    pendiente: "bg-amber-100 text-amber-700 border-amber-200",
    aceptado: "bg-green-100 text-green-700 border-green-200",
    rechazado: "bg-red-100 text-red-700 border-red-200",
    devuelto: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Resumen general del equipamiento</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Equipos" value={stats.total} icon={Monitor} color="bg-primary" />
        <StatCard title="Disponibles" value={stats.available} icon={PackageCheck} color="bg-green-500" />
        <StatCard title="Asignados" value={stats.assigned} icon={Clock} color="bg-blue-500" />
        <StatCard title="Contratos" value={stats.contracts} icon={FileText} color="bg-amber-500" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Últimas Entregas</CardTitle>
        </CardHeader>
        <CardContent>
          {recentDeliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No hay entregas registradas aún</p>
          ) : (
            <div className="space-y-3">
              {recentDeliveries.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{d.recipient_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.equipment_brand} {d.equipment_model} · {d.equipment_asset}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {d.delivery_date ? format(new Date(d.delivery_date), "d MMM yyyy", { locale: es }) : "—"}
                    </span>
                    <Badge variant="outline" className={statusBadge[d.status] || ""}>
                      {d.status?.charAt(0).toUpperCase() + d.status?.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}