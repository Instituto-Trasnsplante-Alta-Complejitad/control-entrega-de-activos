import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import EquipmentTable from "@/components/stock/EquipmentTable";
import EquipmentForm from "@/components/stock/EquipmentForm";
import OcsImportDialog from "@/components/stock/OcsImportDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Stock() {
  const [showForm, setShowForm] = useState(false);
  const [showOcsImport, setShowOcsImport] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");

  const queryClient = useQueryClient();

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ["equipment"],
    queryFn: () => base44.entities.Equipment.list("asset_number", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Equipment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Equipment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Equipment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      setDeleting(null);
    },
  });

  const handleSubmit = (formData) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filtered = equipment.filter((item) => {
    const matchSearch = !search || 
      item.asset_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.brand?.toLowerCase().includes(search.toLowerCase()) ||
      item.model?.toLowerCase().includes(search.toLowerCase()) ||
      item.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.department?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || item.type === typeFilter;
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    const matchDepartment = departmentFilter === "all" || item.department === departmentFilter;
    const matchUser = !userSearch ||
      item.assigned_to?.toLowerCase().includes(userSearch.toLowerCase()) ||
      item.username?.toLowerCase().includes(userSearch.toLowerCase());
    return matchSearch && matchType && matchStatus && matchDepartment && matchUser;
  });

  const departments = [...new Set(equipment.map((e) => e.department).filter(Boolean))].sort();

  const handleExportExcel = () => {
    const rows = equipment.map((e) => ({
      "Activo": e.asset_number,
      "Tipo": e.type,
      "Marca": e.brand,
      "Modelo": e.model,
      "N° Serie": e.serial_number,
      "Estado": e.status,
      "Asignado a": e.assigned_to || "",
      "Usuario de red": e.username || "",
      "Ubicación / Sector": e.department || "",
      "Fecha Entrega": e.delivery_date || "",
      "Observaciones": e.comments || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Equipos");
    XLSX.writeFile(wb, `stock_equipos_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock de Equipos</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} de {equipment.length} equipos</p>
        </div>
        <div className="flex gap-2 self-start">
          <Button variant="outline" onClick={handleExportExcel} className="gap-2">
            <Download className="w-4 h-4" /> Exportar Excel
          </Button>
          <Button variant="outline" onClick={() => setShowOcsImport(true)} className="gap-2">
            <Upload className="w-4 h-4" /> Importar OCS
          </Button>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Nuevo Equipo
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por activo, marca, modelo, serie..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="relative w-full sm:w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar usuario..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="notebook">Notebook</SelectItem>
              <SelectItem value="tablet">Tablet</SelectItem>
              <SelectItem value="celular">Celular</SelectItem>
              <SelectItem value="cpu">CPU</SelectItem>
              <SelectItem value="otro">Otro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="disponible">Disponible</SelectItem>
              <SelectItem value="asignado">Asignado</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
              <SelectItem value="en_reparacion">En reparación</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Ubicación" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ubicaciones</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <EquipmentTable
          equipment={filtered}
          onEdit={(item) => { setEditing(item); setShowForm(true); }}
          onDelete={(item) => setDeleting(item)}
        />
      )}

      <EquipmentForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSubmit={handleSubmit}
        equipment={editing}
      />

      <OcsImportDialog
        open={showOcsImport}
        onClose={() => setShowOcsImport(false)}
        onDone={() => queryClient.invalidateQueries({ queryKey: ["equipment"] })}
      />

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará {deleting?.brand} {deleting?.model} ({deleting?.asset_number}). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleting.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}