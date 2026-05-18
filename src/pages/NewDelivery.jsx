import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Send } from "lucide-react";
import { format } from "date-fns";

export default function NewDelivery() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");

  const [form, setForm] = useState({
    recipient_name: "",
    recipient_email: "",
    recipient_dni: "",
    recipient_address: "",
    recipient_city: "Ciudad Autónoma de Buenos Aires",
    department: "",
    delivery_date: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ["equipment"],
    queryFn: () => base44.entities.Equipment.list("-created_date", 500),
  });

  const availableEquipment = equipment.filter((e) => e.status === "disponible");
  const selectedEquipment = equipment.find((e) => e.id === selectedEquipmentId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEquipmentId) {
      toast({ title: "Error", description: "Seleccioná un equipo", variant: "destructive" });
      return;
    }

    const token = crypto.randomUUID();
    const deliveryData = {
      ...form,
      equipment_id: selectedEquipmentId,
      equipment_type: selectedEquipment.type,
      equipment_brand: selectedEquipment.brand,
      equipment_model: selectedEquipment.model,
      equipment_serial: selectedEquipment.serial_number,
      equipment_asset: selectedEquipment.asset_number,
      status: "pendiente",
      acceptance_token: token,
    };

    const delivery = await base44.entities.Delivery.create(deliveryData);
    await base44.entities.Equipment.update(selectedEquipmentId, { status: "asignado", department: form.department });

    queryClient.invalidateQueries({ queryKey: ["equipment"] });
    queryClient.invalidateQueries({ queryKey: ["deliveries"] });

    toast({ title: "Entrega registrada", description: "La entrega se registró correctamente" });

    setForm({
      recipient_name: "",
      recipient_email: "",
      recipient_dni: "",
      recipient_address: "",
      recipient_city: "Ciudad Autónoma de Buenos Aires",
      department: "",
      delivery_date: format(new Date(), "yyyy-MM-dd"),
    });
    setSelectedEquipmentId("");
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nueva Entrega</h1>
        <p className="text-sm text-muted-foreground mt-1">Registrá la entrega del equipo</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Equipo a entregar</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar equipo disponible..." />
              </SelectTrigger>
              <SelectContent>
                {availableEquipment.map((eq) => (
                  <SelectItem key={eq.id} value={eq.id}>
                    {eq.asset_number} — {eq.brand} {eq.model} ({eq.serial_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEquipment && (
              <div className="mt-3 p-3 bg-muted rounded-lg text-sm space-y-1">
                <p><span className="font-medium">Tipo:</span> {selectedEquipment.type}</p>
                <p><span className="font-medium">Marca:</span> {selectedEquipment.brand}</p>
                <p><span className="font-medium">Modelo:</span> {selectedEquipment.model}</p>
                <p><span className="font-medium">N° Serie:</span> {selectedEquipment.serial_number}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Datos del destinatario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre completo *</Label>
                <Input value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={form.recipient_email} onChange={(e) => setForm({ ...form, recipient_email: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>DNI</Label>
                <Input value={form.recipient_dni} onChange={(e) => setForm({ ...form, recipient_dni: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Gerencia / Sector</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Domicilio</Label>
              <Input value={form.recipient_address} onChange={(e) => setForm({ ...form, recipient_address: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input value={form.recipient_city} onChange={(e) => setForm({ ...form, recipient_city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fecha de entrega *</Label>
                <Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} required />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full gap-2" size="lg">
          <Send className="w-4 h-4" />
          Registrar Entrega
        </Button>
      </form>
    </div>
  );
}