import React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function SedeSelector({ sedes, activeId, onSelect, canEdit, onAdd, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-2">
      <Select value={activeId || ""} onValueChange={onSelect}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Seleccionar sede" />
        </SelectTrigger>
        <SelectContent>
          {sedes.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {canEdit && (
        <>
          <Button variant="outline" size="icon" onClick={onAdd} title="Nueva sede">
            <Plus className="w-4 h-4" />
          </Button>
          {activeId && (
            <Button variant="outline" size="icon" onClick={onEdit} title="Editar sede">
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {activeId && (
            <Button variant="outline" size="icon" onClick={onDelete} title="Eliminar sede">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}