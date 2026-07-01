import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlanoTabs({ planos, activeId, onSelect, canEdit, onAdd, onDeleteActive }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {planos.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            p.id === activeId ? "bg-primary text-primary-foreground shadow-sm" : "bg-white border hover:bg-slate-50"
          }`}
        >
          {p.nombre}
        </button>
      ))}
      {canEdit && (
        <>
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="w-4 h-4" /> Plano
          </Button>
          {activeId && (
            <Button variant="ghost" size="icon" onClick={onDeleteActive} title="Eliminar plano actual">
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}