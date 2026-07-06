import React from "react";
import { MousePointer2, Plus, Pencil, Trash2, X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MODES = [
  { key: "view", label: "Ver", icon: MousePointer2 },
  { key: "add", label: "Añadir", icon: Plus },
  { key: "modify", label: "Modificar", icon: Pencil },
  { key: "delete", label: "Eliminar", icon: Trash2 },
];

const MODE_STYLES = {
  view: "bg-slate-200 text-slate-700",
  add: "bg-emerald-500 text-white",
  modify: "bg-blue-500 text-white",
  delete: "bg-red-500 text-white",
};

const MODE_HINTS = {
  add: "Tocá el plano donde querés ubicar un equipo",
  modify: "Tocá un punto para editarlo o arrastralo para moverlo",
  delete: "Tocá un punto para eliminarlo",
};

export default function MapToolbar({ mode, setMode, canEdit, fullscreen, onToggleFullscreen, hasPlano }) {
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {canEdit ? (
          <>
            {MODES.map((m) => (
              <Button
                key={m.key}
                variant={mode === m.key ? "default" : "outline"}
                size="lg"
                onClick={() => setMode(mode === m.key && mode !== "view" ? "view" : m.key)}
                className={`min-h-11 px-5 text-base ${mode === m.key ? MODE_STYLES[m.key] : ""}`}
              >
                <m.icon className="w-5 h-5" />
                {m.label}
              </Button>
            ))}
            {mode !== "view" && (
              <Button variant="ghost" size="lg" onClick={() => setMode("view")} className="min-h-11 px-4 text-base text-destructive">
                <X className="w-5 h-5" /> Cancelar
              </Button>
            )}
          </>
        ) : (
          <span className="text-sm text-muted-foreground px-2">Solo lectura</span>
        )}

        <div className="ml-auto">
          <Button
            variant="outline"
            size="lg"
            onClick={onToggleFullscreen}
            disabled={!hasPlano}
            className="min-h-11 px-5"
          >
            {fullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            <span className="hidden sm:inline">{fullscreen ? "Salir" : "Pantalla completa"}</span>
          </Button>
        </div>
      </div>

      {canEdit && mode !== "view" && (
        <div className={`text-sm font-medium px-4 py-2 rounded-lg ${MODE_STYLES[mode]}`}>
          {MODE_HINTS[mode]}
        </div>
      )}
    </>
  );
}