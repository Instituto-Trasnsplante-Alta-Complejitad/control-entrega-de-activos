import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Cpu, HardDrive, MemoryStick, MonitorCheck } from "lucide-react";

const typeMap = {
  notebook: "Notebook", tablet: "Tablet", celular: "Celular", cpu: "CPU", otro: "Otro",
};

const statusMap = {
  disponible: { label: "Disponible", className: "bg-green-100 text-green-700 border-green-200" },
  asignado: { label: "Asignado", className: "bg-blue-100 text-blue-700 border-blue-200" },
  baja: { label: "Baja", className: "bg-red-100 text-red-700 border-red-200" },
  en_reparacion: { label: "En reparación", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
};

export default function EquipmentDetail() {
  const { id } = useParams();

  const { data: equipment, isLoading } = useQuery({
    queryKey: ["equipment", id],
    queryFn: async () => {
      const results = await base44.entities.Equipment.filter({ id });
      return results[0] || null;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold">Equipo no encontrado</h1>
          <p className="text-sm text-muted-foreground mt-1">El equipo solicitado no existe o fue eliminado.</p>
        </div>
      </div>
    );
  }

  const st = statusMap[equipment.status] || statusMap.disponible;
  const isCpu = equipment.type === "cpu";
  const peripherals = [
    { key: "peripherals_mouse", label: "Mouse", icon: "🖱️" },
    { key: "peripherals_keyboard", label: "Teclado", icon: "⌨️" },
    { key: "peripherals_monitor", label: "Monitor", icon: "🖥️" },
    { key: "peripherals_camera", label: "Cámara", icon: "📷" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <img
            src="https://media.base44.com/images/public/6a0b41b518760c50f55478db/63ccb28ee_WhatsAppImage2026-05-22at103628AM.jpg"
            alt="ITAC Logo"
            className="h-10 mx-auto mb-4"
          />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{equipment.brand} {equipment.model}</CardTitle>
              <Badge variant="outline" className={st.className}>{st.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div><span className="text-muted-foreground">N° Activo:</span> <span className="font-mono font-medium">{equipment.asset_number}</span></div>
              <div><span className="text-muted-foreground">Tipo:</span> <span>{typeMap[equipment.type] || equipment.type}</span></div>
              <div><span className="text-muted-foreground">N° Serie:</span> <span className="font-mono">{equipment.serial_number}</span></div>
              {equipment.assigned_to && <div><span className="text-muted-foreground">Asignado a:</span> <span>{equipment.assigned_to}</span></div>}
              {equipment.department && <div><span className="text-muted-foreground">Sector:</span> <span>{equipment.department}</span></div>}
              {equipment.delivery_date && <div><span className="text-muted-foreground">Fecha Entrega:</span> <span>{equipment.delivery_date}</span></div>}
            </div>
          </CardContent>
        </Card>

        {isCpu && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><MonitorCheck className="w-4 h-4" /> Periféricos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {peripherals.map((p) => (
                    <span key={p.key} className={`text-sm px-3 py-1.5 rounded-lg border ${equipment[p.key] ? "bg-green-50 border-green-200 text-green-700" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                      {p.icon} {p.label}: {equipment[p.key] ? "Incluido" : "No incluido"}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Cpu className="w-4 h-4" /> Hardware</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {equipment.processor_model && (
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Procesador</span>
                    <p className="font-medium">{equipment.processor_model}</p>
                  </div>
                )}
                {(equipment.storage_capacity || equipment.storage_type) && (
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Almacenamiento</span>
                    <p className="font-medium">{equipment.storage_capacity} {equipment.storage_type}</p>
                  </div>
                )}
                {(equipment.ram_amount || equipment.ram_speed) && (
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Memoria RAM</span>
                    <p className="font-medium">
                      {[equipment.ram_amount, equipment.ram_generation, equipment.ram_speed, equipment.ram_format, equipment.ram_slots ? `${equipment.ram_slots} slots` : ""].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {equipment.operating_system && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><HardDrive className="w-4 h-4" /> Sistema Operativo</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{equipment.operating_system}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <p className="text-center text-xs text-muted-foreground pt-4">
          ITAC · Ficha técnica generada automáticamente
        </p>
      </div>
    </div>
  );
}