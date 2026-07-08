import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Monitor, PackageCheck, Clock, FileText, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import StatCard from "@/components/dashboard/StatCard";

const typeMap = {
  notebook: "Notebook", all_in_one: "All in One", tablet: "Tablet", celular: "Celular", cpu: "CPU", otro: "Otro",
};

const statusMap = {
  disponible: { label: "Disponible", className: "bg-green-100 text-green-700 border-green-200" },
  asignado: { label: "Asignado", className: "bg-blue-100 text-blue-700 border-blue-200" },
  baja: { label: "Baja", className: "bg-red-100 text-red-700 border-red-200" },
  en_reparacion: { label: "En reparación", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
};

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState(null); // null | "total" | "disponible" | "asignado"

  const { data: equipment = [] } = useQuery({
    queryKey: ["equipment"],
    queryFn: () => base44.entities.Equipment.list("-created_date", 500),
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

  const handleStatClick = (filter) => {
    setActiveFilter(activeFilter === filter ? null : filter);
  };

  const filteredEquipment = activeFilter === "total" ? equipment
    : activeFilter === "disponible" ? equipment.filter((e) => e.status === "disponible")
    : activeFilter === "asignado" ? equipment.filter((e) => e.status === "asignado")
    : [];

  const filterTitles = {
    total: "Todos los Equipos",
    disponible: "Equipos Disponibles",
    asignado: "Equipos Asignados",
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Resumen general del equipamiento</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`cursor-pointer rounded-xl transition-all ${activeFilter === "total" ? "ring-2 ring-primary" : "hover:opacity-90"}`} onClick={() => handleStatClick("total")}>
          <StatCard title="Total Equipos" value={stats.total} icon={Monitor} color="bg-primary" />
        </div>
        <div className={`cursor-pointer rounded-xl transition-all ${activeFilter === "disponible" ? "ring-2 ring-green-500" : "hover:opacity-90"}`} onClick={() => handleStatClick("disponible")}>
          <StatCard title="Disponibles" value={stats.available} icon={PackageCheck} color="bg-green-500" />
        </div>
        <div className={`cursor-pointer rounded-xl transition-all ${activeFilter === "asignado" ? "ring-2 ring-blue-500" : "hover:opacity-90"}`} onClick={() => handleStatClick("asignado")}>
          <StatCard title="Asignados" value={stats.assigned} icon={Clock} color="bg-blue-500" />
        </div>
        <StatCard title="Contratos" value={stats.contracts} icon={FileText} color="bg-amber-500" />
      </div>

      {activeFilter && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{filterTitles[activeFilter]}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setActiveFilter(null)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 font-medium">N° Activo</th>
                    <th className="pb-2 font-medium">Tipo</th>
                    <th className="pb-2 font-medium">Marca / Modelo</th>
                    <th className="pb-2 font-medium hidden sm:table-cell">Asignado a</th>
                    <th className="pb-2 font-medium hidden md:table-cell">Sector</th>
                    <th className="pb-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEquipment.map((item) => {
                    const st = statusMap[item.status] || statusMap.disponible;
                    return (
                      <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="py-2.5 font-mono text-xs">{item.asset_number}</td>
                        <td className="py-2.5">{typeMap[item.type] || item.type}</td>
                        <td className="py-2.5">{item.brand} {item.model}</td>
                        <td className="py-2.5 hidden sm:table-cell">{item.assigned_to || "—"}</td>
                        <td className="py-2.5 hidden md:table-cell">{item.department || "—"}</td>
                        <td className="py-2.5">
                          <Badge variant="outline" className={st.className}>{st.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEquipment.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Sin equipos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!activeFilter && (
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
      )}
    </div>
  );
}