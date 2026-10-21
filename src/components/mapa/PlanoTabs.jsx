import React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function isExternalImage(url) {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  try {
    return new URL(url).origin !== window.location.origin;
  } catch {
    return true;
  }
}

export default function PlanoTabs({ planos, activeId, onSelect, canEdit, onAdd, onEditActive, onDeleteActive }) {
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
          <span>{p.nombre}</span>
          {p.id === activeId && (
            <span className={`ml-2 text-[10px] ${isExternalImage(p.imagen_url) ? "opacity-70" : "opacity-90"}`}>
              {isExternalImage(p.imagen_url) ? "Externo" : "Local"}
            </span>
          )}
        </button>
      ))}
      {canEdit && (
        <>
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="w-4 h-4" /> Plano
          </Button>
          {activeId && (
            <>
              <Button variant="ghost" size="icon" onClick={onEditActive} title="Editar o reemplazar imagen">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDeleteActive} title="Eliminar plano actual">
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
